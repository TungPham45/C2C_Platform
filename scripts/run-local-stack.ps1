param(
  [switch]$DryRun,
  [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$DockerCommand = 'docker.exe'
$NpmCommand = 'npm.cmd'
$NpxCommand = 'npx.cmd'
$PostgresContainerName = 'c2c-platform-db'
$InternalServiceToken = 'internal-dev-token'

$Services = @(
  @{
    Title = 'C2C Auth Service'
    Project = 'auth-service'
    Port = 3002
    Env = @{
      DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/auth_db'
      INTERNAL_SERVICE_TOKEN = $InternalServiceToken
    }
  },
  @{
    Title = 'C2C Product Service'
    Project = 'product-service'
    Port = 3001
    Env = @{
      DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/product_db'
      INTERNAL_SERVICE_TOKEN = $InternalServiceToken
      PUBLIC_BASE_URL = 'http://localhost:3001/uploads'
    }
  },
  @{
    Title = 'C2C Admin Service'
    Project = 'admin-moderation-service'
    Port = 3005
    Env = @{
      AUTH_SERVICE_BASE_URL = 'http://localhost:3002/api/auth'
      DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/admin_mod_db'
      INTERNAL_SERVICE_TOKEN = $InternalServiceToken
      PRODUCT_SERVICE_BASE_URL = 'http://localhost:3001/api/products'
    }
  },
  @{
    Title = 'C2C API Gateway'
    Project = 'api-gateway'
    Port = 3000
    Env = @{
      ADMIN_SERVICE_URL = 'http://localhost:3005/api/admin'
      AUTH_SERVICE_URL = 'http://localhost:3002/api/auth'
      PRODUCT_PUBLIC_URL = 'http://localhost:3001/uploads'
      PRODUCT_SERVICE_URL = 'http://localhost:3001/api/products'
    }
  },
  @{
    Title = 'C2C Web'
    Project = 'web'
    Port = 4200
    Env = @{
      VITE_DEV_API_PROXY_TARGET = 'http://localhost:3000'
    }
  }
)

function Write-Step {
  param([string]$Message)

  Write-Host "[run-local] $Message" -ForegroundColor Cyan
}

function Convert-ToPsLiteral {
  param([string]$Value)

  return $Value.Replace("'", "''")
}

function Assert-CommandAvailable {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $CommandName"
  }
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $rendered = if ($Arguments.Count -gt 0) {
    "$FilePath $($Arguments -join ' ')"
  } else {
    $FilePath
  }

  if ($DryRun) {
    Write-Host "[dry-run] $rendered" -ForegroundColor Yellow
    return
  }

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $rendered"
  }
}

function Get-PortOwnerSummary {
  param([int]$Port)

  $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return $null
  }

  $processNames = foreach ($pid in ($connections | Select-Object -ExpandProperty OwningProcess -Unique)) {
    try {
      (Get-Process -Id $pid -ErrorAction Stop).ProcessName
    } catch {
      "PID $pid"
    }
  }

  return (($processNames | Sort-Object -Unique) -join ', ')
}

function Assert-PortAvailable {
  param(
    [int]$Port,
    [string]$Name
  )

  $ownerSummary = Get-PortOwnerSummary -Port $Port
  if ($ownerSummary) {
    throw "$Name cannot start because port $Port is already in use by $ownerSummary."
  }
}

function Ensure-Dependencies {
  $nodeModulesPath = Join-Path $RepoRoot 'node_modules'
  $requiredClients = @(
    'node_modules/@prisma/client/auth/index.js',
    'node_modules/@prisma/client/product/index.js',
    'node_modules/@prisma/client/admin-mod/index.js'
  )

  if (-not (Test-Path $nodeModulesPath)) {
    if ($SkipInstall) {
      throw 'node_modules is missing. Remove -SkipInstall or run npm.cmd install first.'
    }

    Write-Step 'Installing npm dependencies'
    Invoke-External -FilePath $NpmCommand -Arguments @('install')
  } else {
    Write-Step 'node_modules already present'
  }

  $missingClients = $requiredClients | Where-Object {
    -not (Test-Path (Join-Path $RepoRoot $_))
  }

  if ($missingClients.Count -gt 0) {
    Write-Step 'Generating Prisma clients'
    Invoke-External -FilePath $NpmCommand -Arguments @('run', 'prisma:generate')
  } else {
    Write-Step 'Prisma clients already generated'
  }
}

function Ensure-PostgresReady {
  Write-Step 'Starting PostgreSQL container'
  Invoke-External -FilePath $DockerCommand -Arguments @('compose', 'up', '-d', 'postgres')

  if ($DryRun) {
    Write-Step 'Skipping PostgreSQL health wait in dry-run mode'
    return
  }

  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    $status = & $DockerCommand inspect '--format={{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $PostgresContainerName 2>$null
    if ($LASTEXITCODE -eq 0 -and $status.Trim() -eq 'healthy') {
      Write-Step 'PostgreSQL is healthy'
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL container '$PostgresContainerName' did not become healthy within 120 seconds."
}

function Start-ServiceWindow {
  param([hashtable]$Service)

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add('$Host.UI.RawUI.WindowTitle = ''' + (Convert-ToPsLiteral $Service.Title) + '''')
  $lines.Add('Set-Location -LiteralPath ''' + (Convert-ToPsLiteral $RepoRoot) + '''')

  foreach ($entry in ($Service.Env.GetEnumerator() | Sort-Object Name)) {
    $lines.Add('$env:' + $entry.Key + ' = ''' + (Convert-ToPsLiteral ([string]$entry.Value)) + '''')
  }

  $lines.Add('Write-Host ''Starting ' + (Convert-ToPsLiteral $Service.Project) + ' on port ' + $Service.Port + ''' -ForegroundColor Green')
  $lines.Add('& ''' + (Convert-ToPsLiteral $NpxCommand) + ''' nx serve ' + $Service.Project)
  $lines.Add('if ($LASTEXITCODE -ne 0) { Write-Host ""; Write-Host "Process exited with code $LASTEXITCODE" -ForegroundColor Red }')

  $commandText = "& {`n" + ($lines -join "`n") + "`n}"

  if ($DryRun) {
    Write-Host "[dry-run] open window: $($Service.Title) -> $($Service.Project)" -ForegroundColor Yellow
    return
  }

  Start-Process -FilePath 'powershell.exe' `
    -WorkingDirectory $RepoRoot `
    -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $commandText) | Out-Null
}

Assert-CommandAvailable -CommandName $DockerCommand
Assert-CommandAvailable -CommandName $NpmCommand
Assert-CommandAvailable -CommandName 'powershell.exe'

Write-Step 'Checking local service ports'
foreach ($service in $Services) {
  Assert-PortAvailable -Port $service.Port -Name $service.Title
}

Ensure-Dependencies
Ensure-PostgresReady

Write-Step 'Starting local services'
foreach ($service in $Services) {
  Start-ServiceWindow -Service $service
}

Write-Step 'Local stack startup complete'
Write-Host 'URLs:' -ForegroundColor Green
Write-Host '  Web: http://localhost:4200'
Write-Host '  API Gateway: http://localhost:3000'
Write-Host '  Auth Service: http://localhost:3002/api'
Write-Host '  Product Service: http://localhost:3001/api'
Write-Host '  Admin Service: http://localhost:3005/api'
