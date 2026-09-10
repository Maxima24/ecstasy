<#
.SYNOPSIS
    Repository policy checks for branch, path, and secret discipline.

.DESCRIPTION
    Enforces the mechanically checkable rules in RULES.md:

      * permanent branch path boundaries (RULES.md section 3);
      * short-lived branch naming (RULES.md section 4);
      * no credential-shaped files committed (RULES.md section 2).

    These checks stay in force during Hackathon Mode. The time-boxed
    exception in RULES.md section 10 relaxes review ceremony, never path
    discipline or secret handling.

    No external module dependencies. Runs on Windows PowerShell 5.1 and
    PowerShell 7+.

.PARAMETER Branch
    Branch name to evaluate. Defaults to the current Git branch. Continuous
    integration should pass the head branch explicitly, because a pull-request
    checkout is a detached merge commit.

.PARAMETER Quiet
    Suppress per-check output and print only the summary.

.EXAMPLE
    pwsh -NoProfile -File scripts/Test-Policy.Tests.ps1

.EXAMPLE
    pwsh -NoProfile -File scripts/Test-Policy.Tests.ps1 -Branch feat/frontend/42-login-form

.NOTES
    Surfaced as the "Repository policy" check. See docs/GITHUB_SETUP.md.
#>
[CmdletBinding()]
param(
    [string]$Branch,
    [switch]$Quiet
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$script:Failures = New-Object 'System.Collections.Generic.List[string]'
$script:Warnings = New-Object 'System.Collections.Generic.List[string]'
$script:Passed = 0

$PermanentBranches = @('main', 'frontend', 'backend', 'integration')
$ProductRoots = @('frontend', 'backend', 'integration')

function Write-Detail {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host $Message
    }
}

function Assert-That {
    param(
        [Parameter(Mandatory)][string]$Name,
        [bool]$Condition,
        [string]$Because = ''
    )
    if ($Condition) {
        $script:Passed++
        Write-Detail "  [PASS] $Name"
        return
    }
    $detail = $Name
    if ($Because) {
        $detail = "$Name -- $Because"
    }
    $script:Failures.Add($detail)
    Write-Detail "  [FAIL] $detail"
}

function Add-Warning {
    param([Parameter(Mandatory)][string]$Message)
    $script:Warnings.Add($Message)
    Write-Detail "  [WARN] $Message"
}

Write-Detail 'Repository policy'
Write-Detail "Repository root: $RepoRoot"

# --------------------------------------------------------------------------
# Collect tracked files
# --------------------------------------------------------------------------
$gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if (-not $gitAvailable) {
    Write-Host 'Repository policy: SKIPPED (git is not available on PATH).'
    exit 0
}

Push-Location $RepoRoot
try {
    $trackedFiles = @(git ls-files 2>$null)
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Repository policy: SKIPPED (not a Git working tree).'
        exit 0
    }

    if (-not $Branch) {
        $Branch = (git rev-parse --abbrev-ref HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or -not $Branch) {
            $Branch = 'HEAD'
        }
        $Branch = $Branch.Trim()
    }
}
finally {
    Pop-Location
}

Write-Detail "Branch under evaluation: $Branch"
Write-Detail "Tracked files: $($trackedFiles.Count)"
Write-Detail ''

if ($Branch -eq 'HEAD') {
    Add-Warning 'detached HEAD: branch-scoped checks were skipped. Pass -Branch explicitly in CI.'
}

# --------------------------------------------------------------------------
# 1. Branch naming
# --------------------------------------------------------------------------
Write-Detail 'Branch naming'

$isPermanent = $PermanentBranches -contains $Branch
$namePattern = '^(feat|fix|hotfix|chore|refactor|test|docs)/(governance|frontend|backend|integration)/\d+-[a-z0-9]+(-[a-z0-9]+)*$'
$scope = $null

