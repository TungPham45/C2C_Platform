# Các thay đổi chính đã thực hiện

## Mục tiêu

Chuyển project từ trạng thái:

- Docker chỉ chạy PostgreSQL
- các app còn lại phải chạy tay bằng `nx serve`

thành trạng thái:

- toàn bộ hệ thống chạy bằng đúng 1 lệnh Docker Compose

## Kết quả cuối cùng

Lệnh chuẩn mới là:

```powershell
docker compose up --build
```

Lệnh này sẽ dựng toàn bộ stack:

- `postgres`
- `auth-service`
- `product-service`
- `admin-moderation-service`
- `api-gateway`
- `web`

## Những thay đổi chính

### 1. Nâng `docker-compose.yml` thành full stack

Đã mở rộng `docker-compose.yml` để không còn chỉ chạy mỗi Postgres.

Đã thêm các service:

- `auth-service`
- `product-service`
- `admin-moderation-service`
- `api-gateway`
- `web`

Đã thêm:

- `healthcheck` cho Postgres
- `depends_on` để các service khởi động theo thứ tự hợp lý
- volume `product_uploads` để giữ ảnh upload

### 2. Thêm Dockerfile cho backend và frontend

Đã tạo:

- `docker/backend.Dockerfile`
- `docker/web.Dockerfile`
- `.dockerignore`

Ý nghĩa:

- backend services dùng chung một Dockerfile với `APP_NAME`
- frontend có Dockerfile riêng để build và chạy `vite preview`
- build context gọn hơn, tránh kéo cả `node_modules` local vào image

### 3. Sửa backend để chạy đúng trong Docker

Đã sửa các `PrismaService` để nhận:

- `DATABASE_URL` từ biến môi trường lúc runtime

Điều này là bắt buộc vì trong Docker:

- database không còn nằm ở `localhost`
- mà nằm ở service `postgres`

Đã sửa `api-gateway` để nhận upstream URLs từ env:

- `AUTH_SERVICE_URL`
- `PRODUCT_SERVICE_URL`
- `ADMIN_SERVICE_URL`
- `PRODUCT_PUBLIC_URL`

Đã thêm proxy `/uploads` qua gateway để browser chỉ cần đi qua cổng public của gateway.

Đã sửa `product-service` để URL ảnh upload trả về lấy từ:

- `PUBLIC_BASE_URL`

### 4. Sửa frontend để không hardcode API URL

Đã tạo:

- `apps/web/src/config/api.ts`

và chuyển các chỗ `fetch(...)` sang dùng:

- `VITE_API_BASE_URL`

Điều này giúp web có thể build trong Docker nhưng vẫn gọi API public đúng qua:

- `http://localhost:3000/api`

### 5. Cập nhật tài liệu

Đã cập nhật:

- `README.md`
- `docker-compose-explanation.md`

Nội dung mới tập trung vào:

- chạy full stack bằng Docker
- cách truy cập sau khi lên stack
- cách reset sạch dữ liệu
- cách compose hiện tại hoạt động

## Những gì người dùng khác cần làm bây giờ

Sau khi clone repo:

```powershell
docker compose up --build
```

Sau khi chạy xong:

- Web: `http://localhost:4200`
- API Gateway: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Ghi chú

Script `npm run setup` vẫn còn trong repo để phục vụ kiểu chạy local hybrid nếu cần:

- Docker chạy DB
- app chạy bằng Node trên host

Nhưng flow chính bây giờ là Docker full stack, không phải flow cũ nữa.
