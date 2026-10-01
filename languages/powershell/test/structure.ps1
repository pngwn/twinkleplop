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
