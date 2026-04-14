param (
    [Parameter(Mandatory=$true, HelpMessage="Enter your Supabase Direct Connection String (ends with :5432/postgres)")]
    [string]$DirectDatabaseUrl
)

Write-Host "Setting up baseline connection for Prisma Migrations..." -ForegroundColor Cyan

$env:DATABASE_URL = $DirectDatabaseUrl
$env:DIRECT_DATABASE_URL = $DirectDatabaseUrl

Write-Host "Baseling the '0_init' migration (Marking existing database as the initial structural state)..." -ForegroundColor Yellow

npx prisma migrate resolve --applied 0_init

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✔ Success! Your Supabase database is now permanently configured for secure Migrations." -ForegroundColor Green
    Write-Host "You can now safely commit and push your code to Vercel." -ForegroundColor Green
} else {
    Write-Host "`n❌ Something went wrong linking the database." -ForegroundColor Red
}
