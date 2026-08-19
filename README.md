# YOU_1_APP_SERVER

Backend API cho dịch vụ You-il, xây dựng bằng Node.js, Express và Sequelize với PostgreSQL.

## Công nghệ

- Node.js
- Express 5
- PostgreSQL
- Sequelize 6
- JWT access token và refresh token
- OTP gửi qua email bằng Nodemailer
- Joi, bcryptjs, Helmet, CORS, Morgan

## Yêu cầu

- Node.js 18+ và npm
- PostgreSQL đang chạy và có một database cho project
- Một tài khoản SMTP để gửi OTP khi đăng ký

## Cài đặt

Từ thư mục gốc của project:

```bash
npm install
```

Tạo file `.env` từ file mẫu:

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Mở `.env` và cập nhật tối thiểu các giá trị database, JWT và SMTP:

```dotenv
NODE_ENV=development
PORT=3000

DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=you_il
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DB_LOGGING=false

JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=45m
JWT_REFRESH_EXPIRES_IN_DAYS=7
COOKIE_CROSS_SITE=false

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-smtp-app-password
EMAIL_FROM_EMAIL=your-email@example.com
EMAIL_FROM_NAME=You-il

OTP_EXPIRES_IN_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
```

`EMAIL_PASSWORD` phải là mật khẩu SMTP hoặc app password tương ứng, không nên dùng mật khẩu tài khoản email chính nếu nhà cung cấp hỗ trợ app password.

## Chạy project

Chạy development mode, tự khởi động lại khi file JavaScript thay đổi:

```bash
npm run dev
```

Chạy bình thường:

```bash
npm start
```

Kiểm tra cú pháp các file JavaScript:

```bash
npm run check
```

Chạy test Node.js (hiện project chưa có test case riêng):

```bash
npm test
```

Sau khi khởi động, server mặc định ở `http://localhost:3000`.

## Database

Server chỉ kết nối PostgreSQL khi cả `DB_NAME`, `DB_USER` và `DB_HOST` được cấu hình. Nếu thiếu một trong các biến này, server vẫn khởi động nhưng các chức năng cần database sẽ không hoạt động.

- Development: Sequelize dùng `sync({ alter: true })` để cập nhật schema.
- Môi trường khác: Sequelize dùng `sync()`.
- Project hiện chưa có thư mục migration hoặc seeder; `.sequelizerc` chỉ định sẵn các đường dẫn dự kiến.
- Các bảng chính: `users`, `sessions`, `otp_verifications`.

## Kiểm tra nhanh

```bash
curl http://localhost:3000/health
```

Kết quả thành công có dạng:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

API root:

```bash
curl http://localhost:3000/api/v1/
```

## API authentication

Base URL: `http://localhost:3000/api/v1`

### Đăng ký

`POST /auth/register`

```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Password@123"
}
```

Mật khẩu dài 8-72 ký tự và phải có chữ hoa, chữ thường, chữ số và ký tự đặc biệt. Tài khoản mới có trạng thái `pending_verify`; server gửi OTP 6 chữ số qua email.

### Xác thực OTP đăng ký

`POST /auth/verify-otp`

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

OTP mặc định hết hạn sau 5 phút và tối đa 5 lần nhập sai. Khi xác thực thành công, tài khoản chuyển sang `active`, response trả access token và refresh token, đồng thời refresh token được đặt trong HTTP-only cookie `refreshToken`.

### Gửi lại OTP

`POST /auth/resend-otp`

```json
{
  "email": "user@example.com"
}
```

Mặc định phải chờ 60 giây giữa hai lần gửi lại.

### Đăng nhập

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

Tài khoản phải ở trạng thái `active`. Access token được dùng trong header:

```http
Authorization: Bearer <access-token>
```

### Làm mới access token

`POST /auth/refresh-token`

Refresh token được ưu tiên đọc từ cookie `refreshToken`. Nếu không dùng cookie, có thể gửi trong body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

Mỗi lần refresh, refresh token cũ bị thu hồi và token mới được tạo.

### Lấy thông tin tài khoản hiện tại

`GET /auth/me`

Yêu cầu header `Authorization: Bearer <access-token>`.

### Đăng xuất

`POST /auth/logout`

Yêu cầu access token. Refresh token được đọc từ cookie hoặc body và bị thu hồi.

### Đăng xuất trên mọi thiết bị

`POST /auth/logout-all`

Yêu cầu header `Authorization: Bearer <access-token>`. Tất cả session refresh token của user sẽ bị xóa.

## Format response

Response thành công do helper hiện tại tạo thường có dạng:

```json
{
  "data": {
    "success": true,
    "message": "Login successful",
    "user": {}
  }
}
```

Response lỗi có dạng:

```json
{
  "success": false,
  "message": "Validation error",
  "details": {
    "errors": ["Email is required"]
  }
}
```

Các mã lỗi thường gặp là `400` (validation/OTP), `401` (token hoặc thông tin đăng nhập), `403` (tài khoản chưa xác thực hoặc inactive), `404` (không tìm thấy user), `409` (email đã tồn tại) và `429` (vượt giới hạn OTP).

## Cấu trúc project

```text
src/
	app.js                         # Express app, middleware và route gốc
	server.js                      # Kết nối database và khởi động HTTP server
	config/                        # Env, Sequelize và Nodemailer
	core/middlewares/              # Auth, validation và error handler
	core/utils/                    # Helper response
	models/                        # Khởi tạo Sequelize và tự load model
	modules/auth/                  # Route, controller, service và OTP
	modules/users/                 # User model
```

## Lưu ý bảo mật

- Không commit `.env`; file này đã nằm trong `.gitignore`.
- Đổi `JWT_SECRET` mặc định trước khi deploy.
- Dùng HTTPS trong production để bảo vệ access token và cookie.
- Khi chạy production, đặt `NODE_ENV=production`; cookie refresh token khi đó được đặt `secure`.
- CORS hiện đang cho phép cấu hình mặc định của middleware `cors()` và chưa giới hạn origin theo môi trường.
