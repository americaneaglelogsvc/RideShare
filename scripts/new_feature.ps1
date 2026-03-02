param(
    [Parameter(Mandatory = $true)]
    [string]$Slug,

    [string]$BaseBranch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "[new-feature] Starting for slug '$Slug'..." -ForegroundColor Cyan

# Ensure we are in a git repo
if (-not (Test-Path .git)) {
    Write-Error "This script must be run from the RideShare repo root."
    exit 1
}

# Fetch latest
Write-Host "[new-feature] Fetching latest from origin..." -ForegroundColor Gray
git fetch origin | Out-Null

# Checkout base branch and pull
Write-Host "[new-feature] Checking out '$BaseBranch' and pulling..." -ForegroundColor Gray
git checkout $BaseBranch
git pull origin $BaseBranch

# Create feature branch name with timestamp
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$branchName = "feat/$Slug-$ts"
Write-Host "[new-feature] Creating branch '$branchName'..." -ForegroundColor Gray

git checkout -b $branchName

# Run npm tests if package.json present
if (Test-Path "package.json") {
    Write-Host "[new-feature] Running npm test:requirements (if defined)..." -ForegroundColor Gray
    try {
        npm run test:requirements
    } catch {
        Write-Warning "npm run test:requirements failed or is undefined. Continuing."
    }

    Write-Host "[new-feature] Running npm test:foundation (if defined)..." -ForegroundColor Gray
    try {
        npm run test:foundation
    } catch {
        Write-Warning "npm run test:foundation failed or is undefined. Continuing."
    }
}

# Show git status and prompt for commit
Write-Host "[new-feature] Current git status:" -ForegroundColor Yellow
git status

Write-Host "[new-feature] Staging all changes in working tree..." -ForegroundColor Gray
git add .

# Commit
$commitMessage = "feat($Slug): automated feature batch"
Write-Host "[new-feature] Committing with message: $commitMessage" -ForegroundColor Gray

git commit -m $commitMessage

# Push branch
Write-Host "[new-feature] Pushing branch to origin..." -ForegroundColor Gray
git push -u origin $branchName

# Create PR via gh
Write-Host "[new-feature] Creating pull request via gh..." -ForegroundColor Gray
try {
    gh pr create --fill --base $BaseBranch --head $branchName
} catch {
    Write-Warning "gh pr create failed. Ensure GitHub CLI is installed and authenticated (gh auth login)."
}

Write-Host "[new-feature] Watching PR checks (if any)..." -ForegroundColor Gray
try {
    gh pr checks --watch
} catch {
    Write-Warning "gh pr checks --watch failed or no PR context."
}

Write-Host "[new-feature] Done." -ForegroundColor Green
