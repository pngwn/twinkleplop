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
