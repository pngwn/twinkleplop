$literal = 'don''t expand $x or `n or C:\temp'
$double = "quotes ""inside"", `$literal, ${env:PATH}, $true, $false, $null"
$multiline = 'first
second'
$smart = “double ”“quotes” and $name”
$smartSingle = ‘don’‘t expand $name’
$message = "State: $(if ($service.Running) { "${env:COMPUTERNAME}: up" })"
$nested = "Items: $(@(1, 2) | ForEach-Object { "value=$($_ + (2 * 3))" })"
$variable = "${name with spaces} ${escaped`}brace} $$ $? $^ $x.Name $($x.Name)"
$escapes = "`0`a`b`e`f`n`r`t`v`u{1F642}`"``\n"
$plainDollar = "Price: $ and $! and $$tail"
$body = @"
{"host":"${env:COMPUTERNAME}","cost":"`$5","count":$(($items).Count)}
midline "@ is still text
  "@ is still text
"@
$raw = @'
$x and $(Get-Date) are literal; so are "quotes" and `n
'@
$empty = @"
"@
$after = 'done'
