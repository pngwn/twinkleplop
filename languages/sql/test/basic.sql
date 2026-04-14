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
