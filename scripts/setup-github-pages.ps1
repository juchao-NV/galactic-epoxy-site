<#
.SYNOPSIS
  Enables GitHub Pages (GitHub Actions / workflow build) and optionally pushes this repo.

.DESCRIPTION
  1) Calls the GitHub REST API so Pages uses build_type "workflow" (your pages.yml deploys dist/).
  2) If git is available, stages all changes, commits, and pushes to origin main.

  You must provide auth ONE of these ways:
    - Set environment variable:  $env:GITHUB_TOKEN = "ghp_...."   (classic PAT, repo scope)
    - Or install GitHub CLI, run `gh auth login`, then this script uses `gh auth token` automatically.

  Repo is hardcoded for this project: juchao-NV / galactic-epoxy-site
#>

$ErrorActionPreference = "Stop"
$owner = "juchao-NV"
$repo = "galactic-epoxy-site"
$api = "https://api.github.com/repos/$owner/$repo/pages"

function Get-GitHubToken {
  if ($env:GITHUB_TOKEN) { return $env:GITHUB_TOKEN }
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    $t = & gh auth token 2>$null
    if ($t) { return $t.Trim() }
  }
  return $null
}

$token = Get-GitHubToken
if (-not $token) {
  Write-Host @"
No GitHub token found.

Option A — Personal access token (classic):
  1) https://github.com/settings/tokens → Generate new token (classic)
  2) Enable scope: repo
  3) In PowerShell:
       `$env:GITHUB_TOKEN = 'paste_token_here'
       .\scripts\setup-github-pages.ps1

Option B — GitHub CLI:
       winget install GitHub.cli
       gh auth login
       .\scripts\setup-github-pages.ps1
"@
  exit 1
}

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "Checking existing Pages configuration..."
$exists = $false
try {
  Invoke-RestMethod -Uri $api -Headers $headers -Method Get | Out-Null
  $exists = $true
  Write-Host "Pages site already exists — switching build to GitHub Actions (workflow)..."
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 404) {
    Write-Host "No Pages site yet — creating with GitHub Actions (workflow)..."
  } else {
    throw
  }
}

# API accepts build_type workflow; source branch/path still required for create in many cases.
$bodyCreate = @{
  build_type = "workflow"
  source     = @{
    branch = "main"
    path   = "/"
  }
} | ConvertTo-Json -Depth 5

$bodyUpdate = @{
  build_type = "workflow"
} | ConvertTo-Json -Depth 5

if (-not $exists) {
  Invoke-RestMethod -Uri $api -Headers $headers -Method Post -Body $bodyCreate -ContentType "application/json"
  Write-Host "Pages created (workflow build)."
} else {
  try {
    Invoke-RestMethod -Uri $api -Headers $headers -Method Put -Body $bodyUpdate -ContentType "application/json"
    Write-Host "Pages updated to workflow build."
  } catch {
    # Some orgs/repos need explicit source on PUT; try with source
    $bodyUpdate2 = @{
      build_type = "workflow"
      source     = @{ branch = "main"; path = "/" }
    } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri $api -Headers $headers -Method Put -Body $bodyUpdate2 -ContentType "application/json"
    Write-Host "Pages updated to workflow build (with source)."
  }
}

Write-Host ""
Write-Host "Next: push your workflow + site if you have not already. Then open:"
Write-Host "  https://$owner.github.io/$repo/"
Write-Host ""

$git = @(
  (Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
  "C:\Program Files\Git\bin\git.exe",
  "C:\Program Files (x86)\Git\bin\git.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $git) {
  Write-Host "Git not found in PATH — skip push. Install Git for Windows, then:"
  Write-Host "  git add . && git commit -m `"Pages setup`" && git push origin main"
  exit 0
}

# Project root = parent of scripts/ (folder containing .github)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

if (-not (Test-Path .git)) {
  Write-Host "No .git in $root — skip push. Initialize remote repo first, then push."
  exit 0
}

$status = & $git status --porcelain
if ($status) {
  Write-Host "Staging and committing local changes..."
  & $git add .
  & $git commit -m "chore: sync site and Pages workflow"
}
Write-Host "Pushing to origin main..."
& $git push origin main
Write-Host "Done. Watch Actions: https://github.com/$owner/$repo/actions"
