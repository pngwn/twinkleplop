#Requires -Version 7.2
<#
.SYNOPSIS
  Provisions an acme edge node: users, directories, service config and health checks.

.DESCRIPTION
  Reads a node manifest (JSON), renders the service configuration from a template,
  installs the service unit and waits for the health endpoint to report ready.
  Safe to re-run; every step checks current state before changing anything.

.PARAMETER ManifestPath
  Path to the node manifest produced by the inventory export.

.PARAMETER Environment
  Target environment. Controls log level and which secrets store is used.

.EXAMPLE
  ./provision.ps1 -ManifestPath ./nodes/edge-03.json -Environment staging -Verbose
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param(
  [Parameter(Mandatory, Position = 0, ValueFromPipelineByPropertyName)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string] $ManifestPath,

  [ValidateSet('dev', 'staging', 'production')]
  [string] $Environment = 'dev',

  [ValidateRange(1, 600)]
  [int] $HealthTimeoutSeconds = 90,

  [string] $InstallRoot = (Join-Path ($env:ACME_ROOT ?? '/opt/acme') 'edge'),

  [switch] $SkipHealthCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

enum NodeRole {
  Router
  Cache
  Worker
}

enum StepStatus {
  Pending = 0
  Skipped = 1
  Changed = 2
  Failed = 3
}

class ProvisionStep {
  [string] $Name
  [StepStatus] $Status = [StepStatus]::Pending
  [timespan] $Elapsed
  [string] $Message

  ProvisionStep([string] $name) {
    $this.Name = $name
  }

  [string] ToString() {
    $ms = [math]::Round($this.Elapsed.TotalMilliseconds)
    return '{0,-24} {1,-8} {2,6}ms {3}' -f $this.Name, $this.Status, $ms, $this.Message
  }
}

class NodeManifest {
  [string] $Hostname
  [NodeRole] $Role
  [int] $Port = 8443
  [string[]] $Upstreams = @()
  [hashtable] $Labels = @{}

  static [NodeManifest] Load([string] $path) {
    $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
    $m = [NodeManifest]::new()
    $m.Hostname = $raw.hostname
    $m.Role = [NodeRole] $raw.role
    $m.Port = $raw.port ?? 8443
    $m.Upstreams = @($raw.upstreams | Where-Object { $_ })
    $m.Labels = $raw.labels ?? @{}
    if (-not $m.Hostname) {
      throw [System.ArgumentException]::new("manifest $path has no hostname")
    }
    return $m
  }
}

$script:Steps = [System.Collections.Generic.List[ProvisionStep]]::new()

function Invoke-Step {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [scriptblock] $Action
  )

  $step = [ProvisionStep]::new($Name)
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $result = & $Action
    $step.Status = $result ? [StepStatus]::Changed : [StepStatus]::Skipped
    $step.Message = $result -is [string] ? $result : ''
  }
  catch {
    $step.Status = [StepStatus]::Failed
    $step.Message = $_.Exception.Message
    Write-Error -ErrorRecord $_ -ErrorAction Continue
    throw
  }
  finally {
    $timer.Stop()
    $step.Elapsed = $timer.Elapsed
    $script:Steps.Add($step)
    Write-Verbose "step $Name finished as $($step.Status) in $($timer.ElapsedMilliseconds)ms"
  }
}

function New-ServiceDirectory {
  [CmdletBinding(SupportsShouldProcess)]
  [OutputType([bool])]
  param(
    [Parameter(Mandatory, ValueFromPipeline)]
    [string] $Path,
    [string] $Owner = 'acme-edge'
  )

  process {
    if (Test-Path -LiteralPath $Path) {
      Write-Verbose "exists: $Path"
      return $false
    }
    if ($PSCmdlet.ShouldProcess($Path, 'Create directory')) {
      $null = New-Item -ItemType Directory -Path $Path -Force
      & chown "${Owner}:${Owner}" $Path
      if ($LASTEXITCODE -ne 0) {
        throw "chown failed for $Path (exit $LASTEXITCODE)"
      }
      return $true
    }
    return $false
  }
}

function ConvertTo-ServiceConfig {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)] [NodeManifest] $Manifest,
    [Parameter(Mandatory)] [string] $Environment
  )

  $logLevel = switch ($Environment) {
    'production' { 'warn' }
    'staging' { 'info' }
    default { 'debug' }
  }

  $upstreamBlock = ($Manifest.Upstreams | ForEach-Object -Begin { $i = 0 } -Process {
      $i++
      "  [[upstream]]`n  name = `"up-$i`"`n  addr = `"$_`""
    }) -join "`n"

  $labels = $Manifest.Labels.GetEnumerator() |
    Sort-Object -Property Key |
    ForEach-Object { '{0} = "{1}"' -f $_.Key, $_.Value }

  return @"
