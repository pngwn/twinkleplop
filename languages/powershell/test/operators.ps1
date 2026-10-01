$a += 1; $a -= 1; $a *= 2; $a /= 2; $a %= 2; $a++; --$a
$a ??= $fallback; $a ?? $b; $a ? $b : $c
Get-Item . && Write-Output ok || Write-Error failed
$a -eq $b; $a -IEQ $b; $a -cne $b; $a -ge $b; $a -lt $b
$a -in $b; $a -notin $b; $a -contains $b; $a -notcontains $b
$a -like '*a*'; $a -notmatch 'x'; $a -replace 'a', 'b'
$a -is [string]; $a -isnot [int]; $a -as [int]
$a -band 1; $a -bor 2; $a -bxor 3; -bnot $a; -not $a; !$a
$a -shl 1; $a -shr 1; $a -and $b; $a -or $b; $a -xor $b
$a -split ','; $a -csplit ','; -join $a; '{0}' -f $a
$a –eq $b; $a —ne $b; $a ―gt $b
Write-Output x 1> out 2>> err 3>&1 4>&1 5>&1 6>&1 *> all *>> append
cmd --% $literal "quotes" # literal `
$after = 1
cmd --% raw | Write-Output $after
Write-Output -- -Name
Write-Output `
    'continued'
