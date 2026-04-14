DECLARE @total INT = 100;
SET @total += 50;
SET @total *= 2;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';

BEGIN TRY
  EXEC sp_rename N'OldTable', N'NewTable';
END TRY
BEGIN CATCH
  RAISERROR(N'Rename failed', 16, 1);
END CATCH
GO

CREATE PROCEDURE [dbo].[GetUser]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM [dbo].[Users] WHERE Id = @id;
END
GO

-- adversarial: money constants with signs, decimals, and thousands commas
SELECT $100, $-23.45, +$423456.99, $1,234,567.89, $.5, $0;

-- adversarial: temp tables and global temp tables (leading `#` / `##`)
SELECT * FROM #local_temp, ##global_temp WHERE #local_temp.id = ##global_temp.id;

-- adversarial: brackets with characters that look like punctuation inside
SELECT [weird name, with commas], [with ; semicolons], [with ] ]] escape] FROM t;

-- adversarial: GO followed by a count
GO 10

-- adversarial: compound assignment chained in a DECLARE
DECLARE @x INT = 0, @y INT = 0;
SET @x += @y *= 2, @y -= @x /= 3;

-- adversarial: N-string with multiple escapes and unicode content
SELECT N'a''b''c', N'smile 😀 é ñ', N'' AS empty_n;
