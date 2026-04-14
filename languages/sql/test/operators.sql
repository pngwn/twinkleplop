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