# Rendered by provision.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC
# Do not edit by hand; changes are overwritten on the next run.

[server]
hostname = "$($Manifest.Hostname)"
role = "$($Manifest.Role.ToString().ToLowerInvariant())"
listen = "0.0.0.0:$($Manifest.Port)"
log_level = "$logLevel"
workers = $([Environment]::ProcessorCount * 2)

[labels]
$($labels -join "`n")

$upstreamBlock
"@
}

function Wait-ServiceHealthy {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)] [uri] $Uri,
    [int] $TimeoutSeconds = 60,
    [int] $IntervalSeconds = 2
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $attempt = 0
  while ((Get-Date) -lt $deadline) {
    $attempt++
    try {
      $resp = Invoke-RestMethod -Uri $Uri -TimeoutSec 5 -SkipCertificateCheck
      if ($resp.status -eq 'ready') {
        return "healthy after $attempt attempt(s)"
      }
      Write-Verbose "attempt ${attempt}: status=$($resp.status ?? 'unknown')"
    }
    catch [System.Net.Http.HttpRequestException] {
      Write-Verbose "attempt ${attempt}: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds $IntervalSeconds
  }
  throw [System.TimeoutException]::new("$Uri not healthy within ${TimeoutSeconds}s")
}

# --- main -------------------------------------------------------------------

$manifest = [NodeManifest]::Load($ManifestPath)
$configDir = Join-Path $InstallRoot 'config'
$unitPath = '/etc/systemd/system/acme-edge.service'

Write-Host "Provisioning $($manifest.Hostname) as $($manifest.Role) [$Environment]" -ForegroundColor Cyan

Invoke-Step -Name 'directories' -Action {
  $created = @($InstallRoot, $configDir, (Join-Path $InstallRoot 'logs'), (Join-Path $InstallRoot 'cache')) |
    New-ServiceDirectory -WhatIf:$WhatIfPreference |
    Where-Object { $_ }
  $created.Count -gt 0 ? "created $($created.Count)" : $null
}

Invoke-Step -Name 'config' -Action {
  $target = Join-Path $configDir 'edge.toml'
  $rendered = ConvertTo-ServiceConfig -Manifest $manifest -Environment $Environment
  $current = (Test-Path $target) ? (Get-Content -LiteralPath $target -Raw) : ''
  $strip = { param($s) $s -replace '(?m)^# Rendered by.*$', '' }
  if ((& $strip $current) -eq (& $strip $rendered)) { return $null }
  Set-Content -LiteralPath $target -Value $rendered -Encoding utf8NoBOM -NoNewline
  "wrote $((Get-Item $target).Length) bytes"
}

Invoke-Step -Name 'systemd-unit' -Action {
  $unit = @'
[Unit]
Description=acme edge node
After=network-online.target

[Service]
ExecStart=/opt/acme/edge/bin/edge --config /opt/acme/edge/config/edge.toml
Restart=on-failure
User=acme-edge
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
'@
  if ((Test-Path $unitPath) -and (Get-Content $unitPath -Raw) -eq $unit) { return $null }
  if ($PSCmdlet.ShouldProcess($unitPath, 'Install unit')) {
    Set-Content -LiteralPath $unitPath -Value $unit -NoNewline
    $sysctl = @{ FilePath = 'systemctl'; ArgumentList = @('daemon-reload'); Wait = $true; NoNewWindow = $true }
    Start-Process @sysctl
    'installed'
  }
}

if (-not $SkipHealthCheck) {
  Invoke-Step -Name 'health' -Action {
    $healthArgs = @{
      Uri             = "https://$($manifest.Hostname):$($manifest.Port)/healthz"
      TimeoutSeconds  = $HealthTimeoutSeconds
      IntervalSeconds = $Environment -eq 'production' ? 5 : 2
    }
    Wait-ServiceHealthy @healthArgs
  }
}

$failed = $script:Steps | Where-Object Status -EQ ([StepStatus]::Failed)
$script:Steps | ForEach-Object { Write-Host $_.ToString() }
Write-Host ('{0} step(s), {1} changed, {2} failed' -f $script:Steps.Count,
  @($script:Steps | Where-Object { $_.Status -eq 'Changed' }).Count, @($failed).Count)
exit ($failed ? 1 : 0)
