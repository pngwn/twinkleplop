-- Warehouse schema and reporting views for the billing domain.
-- Targets Postgres 16. Migrations are applied in file order.

BEGIN;

CREATE SCHEMA IF NOT EXISTS billing;
SET search_path TO billing, public;

CREATE TYPE billing.plan_tier AS ENUM ('free', 'starter', 'growth', 'enterprise');
CREATE TYPE billing.invoice_state AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');

CREATE TABLE billing.accounts (
    id              BIGSERIAL PRIMARY KEY,
    external_id     TEXT        NOT NULL UNIQUE,
    display_name    TEXT        NOT NULL,
    tier            billing.plan_tier NOT NULL DEFAULT 'free',
    country_code    CHAR(2)     NOT NULL,
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT accounts_country_upper CHECK (country_code = upper(country_code)),
    CONSTRAINT accounts_trial_after_creation CHECK (trial_ends_at IS NULL OR trial_ends_at > created_at)
);

CREATE INDEX accounts_tier_idx ON billing.accounts (tier) WHERE deleted_at IS NULL;
CREATE INDEX accounts_metadata_gin ON billing.accounts USING gin (metadata jsonb_path_ops);

CREATE TABLE billing.subscriptions (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT      NOT NULL REFERENCES billing.accounts (id) ON DELETE CASCADE,
    plan_code       TEXT        NOT NULL,
    quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount     NUMERIC(12, 2) NOT NULL,
    currency        CHAR(3)     NOT NULL DEFAULT 'USD',
    period          TSTZRANGE   NOT NULL,
    cancelled_at    TIMESTAMPTZ,
    EXCLUDE USING gist (account_id WITH =, period WITH &&) WHERE (cancelled_at IS NULL)
);

CREATE TABLE billing.invoices (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT      NOT NULL REFERENCES billing.accounts (id),
    number          TEXT        NOT NULL UNIQUE,
    state           billing.invoice_state NOT NULL DEFAULT 'draft',
    subtotal_cents  BIGINT      NOT NULL DEFAULT 0,
    tax_cents       BIGINT      NOT NULL DEFAULT 0,
    total_cents     BIGINT      GENERATED ALWAYS AS (subtotal_cents + tax_cents) STORED,
    issued_on       DATE,
    due_on          DATE,
    paid_at         TIMESTAMPTZ
) PARTITION BY RANGE (issued_on);

CREATE TABLE billing.invoices_2024 PARTITION OF billing.invoices
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE billing.invoices_2025 PARTITION OF billing.invoices
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE OR REPLACE FUNCTION billing.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_touch
    BEFORE UPDATE ON billing.accounts
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION billing.touch_updated_at();

COMMIT;

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW billing.mrr_by_month AS
WITH RECURSIVE months AS (
    SELECT date_trunc('month', min(lower(period)))::date AS month
      FROM billing.subscriptions
     UNION ALL
    SELECT (month + INTERVAL '1 month')::date
      FROM months
     WHERE month < date_trunc('month', now())::date
),
normalised AS (
    SELECT s.account_id,
           s.currency,
           m.month,
           s.quantity * s.unit_amount AS amount,
           CASE
               WHEN s.plan_code LIKE '%-annual' THEN s.quantity * s.unit_amount / 12.0
               WHEN s.plan_code LIKE '%-quarterly' THEN s.quantity * s.unit_amount / 3.0
               ELSE s.quantity * s.unit_amount
           END AS monthly_amount
      FROM billing.subscriptions AS s
      JOIN months AS m
        ON m.month <@ s.period
     WHERE s.cancelled_at IS NULL
        OR s.cancelled_at > m.month
)
SELECT n.month,
       n.currency,
       count(DISTINCT n.account_id)                          AS active_accounts,
       sum(n.monthly_amount)                                 AS mrr,
       sum(n.monthly_amount) FILTER (WHERE a.tier = 'enterprise') AS enterprise_mrr,
       round(avg(n.monthly_amount), 2)                       AS arpa,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY n.monthly_amount) AS median_amount
  FROM normalised AS n
  JOIN billing.accounts AS a ON a.id = n.account_id
 WHERE a.deleted_at IS NULL
 GROUP BY GROUPING SETS ((n.month, n.currency), (n.month))
 ORDER BY n.month DESC, n.currency NULLS LAST
WITH NO DATA;

CREATE UNIQUE INDEX mrr_by_month_key ON billing.mrr_by_month (month, coalesce(currency, '***'));

CREATE VIEW billing.churn_risk AS
SELECT a.id,
       a.external_id,
       a.display_name,
       a.tier,
       s.plan_code,
       coalesce(i.late_invoices, 0) AS late_invoices,
       u.last_seen_at,
       now() - u.last_seen_at       AS idle_for,
       CASE
           WHEN u.last_seen_at IS NULL                     THEN 'never-active'
           WHEN now() - u.last_seen_at > INTERVAL '90 days' THEN 'dormant'
           WHEN coalesce(i.late_invoices, 0) >= 2           THEN 'payment-risk'
           WHEN a.trial_ends_at BETWEEN now() AND now() + INTERVAL '7 days' THEN 'trial-ending'
           ELSE 'healthy'
       END AS risk_band,
       row_number() OVER (PARTITION BY a.tier ORDER BY u.last_seen_at NULLS FIRST) AS rank_in_tier
  FROM billing.accounts AS a
  LEFT JOIN LATERAL (
        SELECT plan_code
          FROM billing.subscriptions
         WHERE account_id = a.id AND cancelled_at IS NULL
         ORDER BY lower(period) DESC
         LIMIT 1
       ) AS s ON TRUE
  LEFT JOIN (
        SELECT account_id, count(*) AS late_invoices
          FROM billing.invoices
         WHERE state = 'open' AND due_on < current_date
         GROUP BY account_id
       ) AS i ON i.account_id = a.id
  LEFT JOIN analytics.user_activity AS u ON u.account_id = a.id
 WHERE a.deleted_at IS NULL;

-- Backfill: assign invoice numbers to anything created before the sequence.
UPDATE billing.invoices AS inv
   SET number = concat('INV-', to_char(inv.issued_on, 'YYYYMM'), '-', lpad(inv.id::text, 6, '0'))
  FROM billing.accounts AS acc
 WHERE inv.account_id = acc.id
   AND inv.number IS NULL
   AND inv.issued_on IS NOT NULL;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT a.tier,
       count(*)               AS accounts,
       sum(i.total_cents)     AS billed_cents,
       avg(i.total_cents)::numeric(14, 2) AS avg_cents
  FROM billing.accounts a
  JOIN billing.invoices i USING (account_id)
 WHERE i.issued_on >= date_trunc('year', current_date)
   AND i.state IN ('paid', 'open')
 GROUP BY ROLLUP (a.tier)
HAVING sum(i.total_cents) > 0
 ORDER BY billed_cents DESC
 LIMIT 50 OFFSET 0;
