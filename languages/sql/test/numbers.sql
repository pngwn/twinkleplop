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
