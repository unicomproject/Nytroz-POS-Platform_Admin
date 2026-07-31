# Local-only QA persona bootstrap for Platform Dashboard final verification.
# Does not log passwords/tokens to Second Brain. Uses Super Admin API + local seed password hash.

$ErrorActionPreference = 'Stop'
$api = 'http://localhost:5150'
$seedHash = 'PBKDF2-SHA256:100000:B3G83oiz74Jq8+Zv7ee0dw==:j1sFOiYVSHBURb3i2QO7j8v+SF3dtysiuAuc/Ww/7Ig='
$qaPassword = 'Admin@123'

$login = Invoke-RestMethod -Method Post -Uri "$api/api/v1/platform-auth/login" `
  -ContentType 'application/json' -Body '{"email":"posunique001@gmail.com","password":"Admin@123"}'
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

function Ensure-Role([string]$code, [string]$name, [string[]]$perms) {
  $roles = Invoke-RestMethod -Uri "$api/api/v1/platform-admin/roles" -Headers $headers
  $existing = @($roles.data.roles) | Where-Object { $_.roleCode -eq $code } | Select-Object -First 1
  if (-not $existing) {
    $body = @{
      roleCode = $code
      name = $name
      description = "Temporary QA role for Dashboard E2E ($code)."
      status = 'ACTIVE'
    } | ConvertTo-Json
    $created = Invoke-RestMethod -Method Post -Uri "$api/api/v1/platform-admin/roles" `
      -Headers $headers -ContentType 'application/json' -Body $body
    $existing = $created.data
    Write-Host "ROLE_CREATED $code $($existing.id)"
  } else {
    Write-Host "ROLE_REUSED $code $($existing.id)"
  }

  $permBody = @{ permissionCodes = $perms } | ConvertTo-Json
  Invoke-RestMethod -Method Put -Uri "$api/api/v1/platform-admin/roles/$($existing.id)/permissions" `
    -Headers $headers -ContentType 'application/json' -Body $permBody | Out-Null
  return $existing
}

function Ensure-User([string]$email, [string]$roleCode) {
  $users = Invoke-RestMethod -Uri "$api/api/v1/platform-admin/users" -Headers $headers
  $existing = @($users.data.users) | Where-Object {
    $_.email.ToLowerInvariant() -eq $email.ToLowerInvariant()
  } | Select-Object -First 1

  if (-not $existing) {
    $body = @{ email = $email; status = 'ACTIVE'; roleCodes = @($roleCode) } | ConvertTo-Json
    $created = Invoke-RestMethod -Method Post -Uri "$api/api/v1/platform-admin/users" `
      -Headers $headers -ContentType 'application/json' -Body $body
    $existing = $created.data
    Write-Host "USER_CREATED $email $($existing.id)"
  } else {
    $assign = @{ roleCodes = @($roleCode) } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "$api/api/v1/platform-admin/users/$($existing.id)/roles" `
      -Headers $headers -ContentType 'application/json' -Body $assign | Out-Null
    $upd = @{ status = 'ACTIVE' } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "$api/api/v1/platform-admin/users/$($existing.id)" `
      -Headers $headers -ContentType 'application/json' -Body $upd | Out-Null
    Write-Host "USER_REUSED $email $($existing.id)"
  }
  return $existing
}

$personas = @(
  @{ Id='QA-DASH-ONLY'; Email='qa.dash.only@local.test'; Role='qa_dash_only'; Name='QA Dashboard Only'; Perms=@('platform.dashboard.view') },
  @{ Id='QA-DASH-TENANT'; Email='qa.dash.tenant@local.test'; Role='qa_dash_tenant'; Name='QA Dashboard Tenant'; Perms=@('platform.dashboard.view','platform.tenants.view') },
  @{ Id='QA-DASH-SUBS'; Email='qa.dash.subs@local.test'; Role='qa_dash_subs'; Name='QA Dashboard Subs'; Perms=@('platform.dashboard.view','platform.tenant_subscriptions.view') },
  @{ Id='QA-DASH-BILLING'; Email='qa.dash.billing@local.test'; Role='qa_dash_billing'; Name='QA Dashboard Billing'; Perms=@('platform.dashboard.view','platform.billing.view') },
  @{ Id='QA-DASH-USERS'; Email='qa.dash.users@local.test'; Role='qa_dash_users'; Name='QA Dashboard Users'; Perms=@('platform.dashboard.view','platform.users.view') }
)

$emails = @()
foreach ($p in $personas) {
  Ensure-Role $p.Role $p.Name $p.Perms | Out-Null
  Ensure-User $p.Email $p.Role | Out-Null
  $emails += $p.Email
}

$dir = Join-Path $env:TEMP 'qa-dash-activate'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
@'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="9.0.3" />
  </ItemGroup>
</Project>
'@ | Set-Content "$dir\activate.csproj"

$emailInList = ($emails | ForEach-Object { "'" + $_.ToUpperInvariant() + "'" }) -join ', '
$prog = @"
using Npgsql;
var cs = "Host=localhost;Port=5432;Database=UnifiedCommerceDb;Username=postgres;Password=admin";
await using var conn = new NpgsqlConnection(cs);
await conn.OpenAsync();
var sql = @"
UPDATE platform_users
SET password_hash = '$seedHash',
    status = 'ACTIVE',
    updated_at = now()
WHERE normalized_email IN ($emailInList);
SELECT normalized_email, status FROM platform_users WHERE normalized_email IN ($emailInList);
";
await using var cmd = new NpgsqlCommand(sql, conn);
await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine(reader.GetString(0) + "=" + reader.GetString(1));
}
"@
Set-Content "$dir\Program.cs" -Value $prog -Encoding UTF8
dotnet run --project "$dir\activate.csproj" 2>&1 | Select-Object -Last 25

foreach ($p in $personas) {
  $body = @{ email = $p.Email; password = $qaPassword } | ConvertTo-Json
  try {
    $lr = Invoke-WebRequest -Method Post -Uri "$api/api/v1/platform-auth/login" `
      -ContentType 'application/json' -Body $body -UseBasicParsing
    $raw = $lr.Content
    $checks = @(
      'platform.dashboard.view',
      'platform.tenants.view',
      'platform.tenant_subscriptions.view',
      'platform.billing.view',
      'platform.users.view'
    )
    $eff = @()
    foreach ($c in $checks) {
      if ($raw -match [regex]::Escape($c)) { $eff += $c }
    }
    Write-Host "LOGIN_OK $($p.Id) effective=$($eff -join ',')"
  } catch {
    Write-Host "LOGIN_FAIL $($p.Id) $($_.Exception.Response.StatusCode.value__)"
  }
}

Write-Host 'NOTE: QA-DASH-SUPER reuses posunique001@gmail.com (Super Administrator)'
Write-Host 'NOTE: QA-DASH-RESTRICTED reuses QA-DASH-ONLY (identical approved permission set)'
