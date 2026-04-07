# Script tối giản để mở 5 terminal chạy dev
$Apps = @(
  "auth-service",
  "product-service",
  "admin-moderation-service",
  "api-gateway",
  "web"
)

foreach ($App in $Apps) {
  Write-Host "Đang mở terminal cho: $App" -ForegroundColor Cyan
  # Mở cửa sổ PowerShell mới, giữ lại terminal sau khi lệnh chạy xong (-NoExit)
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx nx serve $App"
}
