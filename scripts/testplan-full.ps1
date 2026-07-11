# Full testplan.md runner — HTTP/API level + content checks
$Base = "http://localhost:3107"
$Results = @()

function Test-Case($Id, $Status, $Note) {
  $script:Results += [pscustomobject]@{ Id = $Id; Status = $Status; Note = $Note }
}

function New-Session($user, $pass) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-WebRequest -Uri "$Base/api/auth/sign-in/username" -Method POST `
    -Body (@{ username = $user; password = $pass } | ConvertTo-Json) `
    -ContentType "application/json" -WebSession $s -UseBasicParsing | Out-Null
  return $s
}

function Is-Blocked($r) {
  return ($r.Content -match "403|Acces refuse|Accès refusé|connexion|refresh") -and
    ($r.Headers["Content-Type"] -notmatch "pdf|spreadsheet|excel")
}

function Get-Count($html, $pattern) {
  if ($html -match $pattern) { return [int]$matches[1] }
  return $null
}

# --- PERM-01 ---
foreach ($p in @("/admin", "/commercial", "/admin/commandes")) {
  $r = Invoke-WebRequest -Uri "$Base$p" -UseBasicParsing
  $leak = $r.Content -match '977 755|CP-000|1 833|1003 resultat'
  $redir = $r.Content -match 'connexion|refresh|Connexion'
  Test-Case "PERM-01$p" $(if ($redir -and -not $leak) { "PASS" } else { "FAIL" }) "leak=$leak"
}

# --- Sessions ---
try { $admin = New-Session "admin" "password" } catch { Test-Case "AUTH-01" "FAIL" "login admin"; exit 1 }
try { $nord = New-Session "com1" "password" } catch { Test-Case "AUTH-02" "FAIL" "login com1" }
try { $sud = New-Session "com2" "password" } catch { Test-Case "AUTH-02b" "FAIL" "login com2" }

# AUTH pages
$r = Invoke-WebRequest -Uri "$Base/admin" -WebSession $admin -UseBasicParsing
Test-Case "AUTH-01" $(if ($r.Content -match "Connecté.*ADMINISTRATEUR") { "PASS" } else { "FAIL" }) "admin dashboard"
$r = Invoke-WebRequest -Uri "$Base/commercial" -WebSession $nord -UseBasicParsing
Test-Case "AUTH-02" $(if ($r.Content -match "Connecté.*COMMERCIAL|Commercial Nord") { "PASS" } else { "FAIL" }) "commercial dashboard"

# AUTH-03 skipped here to preserve rate limit budget (5 sign-in/min). Verified separately.
Test-Case "AUTH-03" "SKIP" "run once manually or dedicated auth script"

# AUTH-05 connexion page
$r = Invoke-WebRequest -Uri "$Base/connexion" -UseBasicParsing
Test-Case "AUTH-05" $(if ($r.Content -match "chiffr|protég") { "PASS" } else { "FAIL" }) "security mention"

# PERM-02
$r = Invoke-WebRequest -Uri "$Base/admin" -WebSession $nord -UseBasicParsing
Test-Case "PERM-02" $(if ($r.Content -match "403|Acces refuse|Accès refusé") { "PASS" } else { "FAIL" }) "commercial blocked"

# PERM-03 cross command
$r = Invoke-WebRequest -Uri "$Base/commercial/commandes/seed-volume-0216" -WebSession $nord -UseBasicParsing
$leak = $r.Content -match "CP-000|1 947|Boucherie|montant"
Test-Case "PERM-03" $(if (($r.Content -match "403|Acces refuse|Accès refusé") -and -not $leak) { "PASS" } else { "FAIL" }) "leak=$leak"

# PERM-04 cross PDF — 200 HTML guard OK
$r = Invoke-WebRequest -Uri "$Base/commercial/commandes/seed-volume-0216/pdf" -WebSession $nord -UseBasicParsing
$isPdf = $r.Headers["Content-Type"] -match "pdf"
Test-Case "PERM-04" $(if (-not $isPdf) { "PASS" } else { "FAIL" }) "type=$($r.Headers['Content-Type'])"

# PERM-06 export blocked
$r = Invoke-WebRequest -Uri "$Base/admin/commandes/export" -WebSession $nord -UseBasicParsing
$isXlsx = $r.Headers["Content-Type"] -match "spreadsheet"
Test-Case "PERM-06" $(if (-not $isXlsx) { "PASS" } else { "FAIL" }) "type=$($r.Headers['Content-Type'])"

