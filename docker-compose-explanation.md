# Giải thích `docker-compose.yml`

File đang được giải thích:

- `C:\Users\admin\Desktop\C2C_Platform\c2c-platform\docker-compose.yml`

## 1. File này bây giờ làm gì?

`docker-compose.yml` hiện không còn chỉ dựng mỗi PostgreSQL nữa.

Nó đã được đổi sang kiểu **full stack**, nghĩa là chỉ cần chạy:

```powershell
docker compose up --build
```

là Docker sẽ:

1. build image cho các app
2. khởi động database
3. khởi động các backend services
4. khởi động API Gateway
5. khởi động frontend

Các service được dựng gồm:

- `postgres`
- `auth-service`
- `product-service`
- `admin-moderation-service`
- `api-gateway`
- `web`

## 2. Ý tưởng kiến trúc của file Compose này

Compose này chạy theo mô hình:

- `postgres` là database server chung
- mỗi microservice dùng một database logic riêng bên trong PostgreSQL
- các backend gọi nhau qua **tên service Docker**, không gọi `localhost`
- frontend gọi API công khai qua `http://localhost:3000`
- browser truy cập giao diện qua `http://localhost:4200`

## 3. Các service hoạt động ra sao

### `postgres`

Service này dùng image:

```yaml
image: postgres:15-alpine
```

Nó có 3 vai trò:

- chạy PostgreSQL
- lưu dữ liệu bằng volume `postgres_data`
- chạy script `init-multiple-db.sh` trong lần khởi tạo đầu tiên

Script init sẽ:

- tạo 5 database:
  - `admin_mod_db`
  - `auth_db`
  - `chat_db`
  - `order_db`
  - `product_db`
- apply migration SQL từ `libs/prisma-clients/*/migrations`
- seed dữ liệu từ `db/seeds/*.sql` nếu file tồn tại

Service này còn có `healthcheck`:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
```

để các backend chỉ khởi động sau khi Postgres thật sự sẵn sàng.

### `auth-service`

Service này được build từ:

- `docker/backend.Dockerfile`

với `APP_NAME=auth-service`.

Biến môi trường quan trọng:

- `PORT=3002`
- `DATABASE_URL=postgresql://postgres:123456@postgres:5432/auth_db`

Điểm quan trọng ở đây là:

- host database không còn là `localhost`
- nó là `postgres`, tức tên service Docker

### `product-service`

Service này cũng build từ `docker/backend.Dockerfile`, với `APP_NAME=product-service`.

Biến môi trường chính:

- `PORT=3001`
- `DATABASE_URL=postgresql://postgres:123456@postgres:5432/product_db`
- `PUBLIC_BASE_URL=http://localhost:3000`

`PUBLIC_BASE_URL` được dùng để tạo URL ảnh upload trả về cho frontend.

Ví dụ:

- product-service lưu file tại container của nó
- nhưng URL trả ra sẽ là `http://localhost:3000/uploads/...`
- browser gọi URL đó qua `api-gateway`

Ngoài ra service này dùng volume:

```yaml
- product_uploads:/app/public/uploads/products
```

để ảnh upload không bị mất khi container restart.

### `admin-moderation-service`

Service này build từ `docker/backend.Dockerfile` với `APP_NAME=admin-moderation-service`.

Biến môi trường chính:

- `PORT=3005`
- `DATABASE_URL=postgresql://postgres:123456@postgres:5432/admin_mod_db`
- `AUTH_SERVICE_BASE_URL=http://auth-service:3002/api/auth`
- `PRODUCT_SERVICE_BASE_URL=http://product-service:3001/api/products`

Nghĩa là admin service gọi nội bộ sang auth và product bằng tên service Docker:

- `auth-service`
- `product-service`

chứ không dùng `localhost`.

### `api-gateway`

Service này build từ `docker/backend.Dockerfile` với `APP_NAME=api-gateway`.

Nó là điểm vào công khai cho API.

Port public:

- `3000:3000`

Gateway proxy các route sau:

- `/api/auth` -> `auth-service`
- `/api/products` -> `product-service`
- `/api/admin` -> `admin-moderation-service`
- `/uploads` -> `product-service/uploads`

