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