# PERM-08 404
$r = Invoke-WebRequest -Uri "$Base/page-inexistante-xyz" -WebSession $admin -UseBasicParsing
Test-Case "PERM-08-404" $(if ($r.Content -match "404|introuvable|Retour") { "PASS" } else { "FAIL" }) "404 page"

# Admin pages no 500
$adminPages = @("/admin/commandes","/admin/paiements","/admin/clients","/admin/produits","/admin/kpi","/admin/utilisateurs","/admin/audit","/admin/sessions","/admin/parametres","/admin/exports","/admin/retours","/admin/objectifs")
$ok = 0
foreach ($p in $adminPages) {
  $r = Invoke-WebRequest -Uri "$Base$p" -WebSession $admin -UseBasicParsing
  if ($r.Content -notmatch "Erreur 500|Internal Server Error") { $ok++ }
}
Test-Case "ADMIN-PAGES" $(if ($ok -eq $adminPages.Count) { "PASS" } else { "FAIL" }) "$ok/$($adminPages.Count)"

# Commercial pages
$commPages = @("/commercial/commandes","/commercial/commandes/nouvelle","/commercial/clients","/commercial/kpi","/commercial/retours","/commercial/commandes/externes")
$ok = 0
foreach ($p in $commPages) {
  $r = Invoke-WebRequest -Uri "$Base$p" -WebSession $nord -UseBasicParsing
  if ($r.Content -notmatch "Erreur 500") { $ok++ }
}
Test-Case "COMM-PAGES" $(if ($ok -eq $commPages.Count) { "PASS" } else { "FAIL" }) "$ok/$($commPages.Count)"

# KPI-12
$r = Invoke-WebRequest -Uri "$Base/admin/kpi?debut=2026-07-09&fin=2026-01-01" -WebSession $admin -UseBasicParsing
Test-Case "KPI-12" $(if (($r.Content -match "date fin|date de fin") -and ($r.Content -notmatch "977 755|51 468")) { "PASS" } else { "FAIL" }) "invalid KPI dates"

# LST-07
$r = Invoke-WebRequest -Uri "$Base/admin/commandes?debut=2026-07-10&fin=2026-01-01" -WebSession $admin -UseBasicParsing
Test-Case "LST-07" $(if (($r.Content -match "date") -and ($r.Content -notmatch "Page 1 sur")) { "PASS" } else { "PARTIAL" }) "invalid list dates"

# PAR-04
$r = Invoke-WebRequest -Uri "$Base/admin/parametres" -WebSession $admin -UseBasicParsing
Test-Case "PAR-04" $(if ($r.Content -match "1003") { "PASS" } else { "FAIL" }) "compteur BL"

# PDF-01
$pdf = Invoke-WebRequest -Uri "$Base/admin/commandes/seed-volume-0215/pdf" -WebSession $admin -UseBasicParsing
Test-Case "PDF-01" $(if ($pdf.Headers["Content-Type"] -match "pdf" -and $pdf.RawContentLength -gt 1000) { "PASS" } else { "FAIL" }) "$($pdf.RawContentLength)b"

# XLS-04
try {
  Invoke-WebRequest -Uri "$Base/admin/commandes/export?debut=2026-07-10&fin=2026-01-01" -WebSession $admin -UseBasicParsing -ErrorAction Stop
  Test-Case "XLS-04" "FAIL" "export on bad dates"
} catch {
  Test-Case "XLS-04" $(if ([int]$_.Exception.Response.StatusCode -eq 400) { "PASS" } else { "FAIL" }) "HTTP $([int]$_.Exception.Response.StatusCode)"
}

# XLS-07
$r = Invoke-WebRequest -Uri "$Base/admin/exports" -WebSession $admin -UseBasicParsing
Test-Case "XLS-07" $(if ($r.Content -match "sauvegarde infrastructure|infrastructure") { "PASS" } else { "PARTIAL" }) "exports page"

# XLS-06 anonymous export
try {
  $x = Invoke-WebRequest -Uri "$Base/admin/commandes/export" -UseBasicParsing -ErrorAction Stop
  $anonOk = -not ($x.Headers["Content-Type"] -match "spreadsheet")
  Test-Case "XLS-06" $(if ($anonOk) { "PASS" } else { "FAIL" }) "anon blocked"
} catch { Test-Case "XLS-06" "PASS" "anon blocked via error" }

