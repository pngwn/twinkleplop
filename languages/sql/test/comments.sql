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
