# 启动本机 MongoDB：优先系统服务 / mongod PATH，其次 winget 安装路径，最后便携目录
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
  Write-Host "MongoDB 已在 127.0.0.1:$port 监听"
  exit 0
}

$service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($service) {
  if ($service.Status -ne 'Running') {
    Start-Service MongoDB
  }
  Start-Sleep -Seconds 2
  if (Test-PortOpen -Port $port) {
    Write-Host '已启动 Windows 服务 MongoDB'
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
  Write-Error '未找到 mongod.exe。请先安装 MongoDB.Server，或将便携版解压到 .tools/mongodb'
  exit 1
}

Write-Host "使用 $mongod 启动（dbpath=$dataDir）"
Start-Process -FilePath $mongod -ArgumentList @('--dbpath', (Resolve-Path $dataDir), '--bind_ip', '127.0.0.1', '--port', "$port") -WindowStyle Hidden
Start-Sleep -Seconds 2
if (Test-PortOpen -Port $port) {
  Write-Host "MongoDB 已启动 127.0.0.1:$port"
  exit 0
}
Write-Error 'mongod 已拉起但端口仍未就绪'
exit 1