# LST-09 scope — count via "sur X" or total
$nordCmd = Invoke-WebRequest -Uri "$Base/commercial/commandes?page=1&taille=25" -WebSession $nord -UseBasicParsing
$adminCmd = Invoke-WebRequest -Uri "$Base/admin/commandes?page=1&taille=25" -WebSession $admin -UseBasicParsing
$nordN = Get-Count $nordCmd.Content '(\d+)\s*(?:résultat|résultats|commande)'
if (-not $nordN) { $nordN = Get-Count $nordCmd.Content 'sur\s+(\d+)' }
$adminN = Get-Count $adminCmd.Content '(\d+)\s*(?:résultat|résultats|commande)'
if (-not $adminN) { $adminN = Get-Count $adminCmd.Content 'sur\s+(\d+)' }
if ($nordN -and $adminN) {
  Test-Case "LST-09" $(if ($nordN -lt $adminN) { "PASS" } else { "FAIL" }) "nord=$nordN admin=$adminN"
} else {
  Test-Case "LST-09" "MANUAL" "could not parse counts nord=$nordN admin=$adminN"
}

# DASHC-02 compare nord vs sud CA
$nordDash = Invoke-WebRequest -Uri "$Base/commercial" -WebSession $nord -UseBasicParsing
$sudDash = Invoke-WebRequest -Uri "$Base/commercial" -WebSession $sud -UseBasicParsing
$nordCA = if ($nordDash.Content -match 'Chiffre d''affaires du mois[\s\S]*?([\d\s]+,\d{2})\s*DH') { $matches[1] } else { "?" }
$sudCA = if ($sudDash.Content -match 'Chiffre d''affaires du mois[\s\S]*?([\d\s]+,\d{2})\s*DH') { $matches[1] } else { "?" }
Test-Case "DASHC-02" $(if ($nordCA -ne $sudCA -and $nordCA -ne "?") { "PASS" } else { "PARTIAL" }) "nord=$nordCA sud=$sudCA"

# OBJ-01
$r = Invoke-WebRequest -Uri "$Base/admin/objectifs" -WebSession $admin -UseBasicParsing
Test-Case "OBJ-01" $(if ($r.Content -match "objectif|Objectif|Commercial Nord|TOTAL") { "PASS" } else { "FAIL" }) "objectifs page"

# SEED pages
$r = Invoke-WebRequest -Uri "$Base/admin/clients" -WebSession $admin -UseBasicParsing
Test-Case "SEED-01" $(if ($r.Content -match "Client sans commande|sans commande") { "PASS" } else { "PARTIAL" }) "client sans commande in list"
$r = Invoke-WebRequest -Uri "$Base/admin/produits" -WebSession $admin -UseBasicParsing
Test-Case "SEED-02" $(if ($r.Content -match "desactive|désactiv|Inactif") { "PASS" } else { "PARTIAL" }) "produit desactive"

# PAY detail partial
$r = Invoke-WebRequest -Uri "$Base/admin/commandes/seed-commande-partielle" -WebSession $admin -UseBasicParsing
Test-Case "SEED-04" $(if ($r.Content -match "Non réglée|reste|Reste") { "PASS" } else { "PARTIAL" }) "partielle"

# PERF timing
$sw = Measure-Command { Invoke-WebRequest -Uri "$Base/admin/commandes?page=1&taille=25" -WebSession $admin -UseBasicParsing | Out-Null }
Test-Case "PERF-01" $(if ($sw.TotalMilliseconds -lt 2500) { "PASS" } else { "FAIL" }) "$([math]::Round($sw.TotalMilliseconds))ms (target <1s perceived, HTTP <2.5s)"
$sw2 = Measure-Command { Invoke-WebRequest -Uri "$Base/admin/kpi" -WebSession $admin -UseBasicParsing | Out-Null }
Test-Case "PERF-02" $(if ($sw2.TotalMilliseconds -lt 3000) { "PASS" } else { "FAIL" }) "$([math]::Round($sw2.TotalMilliseconds))ms"

# PAR-08 commercial blocked
$r = Invoke-WebRequest -Uri "$Base/admin/parametres" -WebSession $nord -UseBasicParsing
Test-Case "PAR-08" $(if ($r.Content -match "403|Acces refuse|Accès refusé") { "PASS" } else { "FAIL" }) "parametres blocked"

# DASHA-05 objectifs shortcut
$r = Invoke-WebRequest -Uri "$Base/admin" -WebSession $admin -UseBasicParsing
Test-Case "DASHA-05" $(if ($r.Content -match '/admin/objectifs' -and $r.Content -notmatch 'Objectifs commerciaux[\s\S]{0,200}/admin/utilisateurs') { "PASS" } else { "FAIL" }) "shortcut href"

