#Requires -Version 7.0
using namespace System.Collections.Generic

function Get-ServiceReport {
    [CmdletBinding()]
    param([string]$Name = 'pwsh', [switch]$Detailed)

    $options = @{ Name = $Name; ErrorAction = 'SilentlyContinue' }
    $processes = @(Get-Process @options)
    $threshold = 1.5GB

    foreach ($process in $processes) {
        $status = $process.WorkingSet -gt $threshold ? 'large' : 'normal'
        [PSCustomObject]@{
            Name = $process.Name
            Memory = '{0:N2} MB' -f ($process.WorkingSet / 1MB)
            Summary = "${Name}: $($process.Id) ($status)"
        }
    }

    if ($Detailed) {
        @"
Host: $env:COMPUTERNAME
Found: $($processes.Count) process(es)
"@
    }
}

Get-ServiceReport -Detailed | Format-Table -AutoSize
