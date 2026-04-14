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
