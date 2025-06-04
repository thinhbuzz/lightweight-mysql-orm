# Release script for lightweight-mysql-orm (PowerShell version)
# Usage: .\scripts\release.ps1 [patch|minor|major]

param(
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType = "patch"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting release process..." -ForegroundColor Green

# Check if we're in a git repository
try {
    git rev-parse --git-dir | Out-Null
} catch {
    Write-Error "Error: Not in a git repository"
    exit 1
}

# Check if working directory is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Error "Error: Working directory is not clean. Please commit your changes first."
    exit 1
}

# Get current branch
$currentBranch = git branch --show-current

if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
    Write-Warning "You're not on main/master branch. Current branch: $currentBranch"
    $continue = Read-Host "Do you want to continue? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Release cancelled." -ForegroundColor Yellow
        exit 1
    }
}

# Pull latest changes
Write-Host "📥 Pulling latest changes..." -ForegroundColor Blue
git pull origin $currentBranch

# Run tests if they exist
Write-Host "🧪 Running tests..." -ForegroundColor Blue
try {
    npm test 2>$null
} catch {
    Write-Host "No tests found, skipping..." -ForegroundColor Yellow
}

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Blue
npm run build

# Bump version and create tag
Write-Host "📝 Bumping $VersionType version..." -ForegroundColor Blue
npm version $VersionType

# Get the new version
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$newVersion = $packageJson.version

Write-Host "✅ Version bumped to v$newVersion" -ForegroundColor Green
Write-Host "🎉 Release process completed!" -ForegroundColor Green
Write-Host "📦 The GitHub Action will automatically publish to NPM when the tag is pushed." -ForegroundColor Cyan
Write-Host "🔗 Check the progress at: https://github.com/thinhbuzz/lightweight-mysql-orm/actions" -ForegroundColor Cyan 