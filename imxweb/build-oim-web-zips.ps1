[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [string]$OutputDir = 'C:\oim-web-zips'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projects = @(
    'qbm',
    'qer',
    'tsb',
    'att',
    'rms',
    'aad',
    'aob',
    'uci',
    'cpl',
    'dpr',
    'rmb',
    'rps',
    'o3t',
    'olg',
    'hds',
    'pol',
    'qer-app-portal',
    'qbm-app-landingpage',
    'qer-app-operationssupport',
    'qer-app-pwdportal',
    'custom-app'
)

function Assert-CommandAvailable {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    & $Action
}

function Invoke-NpmBuild {
    param([Parameter(Mandatory = $true)][string]$Project)

    Write-Host "Building $Project ..." -ForegroundColor Yellow
    & npm run build $Project
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed for project '$Project' with exit code $LASTEXITCODE."
    }
}

function New-OimZip {
    param(
        [Parameter(Mandatory = $true)][string]$Project,
        [Parameter(Mandatory = $true)][string]$DestinationRoot
    )

    $distPath = Join-Path -Path (Get-Location) -ChildPath "dist\$Project"
    if (-not (Test-Path -LiteralPath $distPath -PathType Container)) {
        throw "Expected build output folder not found: $distPath"
    }

    $zipPath = Join-Path -Path $DestinationRoot -ChildPath "Html_$Project.zip"
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    $items = Join-Path -Path $distPath -ChildPath '*'
    Compress-Archive -Path $items -DestinationPath $zipPath -CompressionLevel Optimal -Force

    $zipFile = Get-Item -LiteralPath $zipPath
    Write-Host ("Created {0} ({1:N2} MB)" -f $zipFile.FullName, ($zipFile.Length / 1MB)) -ForegroundColor Green
    return $zipFile
}

Invoke-Step 'Checking prerequisites' {
    Assert-CommandAvailable -Name 'git'
    Assert-CommandAvailable -Name 'npm'
    Assert-CommandAvailable -Name 'Compress-Archive'

    if (-not (Test-Path -LiteralPath 'package.json' -PathType Leaf)) {
        throw 'package.json not found. Run this script from the imxweb workspace folder.'
    }

    if (-not (Test-Path -LiteralPath 'angular.json' -PathType Leaf)) {
        throw 'angular.json not found. Run this script from the imxweb workspace folder.'
    }
}

$branch = (& git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = (& git describe --tags --exact-match 2>$null).Trim()
}
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = (& git rev-parse --short HEAD).Trim()
}

Write-Host "Current git state: $branch" -ForegroundColor Magenta
Write-Host "Output directory: $OutputDir" -ForegroundColor Magenta

Invoke-Step 'Preparing output directory' {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

if (-not $SkipInstall) {
    Invoke-Step 'Installing npm packages' {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }
} else {
    Write-Host "Skipping npm install because -SkipInstall was provided." -ForegroundColor Yellow
}

$createdZips = New-Object System.Collections.Generic.List[System.IO.FileInfo]

foreach ($project in $projects) {
    Invoke-Step "Building $project" {
        Invoke-NpmBuild -Project $project
    }

    Invoke-Step "Creating Html_$project.zip" {
        $zip = New-OimZip -Project $project -DestinationRoot $OutputDir
        $createdZips.Add($zip)
    }
}

Write-Host ""
Write-Host 'Done. Created ZIP files:' -ForegroundColor Green
$createdZips | Sort-Object Name | ForEach-Object {
    Write-Host (" - {0}" -f $_.FullName)
}

Write-Host ""
Write-Host 'Next manual steps:' -ForegroundColor Cyan
Write-Host ' 1. Import the Html_*.zip files with One Identity Software Loader.'
Write-Host ' 2. Assign machine role: Business API Server.'
Write-Host ' 3. Recycle/restart the API Server app pool.'
Write-Host ' 4. Test the DEV portal with a clean browser cache.'
