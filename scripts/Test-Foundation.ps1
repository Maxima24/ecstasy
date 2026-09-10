<#
.SYNOPSIS
    Foundation validation for the governance repository.

.DESCRIPTION
    Verifies that the governance foundation is structurally intact: required
    documents exist, the aggregate contract version is well formed, every
    relative Markdown link resolves, and the reusable templates still carry
    their required sections.

    Unfilled placeholders are reported as warnings rather than failures, so
    the foundation validates before the project brief has been completed.

    No external module dependencies. Runs on Windows PowerShell 5.1 and
    PowerShell 7+.

.PARAMETER Quiet
    Suppress per-check output and print only the summary.

.EXAMPLE
    pwsh -NoProfile -File scripts/Test-Foundation.ps1

.NOTES
    Surfaced as the "Foundation validation" check. See docs/GITHUB_SETUP.md.
#>
[CmdletBinding()]
param(
    [switch]$Quiet
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$script:Failures = New-Object 'System.Collections.Generic.List[string]'
$script:Warnings = New-Object 'System.Collections.Generic.List[string]'
$script:Passed = 0

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

function Get-RelativePath {
    param([Parameter(Mandatory)][string]$FullName)
    return $FullName.Substring($RepoRoot.Length).TrimStart('\', '/').Replace('\', '/')
}

Write-Detail 'Foundation validation'
Write-Detail "Repository root: $RepoRoot"
Write-Detail ''

# --------------------------------------------------------------------------
# 1. Required governance documents
# --------------------------------------------------------------------------
Write-Detail 'Required documents'

$requiredFiles = @(
    'README.md',
    'RULES.md',
    'CONTRIBUTING.md',
    'HANDOFF.md',
    'AGENTS.md',
    '.editorconfig',
    '.gitattributes',
    '.gitignore',
    'contracts/README.md',
    'contracts/VERSION',
    'docs/ARCHITECTURE.md',
    'docs/CONTRACTS.md',
    'docs/DECISIONS.md',
    'docs/GITHUB_SETUP.md',
    'docs/OWNERSHIP.md',
    'docs/PROJECT_BRIEF.md',
    'docs/QUALITY.md',
    'docs/WORKFLOW.md',
    'docs/templates/ADR.md',
    'docs/templates/FEATURE_SPEC.md',
    '.github/CODEOWNERS',
    '.github/pull_request_template.md',
    'scripts/Test-Policy.Tests.ps1',
    'scripts/Test-Foundation.ps1'
)

foreach ($relative in $requiredFiles) {
    $full = Join-Path $RepoRoot $relative
    Assert-That -Name "exists: $relative" -Condition (Test-Path -LiteralPath $full -PathType Leaf)
}

Write-Detail ''

# --------------------------------------------------------------------------
# 2. Aggregate contract version
# --------------------------------------------------------------------------
Write-Detail 'Contract version'

$versionPath = Join-Path $RepoRoot 'contracts/VERSION'
if (Test-Path -LiteralPath $versionPath -PathType Leaf) {
    $versionLines = @(Get-Content -LiteralPath $versionPath | Where-Object { $_.Trim() -ne '' })
    Assert-That -Name 'contracts/VERSION holds exactly one value' `
        -Condition ($versionLines.Count -eq 1) `
        -Because "found $($versionLines.Count) non-empty line(s)"

    if ($versionLines.Count -eq 1) {
        $version = $versionLines[0].Trim()
        Assert-That -Name "contracts/VERSION is semantic ($version)" `
            -Condition ($version -match '^\d+\.\d+\.\d+$') `
            -Because 'expected MAJOR.MINOR.PATCH per docs/CONTRACTS.md'
    }
}
else {
    Assert-That -Name 'contracts/VERSION readable' -Condition $false -Because 'file missing'
}

Write-Detail ''

# --------------------------------------------------------------------------
# 3. Relative Markdown links resolve
# --------------------------------------------------------------------------
Write-Detail 'Markdown links'

# Only our own Markdown. Dependency and build directories carry thousands of
# READMEs whose links point outside the package, and some contain characters
# that are not legal in a Windows path.
$excluded = '[\\/](\.git|node_modules|\.next|dist|build|coverage|out)[\\/]'

$markdownFiles = @(
    Get-ChildItem -LiteralPath $RepoRoot -Filter '*.md' -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch $excluded }
)

$linkPattern = [regex]'\[[^\]]*\]\(([^)]+)\)'
$brokenLinks = 0
$checkedLinks = 0

foreach ($file in $markdownFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($match in $linkPattern.Matches($content)) {
        $target = $match.Groups[1].Value.Trim()

        # External links, mail links, and pure in-page anchors are out of scope.
        if ($target -match '^(https?:|mailto:|#)') {
            continue
        }

        # Strip any anchor fragment; only the path portion is verified.
        $path = ($target -split '#', 2)[0]
        if ([string]::IsNullOrWhiteSpace($path)) {
            continue
        }

        $checkedLinks++

        # A link may contain characters that are not legal in a path. Treat that
        # as "does not resolve" rather than letting Test-Path throw.
        $exists = $false
        try {
            $resolved = Join-Path $file.DirectoryName $path
            $exists = Test-Path -LiteralPath $resolved
        }
        catch {
            $exists = $false
        }

        if (-not $exists) {
            $source = Get-RelativePath -FullName $file.FullName
            $brokenLinks++
            $script:Failures.Add("broken link in ${source}: $target")
            Write-Detail "  [FAIL] broken link in ${source}: $target"
        }
    }
}

if ($brokenLinks -eq 0) {
    $script:Passed++
    Write-Detail "  [PASS] all $checkedLinks relative link(s) resolve"
}

Write-Detail ''

# --------------------------------------------------------------------------
# 4. Templates keep their required sections
# --------------------------------------------------------------------------
Write-Detail 'Templates'

$templateRequirements = [ordered]@{
    'docs/templates/ADR.md'          = @('## Context', '## Decision', '## Consequences')
    'docs/templates/FEATURE_SPEC.md' = @('## Acceptance scenarios', '## Interface and data impact', '## Validation')
}

foreach ($relative in $templateRequirements.Keys) {
    $full = Join-Path $RepoRoot $relative
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        continue
    }
    $content = Get-Content -LiteralPath $full -Raw
    foreach ($heading in $templateRequirements[$relative]) {
        Assert-That -Name "$relative contains '$heading'" -Condition ($content -like "*$heading*")
    }
}

Write-Detail ''

# --------------------------------------------------------------------------
# 5. Placeholder reporting (advisory only)
# --------------------------------------------------------------------------
Write-Detail 'Placeholders (advisory)'

$placeholderPattern = [regex]'`\[[^\]]+\]`|@ORG/'
$placeholderFiles = @()

foreach ($file in $markdownFiles) {
    $source = Get-RelativePath -FullName $file.FullName

    # Templates are meant to stay full of placeholders.
    if ($source -match 'templates/') {
        continue
    }

    $content = Get-Content -LiteralPath $file.FullName -Raw
    $count = $placeholderPattern.Matches($content).Count
    if ($count -gt 0) {
        $placeholderFiles += "$source ($count)"
    }
}

if ($placeholderFiles.Count -gt 0) {
    Add-Warning "unfilled placeholders remain in: $($placeholderFiles -join ', ')"
}
else {
    $script:Passed++
    Write-Detail '  [PASS] no unfilled placeholders outside templates'
}

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
Write-Host ''
Write-Host "Foundation validation: $($script:Passed) passed, $($script:Failures.Count) failed, $($script:Warnings.Count) warning(s)."

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
