Saved local changes before re-pulling from Git.

Snapshot root:
- `temp/saved-changes-20260407-183927`

Files captured:
- `.gitignore`
- `README.md`
- `db/seeds/auth_db.sql`
- `db/seeds/admin_mod_db.sql`
- `db/seeds/product_db.sql`
- `db/seeds/chat_db.sql`
- `public/uploads/products/.gitkeep`

Suggested restore flow after pulling:
1. Pull or reclone the repo.
2. Copy the files from this snapshot back to the same relative paths.
3. If needed, reset Docker DB volume and bootstrap again:
   `docker compose down -v`
   `docker compose up --build`
