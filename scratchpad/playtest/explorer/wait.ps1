param([string]$name, [int]$timeout = 300, [int]$tail = 40)
$log = "C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude\scratchpad\playtest\explorer\run2\driver.log"
$deadline = (Get-Date).AddSeconds($timeout)
while ((Get-Date) -lt $deadline) {
  if ((Test-Path $log) -and (Select-String -Path $log -Pattern "=== (DONE|ERROR) $name" -Quiet)) { break }
  Start-Sleep -Seconds 3
}
Get-Content $log -Tail $tail
