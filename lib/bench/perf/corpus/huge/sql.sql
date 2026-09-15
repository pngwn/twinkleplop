-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;


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


-- ---- basic.sql ----
SELECT id, name, email FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10;

-- adversarial: mixed-case keywords and boolean literals
SeLeCt Id FrOm T wHeRe DeLeTeD_aT iS NuLl AnD AcTiVe = TrUe;

-- adversarial: no whitespace between keywords, punctuation, and operators
SELECT*FROM t WHERE a=1AND b=2OR c<>3;

-- adversarial: deeply nested subqueries with shared keyword AS
SELECT(SELECT(SELECT(SELECT 1 AS x)AS y)AS z)AS w;

-- adversarial: empty string, empty parens, and comma at eol
SELECT '',() ,;

-- adversarial: backslash that looks like line continuation but isn't sql
SELECT 1 \
FROM t;


-- ---- comments.sql ----
-- single line comment
SELECT 1; -- trailing comment
# mysql-style hash comment
SELECT 2; # trailing hash
/* block comment */
SELECT 3; /* trailing block */
/* multi
   line
   block */
SELECT 4;
/* nested /* inner */ outer continues */
SELECT 5;
/*+ optimizer hint */
SELECT 6;
/*! mysql executable comment */
SELECT 7;

-- adversarial: deeply nested block comments
/* a /* b /* c */ b continues */ a continues */ SELECT 8;

-- adversarial: unterminated block comment right up to eof markers
/* opens but never closes until the end of the file somewhere far away
SELECT 9;

-- adversarial: close-only block comment token with no matching open
*/ SELECT 10;

-- adversarial: comment starters that appear inside quoted content
SELECT 'has /* and -- and # inside' AS quoted, "ident with -- inside" FROM t;

-- adversarial: hash comment immediately after an operator (mysql vs pg)
SELECT a + #b
c FROM t;

-- adversarial: block-comment open that spans a line boundary
SELECT 11 /*
multi-line comment with /* deep nesting */ closes the inner
and then outer */ AS x;


-- ---- complex.sql ----
-- complex query combining many sql features
WITH RECURSIVE numbered_logs AS (
  SELECT
    l.id,
    l.message,
    l.level::text AS severity,
    ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.created_at DESC) AS rn,
    /* extract user metadata from jsonb */
    l.meta ->> 'ip' AS ip,
    l.meta #> '{ua,browser}' AS browser
  FROM logs l
  WHERE l.created_at >= NOW() - INTERVAL '1 day'
    AND l.level IN ('error', 'warning')
    AND l.message ~ E'^timeout|\\bconn\\b'
)
SELECT
  nl.id,
  CASE
    WHEN nl.severity = 'error' THEN TRUE
    ELSE FALSE
  END AS is_error,
  COALESCE(nl.ip, '-') AS ip,
  nl.browser
FROM numbered_logs nl
WHERE nl.rn <= 10
ORDER BY nl.id DESC;

-- adversarial: deeply nested CASE with quoted identifiers and unicode content
SELECT
  CASE
    WHEN "Status" = N'open' THEN
      CASE WHEN amount >= 1000 THEN N'🔥 big' ELSE N'🙂 small' END
    WHEN "Status" IN (N'café', N'naïve', N'résumé') THEN N'accented'
    ELSE NULL
  END AS label
FROM "Tickets";

-- adversarial: window function with a full frame specification
SELECT
  x,
  SUM(x) OVER (
    PARTITION BY grp
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    EXCLUDE CURRENT ROW
  ) AS running_sum
FROM series;

-- adversarial: every string form and every parameter sigil in one statement
SELECT 'a'||E'b\n'||N'c'||U&'d'||B'01'||X'ff'||$$e$$||_utf8'f'
INTO @result
FROM dual
WHERE id = $1 AND name = :n AND session = @@spid AND flag = ? AND user = @u;

-- adversarial: combined cte + lateral + window + json operators
WITH latest AS (
  SELECT u.id, u.data->'profile'->>'name' AS name,
         u.data #>> '{prefs,theme}' AS theme
  FROM users u
)
SELECT l.*, t.*
FROM latest l
LEFT JOIN LATERAL (
  SELECT tag, COUNT(*) OVER (PARTITION BY tag) AS c
  FROM jsonb_array_elements_text(l.data->'tags') tag
) t ON TRUE
WHERE l.theme = 'dark' AND t.c > 1;


-- ---- ddl.sql ----
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;


-- ---- identifiers.sql ----
SELECT foo, bar_baz, _leading_underscore, trailing_$;
SELECT "quoted identifier", "with ""escaped"" quote";
SELECT `mysql ident`, `with ``escape`;
SELECT [tsql ident], [with ]]escape];
SELECT U&"unicode \0041 ident";
SELECT schema.table.column;
SELECT db..obj;
SELECT t.*;

