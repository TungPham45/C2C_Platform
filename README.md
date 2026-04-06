# Nền tảng C2C (C2C Platform)

Kho lưu trữ (repo) này là một Nx monorepo cho nền tảng demo C2C.

Các ứng dụng hiện tại:

- **Frontend**: `web` (React/Vite)
- **Edge**: `api-gateway` (NestJS)
- **Dịch vụ (Services)**: `auth-service`, `product-service`, `admin-moderation-service`

## 🏗️ Tổng quan về Kiến trúc (Architecture Overview)

Dự án này tuân theo Kiến trúc Microservices sử dụng Nx Monorepo.

- **Frontend (`web`)**: Một ứng dụng React giao tiếp duy nhất với `api-gateway`.
- **API Gateway**: Đóng vai trò là điểm đầu vào cho frontend. Nó điều hướng (proxy) các yêu cầu đến các microservices tương ứng.
- **Microservices**: Các dịch vụ NestJS độc lập, mỗi dịch vụ sở hữu cơ sở dữ liệu PostgreSQL riêng (được quản lý thông qua Prisma).
- **Thư viện (`libs`)**: Mã nguồn dùng chung, chẳng hạn như các Prisma client được tạo tự động và các kiểu dữ liệu (types) chung.

## 🚀 Hướng dẫn bắt đầu (Getting Started)

1.  **Điều kiện tiên quyết**: Đảm bảo bạn đã cài đặt Node.js 22, npm và Docker Desktop.
2.  **Cài đặt dependencies**: Chạy lệnh `npm install` tại thư mục gốc.
3.  **Hạ tầng (Infrastructure)**: Khởi động các cơ sở dữ liệu bằng lệnh `docker compose up -d postgres`.
4.  **Chạy các dịch vụ**: Mở các terminal riêng biệt và chạy các lệnh sau:
    - `npx nx serve auth-service`
    - `npx nx serve product-service`
    - `npx nx serve api-gateway`
    - `npx nx serve web`
5.  **Truy cập**: Mở trình duyệt tại [http://localhost:4200](http://localhost:4200). Đăng nhập với tài khoản: `seller@example.com` / mật khẩu: `123456`.

> [!NOTE]
> Trong lần chạy đầu tiên, script `init-multiple-db.sh` sẽ tự động xử lý việc tạo cơ sở dữ liệu, chạy migration và nạp dữ liệu mẫu (seeding).

## 🗄️ Tự động hóa Cơ sở dữ liệu (Database Automation)

Bạn **không cần** phải tạo cơ sở dữ liệu thủ công hay sử dụng pgAdmin để thiết lập dữ liệu ban đầu. Dự án này đã được tự động hóa hoàn toàn:

- **Tự động tạo Database**: Khi chạy `docker compose up -d postgres`, hệ thống sẽ tự động tạo đủ 5 database phục vụ cho các microservices.
- **Tự động chạy Migration**: Cấu trúc bảng (schema) từ Prisma sẽ được tự động áp dụng.
- **Tự động nạp dữ liệu mẫu (Seeding)**: Các tài khoản demo (Seller, Admin) và sản phẩm mẫu sẽ được chèn sẵn vào hệ thống.

### Cách "làm sạch" dữ liệu (Reset Database)
Nếu bạn muốn xóa sạch dữ liệu cũ và bắt đầu lại từ đầu với trạng thái "sạch", hãy chạy bộ lệnh sau:

```powershell
docker compose down -v
docker compose up -d postgres
```
*(Tham số `-v` sẽ xóa Volume dữ liệu của Docker, buộc hệ thống phải khởi chạy lại quy trình tự động hóa từ đầu).*

### Demo cho Admin (Tùy chọn)

Để chạy luồng dành cho admin, bạn cần chạy thêm dịch vụ `admin-moderation-service` cùng với một mã code nội bộ (internal token):

```powershell
$env:INTERNAL_SERVICE_TOKEN='internal-dev-token'
npx nx serve admin-moderation-service
```

## Luồng Demo Dự kiến

Các bước trải nghiệm demo hiện tại:

1. Mở trang web.
2. Đăng nhập thông qua `auth-service`.
3. Thông tin người bán (seller context) được lấy từ `product-service`.
4. Truy cập vào bảng điều khiển người bán (seller dashboard).
5. Mở phần quản lý sản phẩm.
6. Thực hiện tạo, chỉnh sửa, liệt kê và xóa sản phẩm.

Luồng này phụ thuộc vào:

- PostgreSQL đang chạy.
- Tài khoản người bán đã tồn tại trong `auth_db`.
- Người bán có một cửa hàng đang hoạt động trong `product_db`.

## Các lệnh Nx hữu ích

Xây dựng (build) một dịch vụ:

```powershell
npx nx build product-service
```

Hiển thị các project Nx đã đăng ký:

```powershell
npx nx show projects
```

Hiển thị thông tin chi tiết của một project:

```powershell
npx nx show project product-service
```

## Xử lý sự cố (Troubleshooting)

### Cổng (Port) đã bị chiếm dụng

Nếu `nx serve` thất bại với lỗi `EADDRINUSE`, nghĩa là một tiến trình khác đã sử dụng cổng đó.

Ví dụ:

- `3001` được sử dụng bởi `product-service`
- `3002` được sử dụng bởi `auth-service`

Hãy dừng tiến trình cũ và chạy lại dịch vụ.

### Lỗi import Prisma client khi chạy `nx serve`

Repo này sử dụng các Prisma client được tạo trong:

- `@prisma/client/auth`
- `@prisma/client/product`
- `@prisma/client/order`
- `@prisma/client/chat`
- `@prisma/client/admin-mod`

Đối với các dịch vụ Nest trong repo này, hãy sử dụng cách import tường minh như sau:

```ts
import { PrismaClient } from '@prisma/client/product/index.js';
```

Điều này giúp tránh lỗi không tìm thấy module khi chạy lệnh `nx serve`.

### Đăng nhập trả về lỗi `401 Unauthorized`

Điều này có nghĩa là hệ thống từ chối thông tin đăng nhập.

Luồng đăng nhập sẽ kiểm tra:

- Người dùng có tồn tại theo email hay không.
- Mật khẩu có khớp với mã hash bcrypt trong `auth_db` hay không.

Nếu phản hồi là `401 Invalid credentials`, lỗi thường không nằm ở gateway mà do thông tin đăng nhập sai.

## Ghi chú về Repo (Repo Notes)

- [Prisma schemas](./libs/prisma-clients)
- [Quy trình làm việc backend (Backend service workflow)](./service-module-workflow.md)
- [Ý tưởng sửa lỗi Microservices](./microservices-fix-ideas.txt)

## Các bản mẫu giao diện (UI Prototypes)

Các bản mẫu HTML/Tailwind chất lượng cao được sử dụng để tham khảo giao diện nằm trong thư mục [./prototypes](./prototypes). Bạn có thể xem các bản thiết kế mục tiêu tại đây trước khi chúng được tích hợp hoàn toàn vào các React component trong ứng dụng `web`.

- `seller_center.html`: Bản mẫu bảng điều khiển chính.
- `product_mgmt.html`: Bản mẫu quản lý kho hàng.
- `add_product.html`: Bản mẫu tạo sản phẩm mới.
