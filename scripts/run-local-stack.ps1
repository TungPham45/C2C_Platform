# Script tối giản để sync DB rồi mở terminal chạy dev
$ErrorActionPreference = "Stop"

$Apps = @(
  "auth-service",
  "product-service",
  "admin-moderation-service",
  "order-service",
  "api-gateway",
  "web"
)

Write-Host "Khoi dong PostgreSQL..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "Dong bo schema Prisma vao cac database..." -ForegroundColor Cyan
npm.cmd run db:sync

foreach ($App in $Apps) {
  Write-Host "Đang mở terminal cho: $App" -ForegroundColor Cyan
  # Mở cửa sổ PowerShell mới, giữ lại terminal sau khi lệnh chạy xong (-NoExit)
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx nx serve $App"
}
