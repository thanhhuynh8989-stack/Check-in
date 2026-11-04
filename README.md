# 📋 Check-in PWA System

Hệ thống điểm danh thời gian thực theo mô hình Progressive Web App (PWA) kết hợp Google Apps Script & Google Sheets. Hệ thống tích hợp xác thực thiết bị 1-1, kiểm tra bán kính vị trí GPS (Haversine), mã QR xoay vòng TOTP 30 giây chống gian lận và tự động đồng bộ dữ liệu điểm danh.

---

## 🌟 Tính Năng Nổi Bật

- **Không cần cài đặt ứng dụng:** Hoạt động trực tiếp trên trình duyệt di động (iOS Safari / Android Chrome), hỗ trợ thêm vào Màn hình chính (PWA).
- **Xác thực thiết bị 1-1 (Anti-spoofing):** Gắn cố định 1 tài khoản người dùng với 1 thiết bị duy nhất thông qua chuỗi HMAC token và Device ID.
- **Mã QR xoay vòng 30s:** Mã QR điểm danh thay đổi tự động mỗi 30 giây dựa trên TOTP, chống việc chụp ảnh QR gửi cho người ở xa.
- **Geofencing GPS:** Kiểm tra khoảng cách Haversine giữa vị trí người ra lệnh và vị trí người điểm danh. Chặn tự động nếu vượt quá bán kính (mặc định 50m).
- **Hỗ trợ Custom Google Sheet:** Cho phép Leader dán link Google Sheet riêng để lưu dữ liệu điểm danh độc lập. Hệ thống có cơ chế tự phục hồi (Self-healing) cấu trúc Tab `Attendance`.
- **Thẻ Ticket ID đối soát:** Cấp mã Ticket ID ngay lập tức cho người điểm danh thành công kèm chi tiết thời gian và số phút trễ.

---

## 📁 Sơ Đồ Thư Mục Dự Án

```text
Check-in/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD tự động deploy PWA
├── docs/
│   └── PLAN.md                 # Tài liệu kế hoạch chi tiết hệ thống
├── src/
│   ├── frontend/               # Mã nguồn PWA Frontend
│   │   ├── index.html          # Giao diện chính Member (Xác thực, Quét QR & Lịch sử)
│   │   ├── leader.html         # Dashboard Leader (Khởi tạo phiên & Hiển thị QR xoay vòng)
│   │   ├── register-leader.html# Trang đăng ký tài khoản Leader & Khởi tạo nhóm mới
│   │   ├── admin.html          # Dashboard Admin (Duyệt Leader & Reset thiết bị đổi máy)
│   │   ├── css/
│   │   │   └── style.css       # Style giao diện tối ưu di động
│   │   └── js/
│   │       ├── app.js          # Logic PWA chính, QR Camera, GPS & API Connector
│   │       ├── leader-auth.js  # Logic Đăng ký Leader & Gửi thông tin Nhóm
│   │       └── admin.js        # Logic Duyệt tài khoản & Reset Mã kích hoạt
│   └── backend/                # Mã nguồn Google Apps Script Backend
│       ├── Code.gs             # Entry points: doGet(), doPost()
│       ├── Config.gs           # Hằng số cấu hình hệ thống
│       ├── Setup.gs            # Script tự động khởi tạo 7 Tab Master Sheet
│       ├── Auth.gs             # Xử lý Token HMAC & Đăng ký thiết bị 1-1
│       ├── SessionManager.gs   # Quản lý phiên, Toán Haversine GPS & Mã QR TOTP 30s
│       ├── SheetService.gs     # Đọc/Ghi dữ liệu Google Sheet & Self-healing Header
│       ├── LeaderService.gs    # Quản lý tài khoản Leader & Nhóm
│       └── AdminService.gs     # Phê duyệt Leader & Khôi phục thiết bị cho Member
└── README.md                   # Tài liệu hướng dẫn thiết lập & sử dụng