-- adversarial: keywords as quoted identifiers across every quoting style
SELECT "select", "from", `where`, `order`, [group], [by] FROM t;

-- adversarial: empty quoted identifiers
SELECT "", ``, [] FROM t;

-- adversarial: quoted ident containing the closing delimiter via doubling
SELECT "a""b""c" AS dq, `a``b``c` AS bt, [a]]b]]c] AS sq FROM t;

-- adversarial: dotted paths with quoted and unquoted parts
SELECT "a"."b"."c", `a`.`b`.`c`, [a].[b].[c], a."b".`c`.[d] FROM t;

-- adversarial: identifiers that collide with prefix-string forms when followed by `'`
SELECT E FROM t WHERE N = 1 AND B > 0 AND X < 10;

-- adversarial: identifier immediately followed by a number
SELECT foo123, _99, abc0xFF FROM t;

-- adversarial: unicode quoted identifier with UESCAPE clause (ignored at lex)
SELECT U&"d\0061t\0061" UESCAPE '!' FROM t;


-- ---- mysql.sql ----
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE '%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;

SET @cutoff := 10;
SET @total = @total + 1;

CREATE TABLE `log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ts` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `msg` VARCHAR(255) NOT NULL,
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- adversarial: charset introducers with weird casing and digits
SELECT _utf8mb4'hello', _latin1'there', _UCS2'x', _utf8_'bad';

-- adversarial: hash comment that immediately follows identifier with no space
SELECT col#comment
FROM t;

-- adversarial: the mysql `--` quirk: `--foo` is not a comment without ws
SELECT 5--1, 5-- 1, 5-----2;

-- adversarial: logical OR `||` vs concat `||` and `&&` alongside words
SELECT a || b AND c && d OR NOT e XOR f;

-- adversarial: backtick containing backtick via doubling and spaces / dots
SELECT `weird``ident with spaces and . dots`, `db`.`table`.`col` FROM t;

-- adversarial: `:=` inside a subquery, user var reused as expression
SELECT @rank := @rank + 1 AS r, t.* FROM t, (SELECT @rank := 0) r;

-- adversarial: hex/bit with mixed casing and `0x` hex without quotes
SELECT 0x0A, 0XaB, x'0A', X'Ab', b'10', B'01';


-- ---- numbers.sql ----
SELECT 0;
SELECT 42;
SELECT 3.14;
SELECT 1e5;
SELECT 1.5e-3;
SELECT 2.5E+10;
SELECT 1_000_000;
SELECT 0xFF;
SELECT 0X1A2B;
SELECT 0xAB_CD;
SELECT 0b1010;
SELECT 0B_1111_0000;
SELECT 0o777;
SELECT 0O123;

-- adversarial: leading-dot decimal (documented limitation) and trailing dot
SELECT .5, 5., .0, 0.;

-- adversarial: number followed immediately by a keyword with no space
SELECT 1AS one, 0xFFAS many FROM t;

-- adversarial: partial exponent and malformed scientific forms
SELECT 1e, 2e+, 3.14e, 1.e-, 1_2__3;

-- adversarial: hex digits that look like identifiers after the prefix
SELECT 0xDEADBEEF, 0xGHI, 0xABz;

-- adversarial: number adjacent to a dotted accessor
SELECT 1.field, t.1, 1.2.3;

-- adversarial: underscore separator in tricky positions
SELECT 1_000_, _1_000, 1__000, 1_.5, 0x_FF;

-- adversarial: numeric forms beside unary operators
SELECT -1, +1, --1, -+1, - -1, + +1;


-- ---- operators.sql ----
SELECT a = b, a != b, a <> b;
SELECT a < b, a > b, a <= b, a >= b;
SELECT a <=> b;
SELECT a + b, a - b, a * b, a / b, a % b;
SELECT a ^ b, a & b, a | b, a ~ b;
SELECT a << 2, a >> 2;
SELECT a || b, a && b;
SELECT a::text, a -> 'x', a ->> 'y';
SELECT a #> '{p}', a #>> '{p}';
SELECT a @> b, a <@ b;
SELECT a ~ '.*', a ~* '.*', a !~ '.*', a !~* '.*';
SELECT a ?| ARRAY['x'], a ?& ARRAY['y'];
SET @x := 1;
SET @x += 1;
SELECT a ** 2;
SELECT a == b;
SELECT !<x, !>y;

-- adversarial: long chain of operators with no whitespace
SELECT a!=b<>c<=>d::text->>'k'#>>'{x}'||e&&f?|g?&h;

-- adversarial: `5---1` double-negation that is actually `5 - - 1`
SELECT 5---1, 5-- comment eats the rest;
SELECT 5- -1;

-- adversarial: `/*` vs `/` vs `/=` all back-to-back
SELECT a/*comment*/b, a/=b, a/b;

-- adversarial: `::` at start of line and bookending identifiers
SELECT ::text, a::, ::b;

