# Smoke runner for testplan.md — HTTP-level checks
$Base = "http://localhost:3107"
$Results = @()

function Test-Case($Id, $Pass, $Note) {
  $script:Results += [pscustomobject]@{ Id = $Id; Pass = $Pass; Note = $Note }
}

function New-Session($user, $pass) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-WebRequest -Uri "$Base/api/auth/sign-in/username" -Method POST `
    -Body (@{ username = $user; password = $pass } | ConvertTo-Json) `
    -ContentType "application/json" -WebSession $s -UseBasicParsing | Out-Null
  return $s
}

# PERM-01 anonyme
foreach ($p in @("/admin", "/commercial", "/admin/commandes")) {
  $r = Invoke-WebRequest -Uri "$Base$p" -UseBasicParsing
  $leak = $r.Content -match '977 755|PE-000|1 833'
  $redir = $r.Content -match 'connexion|refresh|Connexion'
  Test-Case "PERM-01$p" ($redir -and -not $leak) "leak=$leak redir=$redir"
}

# AUTH + admin session
$admin = New-Session "admin" "password"
$adminPages = @(
  "/admin", "/admin/commandes", "/admin/paiements", "/admin/clients",
  "/admin/produits", "/admin/kpi", "/admin/utilisateurs", "/admin/audit",
  "/admin/sessions", "/admin/parametres", "/admin/exports", "/admin/retours",
  "/admin/clients/fusion", "/admin/produits/categories", "/admin/objectifs"
)
$ok = 0
foreach ($p in $adminPages) {
  $r = Invoke-WebRequest -Uri "$Base$p" -WebSession $admin -UseBasicParsing
  if ($r.Content -notmatch "Erreur 500") { $ok++ }
}
Test-Case "AUTH-01/admin-pages" ($ok -eq $adminPages.Count) "$ok/$($adminPages.Count) OK"

# PERM-02 commercial -> admin
$nord = New-Session "commercial.nord" "commercial123"
$r = Invoke-WebRequest -Uri "$Base/admin" -WebSession $nord -UseBasicParsing
Test-Case "PERM-02" ($r.Content -match "403|Acces refuse|Accès refusé") "admin blocked"

# PERM-03 cross command
$r = Invoke-WebRequest -Uri "$Base/commercial/commandes/seed-volume-0216" -WebSession $nord -UseBasicParsing
$leak = $r.Content -match "PE-000|1 947|Boucherie"
Test-Case "PERM-03" (($r.Content -match "403|Acces refuse|Accès refusé") -and -not $leak) "leak=$leak"

# PERM-04 cross PDF
try {
  $pdf = Invoke-WebRequest -Uri "$Base/commercial/commandes/seed-volume-0216/pdf" -WebSession $nord -UseBasicParsing
  Test-Case "PERM-04" $false "got PDF $($pdf.StatusCode)"
} catch {
  Test-Case "PERM-04" $true "blocked"
}

# PERM-06 export admin
try {
  Invoke-WebRequest -Uri "$Base/admin/commandes/export" -WebSession $nord -UseBasicParsing -ErrorAction Stop
  Test-Case "PERM-06" $false "export allowed"
} catch {
  Test-Case "PERM-06" $true "blocked $($_.Exception.Response.StatusCode)"
}

# KPI-12 invalid dates
$r = Invoke-WebRequest -Uri "$Base/admin/kpi?debut=2026-07-09&fin=2026-01-01" -WebSession $admin -UseBasicParsing
Test-Case "KPI-12" (($r.Content -match "date fin") -and ($r.Content -notmatch "977 755")) "no misleading KPI"

# LST-07 invalid dates commandes
$r = Invoke-WebRequest -Uri "$Base/admin/commandes?debut=2026-07-10&fin=2026-01-01" -WebSession $admin -UseBasicParsing
Test-Case "LST-07" (($r.Content -match "date") -and ($r.Content -notmatch "1003 resultat")) "empty on bad dates"

# PAR-04 compteur
$r = Invoke-WebRequest -Uri "$Base/admin/parametres" -WebSession $admin -UseBasicParsing
Test-Case "PAR-04" ($r.Content -match "1003") "compteur BL"

# PDF + Excel
$pdf = Invoke-WebRequest -Uri "$Base/admin/commandes/seed-volume-0215/pdf" -WebSession $admin -UseBasicParsing
Test-Case "PDF-01" ($pdf.Headers["Content-Type"] -match "pdf" -and $pdf.RawContentLength -gt 1000) "$($pdf.RawContentLength)b"

$xlsx = Invoke-WebRequest -Uri "$Base/admin/exports/global" -WebSession $admin -UseBasicParsing
Test-Case "XLS-07" ($xlsx.Headers["Content-Type"] -match "spreadsheet") "$($xlsx.RawContentLength)b"

# XLS-04 invalid export period
try {
  Invoke-WebRequest -Uri "$Base/admin/commandes/export?debut=2026-07-10&fin=2026-01-01" -WebSession $admin -UseBasicParsing -ErrorAction Stop
  Test-Case "XLS-04" $false "export succeeded on bad dates"
} catch {
  $code = [int]$_.Exception.Response.StatusCode
  Test-Case "XLS-04" ($code -eq 400) "HTTP $code"
}

# 404
$r = Invoke-WebRequest -Uri "$Base/page-inexistante-xyz" -WebSession $admin -UseBasicParsing
Test-Case "PERM-08-404" ($r.Content -match "404|introuvable|Retour") "404 page"

# Commercial scope
$nordCmd = Invoke-WebRequest -Uri "$Base/commercial/commandes?page=1" -WebSession $nord -UseBasicParsing
$adminCmd = Invoke-WebRequest -Uri "$Base/admin/commandes?page=1" -WebSession $admin -UseBasicParsing
$nordN = if ($nordCmd.Content -match "(\d+) resultat") { $matches[1] } else { "?" }
$adminN = if ($adminCmd.Content -match "(\d+) resultat") { $matches[1] } else { "?" }
Test-Case "LST-09" ([int]$nordN -lt [int]$adminN) "nord=$nordN admin=$adminN"

$Results | Format-Table -AutoSize
$fail = ($Results | Where-Object { -not $_.Pass }).Count
Write-Output "TOTAL: $($Results.Count) PASS: $($Results.Count - $fail) FAIL: $fail"