Đây là điểm rất quan trọng:

- frontend không cần biết địa chỉ container nội bộ
- browser chỉ cần gọi `http://localhost:3000`
- gateway sẽ chuyển tiếp request đến đúng service

### `web`

Service này build từ:

- `docker/web.Dockerfile`

Port public:

- `4200:4200`

Frontend được build với biến:

- `VITE_API_BASE_URL=http://localhost:3000/api`

nên mọi lệnh `fetch` của frontend sẽ đi qua gateway.

## 4. Dockerfile hoạt động thế nào

### `docker/backend.Dockerfile`

Dockerfile backend dùng chung cho:

- `auth-service`
- `product-service`
- `admin-moderation-service`
- `api-gateway`

Nó làm các bước chính:

1. copy source code vào image
2. chạy `npm ci --ignore-scripts`
3. chạy `npm run prisma:generate`
4. chạy `npx nx build <APP_NAME>`
5. chạy file build ở `dist/apps/<APP_NAME>/main.js`

Ý nghĩa:

- mỗi service backend có image riêng
- nhưng dùng chung một Dockerfile
- khác nhau ở biến build `APP_NAME`

### `docker/web.Dockerfile`

Dockerfile frontend:

1. copy source code
2. chạy `npm ci --ignore-scripts`
3. build web bằng Vite
4. chạy `vite preview` trên port `4200`

## 5. Luồng khởi động thực tế

Khi chạy:

```powershell
docker compose up --build
```

thứ tự logic sẽ là:

1. Docker build image cho backend và web
2. Docker khởi động `postgres`
3. PostgreSQL chạy `init-multiple-db.sh` ở lần đầu
4. database, migration, seed được tạo xong
5. `auth-service`, `product-service`, `admin-moderation-service` khởi động
6. `api-gateway` khởi động và proxy request sang các backend
7. `web` khởi động
8. người dùng mở `http://localhost:4200`

## 6. Vì sao phải sửa code chứ không chỉ sửa Compose?

Vì trước đó project đang chạy theo kiểu local host:

- service gọi DB qua `localhost:5432`
- gateway gọi service khác qua `localhost:3001`, `localhost:3002`, `localhost:3005`
- frontend gọi API cứng vào `http://localhost:3000`

Trong Docker, `localhost` bên trong container là **chính container đó**, không phải máy host và cũng không phải container khác.

Nên để Docker chạy đúng, đã phải sửa:

- Prisma runtime để nhận `DATABASE_URL` từ env
- gateway để nhận upstream URL từ env
- admin service dùng env cho upstream nội bộ
- frontend gom API base URL về `VITE_API_BASE_URL`
- product service trả URL ảnh qua gateway public URL

## 7. Các volume trong file này

### `postgres_data`

Dùng để giữ dữ liệu PostgreSQL giữa các lần restart container.

Nếu volume này còn:

- dữ liệu DB còn
- script init không chạy lại từ đầu

### `product_uploads`

Dùng để giữ ảnh upload của `product-service`.

Nếu volume này còn:

- ảnh sản phẩm vẫn còn sau khi restart container

## 8. Khi nào cần reset sạch?

Nếu muốn xóa sạch toàn bộ dữ liệu database và upload:

```powershell
docker compose down -v
docker compose up --build
```

`-v` sẽ xóa cả volume:

- `postgres_data`
- `product_uploads`

## 9. Người dùng cuối cần nhớ gì?

Lệnh chạy chuẩn:

```powershell
docker compose up --build
```

URL sau khi chạy:

- Frontend: `http://localhost:4200`
- API Gateway: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

Tài khoản demo:

- `seller@example.com` / `123456`
- `admin@example.com` / `123456`

## 10. Tóm tắt ngắn

`docker-compose.yml` hiện tại là file điều phối toàn bộ stack local.

Nó:

- dựng Postgres
- tự tạo nhiều database
- dựng toàn bộ backend
- dựng frontend
- nối các service bằng network nội bộ Docker
- cho người dùng chỉ cần một lệnh để chạy hệ thống

Lệnh đó là:

```powershell
docker compose up --build
```
