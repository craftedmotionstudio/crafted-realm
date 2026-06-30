# Crafted Realm - bulletproof local review server.
# One command: clears port 8777, stamps the build, serves http://127.0.0.1:8777.
# Going forward ALWAYS launch the review build with this (or serve.bat) so there is
# never more than one server on the port and the in-game build stamp is current.

$ErrorActionPreference = 'Stop'
$port = 8777
$root = $PSScriptRoot
Set-Location $root

function Line($t, $c) { Write-Host $t -ForegroundColor $c }

Write-Host ''
Line '  Crafted Realm - local review server' 'Cyan'
Line '  ===================================' 'Cyan'

# 1. Clear anything already on the port (a stale/orphaned server).
$held = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
if ($held) {
  foreach ($procId in $held) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Line "  cleared stale server (PID $procId) on port $port" 'Yellow'
    } catch {
      Line "  !! could not kill PID $procId - it was started elevated." 'Red'
    }
  }
  Start-Sleep -Milliseconds 500
}

# 2. Confirm the port is actually free before we try to bind.
$still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host ''
  Line "  ABORT: port $port is still held by PID(s) $($still.OwningProcess -join ', ')." 'Red'
  Line "  Those were started by an elevated terminal, so this (non-admin) launcher" 'Red'
  Line "  cannot reclaim the port. Fix once, then re-run:" 'Red'
  Line "    - open Task Manager - Details, end those python.exe processes, OR" 'Gray'
  Line "    - close the admin terminal window that started them." 'Gray'
  exit 1
}

# 3. Stamp the build so the on-screen marker + this console agree on what is served.
$branch  = (git rev-parse --abbrev-ref HEAD 2>$null)
$commit  = (git rev-parse --short HEAD 2>$null)
$subject = (git log -1 --pretty=%s 2>$null)
$dirty   = [bool](git status --porcelain 2>$null)
$now     = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
if (-not $branch) { $branch = '(no git)'; $commit = '-'; $subject = ''; }

$info = [ordered]@{ branch = $branch; commit = $commit; subject = $subject; dirty = $dirty; served = $now }
$json = $info | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText((Join-Path $root 'BUILD_INFO.json'), $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Line "  URL:    http://127.0.0.1:$port" 'Green'
$dtxt = if ($dirty) { ' (uncommitted changes)' } else { '' }
Line "  Build:  $branch @ $commit$dtxt" 'Green'
if ($subject) { Line "  Commit: $subject" 'DarkGray' }
Line "  Served: $now" 'DarkGray'
Write-Host ''
Line '  -> Hard-refresh (Ctrl+Shift+R) in the browser to pick up edits.' 'DarkGray'
Line '  -> Ctrl+C here stops the server.' 'DarkGray'
Write-Host ''

# 4. Serve in the foreground (blocking). Closing this window / Ctrl+C stops the one server.
python -m http.server $port --bind 127.0.0.1
