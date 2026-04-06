# Flow Docker hiện tại

## Lệnh chạy

Nếu máy đã có sẵn image/container cần thiết:

```powershell
docker compose up -d
```

Nếu máy mới hoặc vừa sửa Dockerfile/source và cần build lại:

```powershell
docker compose up --build
```

## Thứ tự khởi động

### 1. PostgreSQL khởi động trước

Service `postgres` được chạy đầu tiên từ image `postgres:15-alpine`.

Nó mount:

- `init-multiple-db.sh`
- `libs/prisma-clients`
- `db/seeds`

và dùng volume:

- `postgres_data`

### 2. Script init chạy ở lần khởi tạo đầu tiên

Khi volume database còn trống, `init-multiple-db.sh` sẽ tự động:

- tạo 5 database:
  - `auth_db`
  - `product_db`
  - `order_db`
  - `chat_db`
  - `admin_mod_db`
- chạy migration SQL từ `libs/prisma-clients/*/migrations`
- chạy seed từ `db/seeds/*.sql` nếu có file tương ứng

### 3. Backend services khởi động sau khi Postgres healthy

Các service backend được dựng sau khi `postgres` sẵn sàng:

- `auth-service`
- `product-service`
- `admin-moderation-service`

Các service này không kết nối DB qua `localhost`.

Chúng dùng `DATABASE_URL` trỏ đến service:

- `postgres:5432`

### 4. API Gateway khởi động

Sau khi các backend chính đã lên, `api-gateway` khởi động.

Gateway proxy các route:

- `/api/auth` -> `auth-service`
- `/api/products` -> `product-service`
- `/api/admin` -> `admin-moderation-service`
- `/uploads` -> `product-service`

Điều này giúp frontend chỉ cần gọi một đầu mối duy nhất là gateway.

### 5. Frontend khởi động

Service `web` khởi động sau `api-gateway`.

Frontend gọi API qua:

- `http://localhost:3000/api`

Frontend public ở:

- `http://localhost:4200`

## Các URL sau khi hệ thống chạy

- Web: `http://localhost:4200`
- API Gateway: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Dữ liệu được giữ ở đâu

### Volume `postgres_data`

Lưu dữ liệu database PostgreSQL.

Nếu restart container mà không xóa volume:

- dữ liệu vẫn còn
- script init không chạy lại từ đầu

### Volume `product_uploads`

Lưu ảnh upload của `product-service`.

Nếu restart container mà không xóa volume:

- ảnh vẫn còn

## Các lệnh nên dùng

### Bật stack khi đã có sẵn image

```powershell
docker compose up -d
```

### Bật stack và build lại image

```powershell
docker compose up --build
```

### Chỉ bật lại container đã tồn tại

```powershell
docker compose start
```

### Xem trạng thái container

```powershell
docker compose ps
```

### Xem log

```powershell
docker compose logs -f
```

### Dừng stack

```powershell
docker compose stop
```

### Xóa container/network của stack

```powershell
docker compose down
```

### Reset sạch dữ liệu

```powershell
docker compose down -v
```

Lệnh này sẽ xóa luôn volume, bao gồm:

- `postgres_data`
- `product_uploads`

## Tóm tắt ngắn

Flow Docker hiện tại là:

1. `postgres` lên trước
2. script init tạo DB + migration + seed
3. backend services kết nối nội bộ qua tên service Docker
4. `api-gateway` gom toàn bộ API public
5. `web` gọi gateway và public ra `localhost:4200`

Lệnh mặc định nên dùng trên máy đã có sẵn thiết lập là:

```powershell
docker compose up -d
```
