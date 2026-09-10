# Start local MongoDB: Windows service, PATH, install dir, or portable .tools
$ErrorActionPreference = 'Stop'
$port = 27017
$dataDir = Join-Path $PSScriptRoot '..\data\db'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

function Test-PortOpen {
  param([int]$Port)
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect('127.0.0.1', $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(400)
    $tcp.Close()
    return $ok
  } catch {
    return $false
  }
}

if (Test-PortOpen -Port $port) {
  Write-Host "MongoDB already listening on 127.0.0.1:$port"
  exit 0
}

$service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($service) {
  if ($service.Status -ne 'Running') {
    try {
      Start-Service MongoDB -ErrorAction Stop
    } catch {
      Write-Host "Windows service MongoDB could not start, falling back to mongod.exe"
    }
  }
  Start-Sleep -Seconds 2
  if (Test-PortOpen -Port $port) {
    Write-Host 'Started Windows service MongoDB'
    exit 0
  }
}

$candidates = @(
  (Get-Command mongod -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
  'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe',
  'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe',
  'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe',
  (Join-Path $PSScriptRoot '..\.tools\mongodb\bin\mongod.exe')
) | Where-Object { $_ -and (Test-Path $_) }

$mongod = $candidates | Select-Object -First 1
if (-not $mongod) {
  Write-Error 'mongod.exe not found. Install MongoDB.Server or unpack portable build to .tools/mongodb'
  exit 1
}

Write-Host "Starting $mongod (dbpath=$dataDir)"
Start-Process -FilePath $mongod -ArgumentList @('--dbpath', (Resolve-Path $dataDir), '--bind_ip', '127.0.0.1', '--port', "$port") -WindowStyle Hidden
Start-Sleep -Seconds 2
if (Test-PortOpen -Port $port) {
  Write-Host "MongoDB started on 127.0.0.1:$port"
  exit 0
}
Write-Error 'mongod launched but port is not ready'
exit 1
