# ---- comments.ps1 ----
#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
A report with comments containing "quotes", $variables and parentheses ).
<# This opener does not nest.
#>
$after = 1 # line comment
Write-Output hello#world hello`#world # a real comment
"$(<# a ) does not close the subexpression #> (Get-Date))"
# SIG # Begin signature block
# ABCD
# SIG # End signature block


# ---- numbers.ps1 ----
$decimal = 0, 42, -10, +7, .5, 1., 1.25, 1e3, 1.e+2, 1.2E-3, .5e–2
$hex = 0xFF, 0XdeadBEEF, 0x1e2D, 0xffL, 0x10Gb, 0x12Lpb
$binary = 0b1010, 0B11111111uy, 0b011111111n
$suffixes = 100y, 100uy, 100s, 100us, 100l, 100u, 100ul, 100n, 100d
$multipliers = 1kb, 2MB, 3Gb, 4tB, 5PB, 1.30Dmb, 482ngb, 1.2345e1L
$range = 1..10
$values = (2).GetType(), 2uL.GetType(), 1.234.GetType()
$invalid = 0o77, 1_000, 0b102, 1e, 1gbus, 77z


# ---- operators.ps1 ----
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


# ---- strings.ps1 ----
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


# ---- structure.ps1 ----
using namespace System.Collections.Generic
FuNcTiOn Get-Report {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Name, [switch]$Force)
    begin { $script:count = 0 }
    process {
        $settings = @{ Name = $Name; Enabled = $TRUE; Count = 1KB }
        $list = [System.Collections.Generic.List[string]]::new()
        $items[0]; $items[$index]; $items[1..3]
        ${settings}?.Name
        ${items}?[0]
        $type::Member
        $object.if; $object.return
        if ($Name -cnotmatch '^temp' -and -not $Force) { return $null }
        try { & $command @settings -ErrorAction Stop } catch { throw }
        $script:count++
    }
    clean { Write-Verbose 'done' }
}
Get-Process | Where-Object { $_.WorkingSet -GT 1.5GB -and $null -ne $_ } 2>&1 # report
$unicode = $café, $総計, ${name with spaces}, $env:PATH, $script:count, $$, $?, $^
if-config -notable -Name:$false -FilePath ./report.txt
class Report { hidden [string]$Name; static [int]$Count = 0 }
:retry while ($true) { break retry }
