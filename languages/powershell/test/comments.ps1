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