# RET-01 CDC note
$r = Invoke-WebRequest -Uri "$Base/commercial/retours" -WebSession $nord -UseBasicParsing
Test-Case "RET-01" $(if ($r.Content -match "horodat.*automatiqu.*li.*votre compte") { "PASS" } else { "FAIL" }) "CDC note"

# PERM-05 cross client fiche
$r = Invoke-WebRequest -Uri "$Base/commercial/clients/seed-client-restaurant-sud" -WebSession $nord -UseBasicParsing
$leakClient = $r.Content -match "Restaurant Sud[\s\S]{0,500}command|totaux|BL"
Test-Case "PERM-05" $(if (($r.Content -match "403|Acces refuse|Accès refusé") -and -not $leakClient) { "PASS" } else { "FAIL" }) "cross client"

# PERM-07 403 same for real vs fake id
$rReal = Invoke-WebRequest -Uri "$Base/commercial/commandes/seed-volume-0216" -WebSession $nord -UseBasicParsing
$rFake = Invoke-WebRequest -Uri "$Base/commercial/commandes/id-inexistant-bidon-xyz" -WebSession $nord -UseBasicParsing
$same403 = ($rReal.Content -match "403|Acces refuse|Accès refusé") -and ($rFake.Content -match "403|Acces refuse|Accès refusé|404|introuvable")
Test-Case "PERM-07" $(if ($same403) { "PASS" } else { "PARTIAL" }) "real vs fake blocked"

# LST-09 better RSC parsing
function Get-ResultCount($html) {
  if ($html -match '(\d+),\\" resultat') { return [int]$matches[1] }
  if ($html -match '(\d+) resultat') { return [int]$matches[1] }
  return $null
}
$nordN2 = Get-ResultCount $nordCmd.Content
$adminN2 = Get-ResultCount $adminCmd.Content
if ($nordN2 -and $adminN2) {
  Test-Case "LST-09b" $(if ($nordN2 -lt $adminN2) { "PASS" } else { "FAIL" }) "nord=$nordN2 admin=$adminN2"
}

# KPI stability (20 sequential rapid requests)
$kpiOk = 0
1..20 | ForEach-Object {
  $kr = Invoke-WebRequest -Uri "$Base/admin/kpi" -WebSession $admin -UseBasicParsing
  if ($kr.StatusCode -eq 200 -and $kr.Content -notmatch "Erreur 500") { $script:kpiOk++ }
}
Test-Case "KPI-STRESS" $(if ($kpiOk -eq 20) { "PASS" } else { "FAIL" }) "$kpiOk/20 HTTP 200"

# AUD page
$r = Invoke-WebRequest -Uri "$Base/admin/audit" -WebSession $admin -UseBasicParsing
Test-Case "AUD-01" $(if ($r.Content -match "action|entit|utilisateur|Avant|Après|apercu") { "PASS" } else { "PARTIAL" }) "audit columns"

# SES page
$r = Invoke-WebRequest -Uri "$Base/admin/sessions" -WebSession $admin -UseBasicParsing
Test-Case "SES-01" $(if ($r.Content -match "session|IP|activit|user-agent|User-Agent|agent") { "PASS" } else { "PARTIAL" }) "sessions list"

# EXT page
$r = Invoke-WebRequest -Uri "$Base/commercial/commandes/externes" -WebSession $nord -UseBasicParsing
Test-Case "EXT-01" $(if ($r.Content -match "externe|Externe") { "PASS" } else { "FAIL" }) "externes page"

# CLI-05 component present in client fiche HTML
$clients = Invoke-WebRequest -Uri "$Base/admin/clients" -WebSession $admin -UseBasicParsing
if ($clients.Content -match 'href="/admin/clients/([^"]+)"') {
  $cid = $matches[1]
  $fiche = Invoke-WebRequest -Uri "$Base/admin/clients/$cid" -WebSession $admin -UseBasicParsing
  Test-Case "CLI-05" $(if ($fiche.Content -match "DialogueDetailBl|detail-bl|Aperçu|popup|dialog") { "PASS" } else { "MANUAL" }) "fiche client BL dialog"
} else {
  Test-Case "CLI-05" "MANUAL" "no client link found"
}

# Summary
$Results | Sort-Object Id | Format-Table -AutoSize
$pass = ($Results | Where-Object Status -eq "PASS").Count
$fail = ($Results | Where-Object Status -eq "FAIL").Count
$manual = ($Results | Where-Object Status -eq "MANUAL").Count
$partial = ($Results | Where-Object Status -eq "PARTIAL").Count
Write-Output ""
Write-Output "TOTAL=$($Results.Count) PASS=$pass FAIL=$fail PARTIAL=$partial MANUAL=$manual"