if ($isPermanent) {
    $script:Passed++
    Write-Detail "  [PASS] '$Branch' is a permanent branch"
}
elseif ($Branch -eq 'HEAD') {
    Write-Detail '  [SKIP] detached HEAD'
}
else {
    Assert-That -Name "short-lived branch '$Branch' matches <type>/<scope>/<issue>-<slug>" `
        -Condition ($Branch -match $namePattern) `
        -Because 'see RULES.md section 4'

    # A branch named frontend/... or backend/... collides with the permanent ref.
    foreach ($root in @('frontend', 'backend')) {
        Assert-That -Name "'$Branch' does not shadow the permanent '$root' ref" `
            -Condition (-not $Branch.StartsWith("$root/")) `
            -Because 'Git cannot store a ref and a ref directory of the same name'
    }

    if ($Branch -match $namePattern) {
        $scope = ($Branch -split '/')[1]
    }
}

Write-Detail ''

# --------------------------------------------------------------------------
# 2. Path discipline
# --------------------------------------------------------------------------
Write-Detail 'Path discipline'

# Which product directory may this branch legitimately contain?
$allowedRoots = @()
switch ($Branch) {
    'main' { $allowedRoots = @() }
    'frontend' { $allowedRoots = @('frontend') }
    'backend' { $allowedRoots = @('backend') }
    'integration' { $allowedRoots = $ProductRoots }
    default {
        if ($Branch -eq 'HEAD') {
            $allowedRoots = $ProductRoots
        }
        elseif ($scope -eq 'governance') {
            $allowedRoots = @()
        }
        elseif ($scope -eq 'integration') {
            $allowedRoots = $ProductRoots
        }
        elseif ($scope) {
            $allowedRoots = @($scope)
        }
        else {
            # Unrecognised branch name: do not double-report the naming failure.
            $allowedRoots = $ProductRoots
        }
    }
}

foreach ($root in $ProductRoots) {
    $offending = @($trackedFiles | Where-Object { $_ -like "$root/*" })
    $permitted = $allowedRoots -contains $root

    if ($permitted -or $offending.Count -eq 0) {
        $script:Passed++
        if ($permitted) {
            Write-Detail "  [PASS] '$root/' permitted on '$Branch' ($($offending.Count) file(s))"
        }
        else {
            Write-Detail "  [PASS] no '$root/' content on '$Branch'"
        }
        continue
    }

    $sample = ($offending | Select-Object -First 3) -join ', '
    Assert-That -Name "'$root/' must not exist on '$Branch'" `
        -Condition $false `
        -Because "$($offending.Count) tracked file(s), e.g. $sample"
}

Write-Detail ''

# --------------------------------------------------------------------------
# 3. Committed secrets
# --------------------------------------------------------------------------
Write-Detail 'Secret discipline'

$secretPatterns = @('*.pem', '*.key', '.env', '*/.env')
$secretHits = @()

foreach ($pattern in $secretPatterns) {
    $secretHits += @($trackedFiles | Where-Object { $_ -like $pattern })
}

# .env.example is explicitly allowed by .gitignore.
$secretHits += @(
    $trackedFiles | Where-Object {
        ($_ -like '.env.*' -or $_ -like '*/.env.*') -and $_ -notlike '*.env.example'
    }
)

$secretHits = @($secretHits | Sort-Object -Unique)

Assert-That -Name 'no credential-shaped files are tracked' `
    -Condition ($secretHits.Count -eq 0) `
    -Because "found: $($secretHits -join ', ')"

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
Write-Host ''
Write-Host "Repository policy: $($script:Passed) passed, $($script:Failures.Count) failed, $($script:Warnings.Count) warning(s)."

if ($script:Warnings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Warnings:'
    foreach ($warning in $script:Warnings) {
        Write-Host "  - $warning"
    }
}

if ($script:Failures.Count -gt 0) {
    Write-Host ''
    Write-Host 'Failures:'
    foreach ($failure in $script:Failures) {
        Write-Host "  - $failure"
    }
    exit 1
}

exit 0
