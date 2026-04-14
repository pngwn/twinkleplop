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