-- adversarial: compound assignment packed into one expression list
SET @a+=1, @b-=2, @c*=3, @d/=4, @e%=5, @f&=6, @g|=7, @h^=8;

-- adversarial: arrow operators sharing prefixes
SELECT a->b, a->>b, a#>b, a#>>b, a @> b, a<@b;

-- adversarial: the tricky `?`-family against `?|` and `?&`
SELECT ?, ?1, ? |b, a ?| b, a?&b;


-- ---- parameters.sql ----
SELECT $1, $2, $10;
SELECT :name, :age;
SELECT ?, ?1, ?2;
SELECT @user, @row_count;
SELECT @@version, @@servername;
INSERT INTO t VALUES ($1, $2, $3);
SET @total = 100;

-- adversarial: lone sigils with nothing meaningful after them
SELECT @, @@, :, ?, $, $$;

-- adversarial: parameter-like sequences adjacent to operators
SELECT @a+@b, @@c*@@d, :e/:f, ?+?, $1+$2;

-- adversarial: @ followed by a quoted form (not a variable body)
SELECT @'raw', @"ident", @`bt`, @[br] FROM t;

-- adversarial: multi-part variable names (mysql @@global.var is common)
SELECT @@global.max_connections, @@session.tx_isolation;

-- adversarial: positional params beside dollar strings and money-like forms
SELECT $1, $$body$$, $100, $1000000 FROM t;

-- adversarial: named param with digits and underscores
SELECT :p_1, :p__2, :_3, :0name FROM t;


-- ---- postgresql.sql ----
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $$
BEGIN
  RETURN 'Hello, ' || who || '!';
END;
$$ LANGUAGE plpgsql;

SELECT id::integer, data::jsonb FROM t
WHERE data @> '{"k": 1}'::jsonb
  AND name ILIKE '%foo%'
  AND created_at AT TIME ZONE 'UTC' > NOW();

WITH RECURSIVE r AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM r WHERE n < 10
)
SELECT * FROM r;

INSERT INTO logs (msg) VALUES ('error')
ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg
RETURNING id, msg;

-- adversarial: tagged dollar-quoted string (known limitation: body leaks)
CREATE FUNCTION broken() RETURNS void AS $body$
DECLARE x int := 1;
BEGIN
  RAISE NOTICE 'value = %', x;
END;
$body$ LANGUAGE plpgsql;

-- adversarial: nested dollar tags with different names (very known-limitation)
CREATE FUNCTION two_tags() RETURNS void AS $outer$
  EXECUTE $inner$ SELECT 1 $inner$;
$outer$ LANGUAGE plpgsql;

-- adversarial: dollar-quote open immediately follows an identifier
SELECT greet$$hi$$ FROM t;

-- adversarial: array subscripts with slice syntax and casts
SELECT arr[1:3]::int[], arr[1][2], nested[1:2][3:4] FROM t;

-- adversarial: json operator pileup with mixed paths and keys
SELECT data->'a'->>0, data#>'{a,0,b}', data#>>'{x}' @> '{"y":1}'::jsonb FROM t;

-- adversarial: regex operators against quoted body containing regex metachars
SELECT x ~* '^[a-z]+$', x !~ E'\\d{3}-\\d{4}', x ~ '\y\w+\y' FROM t;

-- adversarial: `$n` at statement start (reserved lexical edge)
$1 := 5;


-- ---- strings.sql ----
SELECT 'hello world';
SELECT 'can''t stop';
SELECT E'line\nbreak';
SELECT e'\x41\x42';
SELECT N'café';
SELECT n'unicode';
SELECT U&'unicode \0041';
SELECT B'01010101';
SELECT X'DEADBEEF';
SELECT b'1100';
SELECT x'48656c6c6f';
SELECT 'multi
line string';
SELECT 'backslash \\ quote \'';
SELECT $$dollar quoted$$;
SELECT $$with 'quotes' inside$$;

-- adversarial: adjacent quoted literals on two lines (pg auto-concatenation)
SELECT 'first part'
       'second part';

-- adversarial: every escape form back-to-back in one literal
SELECT '\0\b\n\r\t\Z\\\'\"\%\_';

-- adversarial: trailing backslash before closing quote (looks like escape)
SELECT 'ends with backslash\\';
SELECT 'bogus \';

-- adversarial: dollar-quoted body containing nested $$ sequences
SELECT $$outer with $$ inside$$;

-- adversarial: E-string with a partial unicode escape and mixed octals
SELECT E'\u00E9 \xC3\251 \141\t end';

-- adversarial: strings that contain comment starters as content
SELECT '/* not a comment */ -- also not a comment # still not';

-- adversarial: prefix letters used as identifiers, not string openers
SELECT E AS letter_e, N AS letter_n, B AS letter_b, X AS letter_x;

-- adversarial: unterminated string at end of file (no closing quote)
SELECT 'never closed


-- ---- tsql.sql ----
DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;
