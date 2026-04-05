#!/bin/bash
set -e

echo "=== Creating multiple databases for C2C Platform ==="

DATABASES="auth_db product_db order_db admin_mod_db chat_db"

for db in $DATABASES; do
    echo "🔧 Creating database: $db"
    
    # Dùng createdb (không bị lỗi transaction block)
    createdb -U "$POSTGRES_USER" "$db" 2>/dev/null || echo "   → Database already exists"
    
    # Grant quyền
    psql -U "$POSTGRES_USER" -c "GRANT ALL PRIVILEGES ON DATABASE \"$db\" TO $POSTGRES_USER;" >/dev/null 2>&1 || true
doneđ

echo "✅ All databases created/verified successfully!"