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
