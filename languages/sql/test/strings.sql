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
