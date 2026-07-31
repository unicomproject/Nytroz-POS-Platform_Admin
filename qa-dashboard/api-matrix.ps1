# Live API permission matrix for Dashboard QA personas. No secrets printed.

$ErrorActionPreference = 'Stop'
$api = 'http://localhost:5150'
$qaPassword = 'Admin@123'

$personas = @(
  @{ Id='QA-DASH-SUPER'; Email='posunique001@gmail.com' },
  @{ Id='QA-DASH-ONLY'; Email='qa.dash.only@local.test' },
  @{ Id='QA-DASH-TENANT'; Email='qa.dash.tenant@local.test' },
  @{ Id='QA-DASH-SUBS'; Email='qa.dash.subs@local.test' },
  @{ Id='QA-DASH-BILLING'; Email='qa.dash.billing@local.test' },
  @{ Id='QA-DASH-USERS'; Email='qa.dash.users@local.test' },
  @{ Id='QA-DASH-RESTRICTED'; Email='qa.dash.only@local.test' }
)

function SecStatus($sec) {
  if ($null -eq $sec) { return 'OMITTED' }
  return "$($sec.status)$(if ($sec.errorCode) { "/$($sec.errorCode)" })"
}

function NumOrNull($v) {
  if ($null -eq $v) { return 'null' }
  return "$v"
}

foreach ($p in $personas) {
  $body = @{ email = $p.Email; password = $qaPassword } | ConvertTo-Json
  $lr = Invoke-WebRequest -Method Post -Uri "$api/api/v1/platform-auth/login" `
    -ContentType 'application/json' -Body $body -UseBasicParsing
  $j = $lr.Content | ConvertFrom-Json
  $headers = @{ Authorization = "Bearer $($j.accessToken)" }

  $checks = @(
    'platform.dashboard.view',
    'platform.tenants.view',
    'platform.tenant_subscriptions.view',
    'platform.billing.view',
    'platform.users.view'
  )
  $eff = @()
  foreach ($c in $checks) { if ($lr.Content -match [regex]::Escape($c)) { $eff += $c } }

  try {
    $dashResp = Invoke-WebRequest -Uri "$api/api/v1/platform-admin/dashboard" -Headers $headers -UseBasicParsing
    $http = $dashResp.StatusCode
    $dash = ($dashResp.Content | ConvertFrom-Json).data
  } catch {
    Write-Host "API $($p.Id) HTTP=$($_.Exception.Response.StatusCode.value__) FAIL"
    continue
  }

  $tenant = SecStatus $dash.tenantSummary
  $sub = SecStatus $dash.subscriptionSummary
  $rev = SecStatus $dash.revenueSummary
  $platUsers = NumOrNull $dash.platformFootprint.data.totalPlatformUsers
  $activeSubsFlat = NumOrNull $dash.activeSubscriptions
  $mrrCount = 0
  if ($dash.revenueSummary.data.mrrByCurrency) { $mrrCount = @($dash.revenueSummary.data.mrrByCurrency).Count }
  $subTrend = if ($dash.trends.data.subscriptionTrend) { 'present' } else { 'absent' }
  $mrrTrend = if ($dash.trends.data.mrrTrends -and @($dash.trends.data.mrrTrends).Count -gt 0) { 'present' } else { 'absent' }

  # Leak checks: zeros that look authentic when denied
  $leak = @()
  if ($sub -match 'PERMISSION_DENIED' -and $activeSubsFlat -ne 'null') { $leak += "flatActiveSubs=$activeSubsFlat" }
  if ($rev -match 'PERMISSION_DENIED' -and $mrrCount -gt 0) { $leak += "mrrGroups=$mrrCount" }
  if (($eff -notcontains 'platform.users.view') -and $platUsers -ne 'null') { $leak += "platUsers=$platUsers" }

  Write-Host ("API {0} HTTP={1} eff=[{2}] tenant={3} sub={4} rev={5} platUsers={6} activeSubsFlat={7} mrrGroups={8} subTrend={9} mrrTrend={10} leak=[{11}] setup={12}" -f `
    $p.Id, $http, ($eff -join ';'), $tenant, $sub, $rev, $platUsers, $activeSubsFlat, $mrrCount, $subTrend, $mrrTrend, ($leak -join ';'), $dash.setupPendingTenants)
}
