# 📋 Kế Hoạch Triển Khai Hệ Thống Điểm Danh Bằng QR Code & GPS (Check-in)

Dự án phát triển ứng dụng web dạng PWA (Progressive Web App) hỗ trợ điểm danh thời gian thực, xác thực thiết bị 1-1, kiểm tra bán kính GPS, chống gian lận bằng mã QR xoay vòng và tự động lưu trữ dữ liệu về Google Sheets (Master Sheet hoặc Sheet riêng của Leader).

---

## 🏗️ 1. Kiến Trúc Tổng Thể

- **Frontend:** PWA viết bằng HTML/JS thuần (không cần build step), host miễn phí trên **GitHub Pages**. Hỗ trợ camera quét QR code, lưu bộ nhớ cục bộ `localStorage` cho Token & Lịch sử điểm danh.
- **Backend:** **Google Apps Script (Web App)** đóng vai trò làm REST API engine, xử lý xác thực HMAC, kiểm tra bán kính Haversine, quản lý cache phiên và ghi dữ liệu về Google Sheets.
- **Dữ liệu:**
  - **Master Sheet:** Quản lý tập trung Roster (danh sách nhân sự), danh sách Groups, Staff/Leader và làm kho lưu dữ liệu điểm danh mặc định.
  - **Custom Sheet (Sheet riêng của Leader):** Tùy chọn cho phép Leader dán link Google Sheet riêng. Backend tự động kiểm tra quyền ghi và tự tạo cấu hình Tab `Attendance` nếu tab chưa đúng định dạng.
- **Dự phòng chịu tải (Fallback Scale):** Khi kiểm thử tải vượt quá giới hạn concurrent executions (~30 req/s) của Apps Script, chuyển lớp tiếp nhận điểm danh sang **Firebase Realtime Database (Free Tier)** và dùng Apps Script Time-driven Trigger để sync về Google Sheet.

---

## 📊 2. Cấu Trúc Google Sheets

### 2.1. Master Sheet (Sheet Trung Tâm)

1. **Tab `Roster`** (Danh sách thành viên):
   - `MãNgười` (Primary Key - Mã NV/Học sinh: e.g. `NV001`, `HS102`)
   - `HọTên`
   - `HashMãKíchHoạt` (Chuỗi mã 8 ký tự `X7K2-M9P4` đã hash)
   - `DeviceID` (Gắn định danh thiết bị sau khi kích hoạt thành công)
   - `TrạngThái` (`ACTIVE` / `BLOCKED`)

2. **Tab `Groups`** (Quản lý nhóm):
   - `MãNhóm`
   - `TênNhóm`
   - `EmailLeader`
   - `CustomSheetURL` (Link Google Sheet riêng nếu có)
   - `CustomSheetStatus` (`ACTIVE` / `ERROR`)

3. **Tab `Members`** (Phân bổ thành viên - Quan hệ N-N):
   - `MãNhóm`
   - `MãNgười`

4. **Tab `Staff`** (Danh sách Leader & Admin):
   - `Email` (Tài khoản Google)
   - `VaiTrò` (`ADMIN` / `LEADER`)

5. **Tab `Sessions`** (Lịch sử các phiên điểm danh):
   - `MãPhiên` (UUID / Timestamp)
   - `MãNhóm`
   - `EmailLeader`
   - `ThờiĐiểmStart`
   - `HạnChót`
   - `TrễTốiĐa` (Phút)
   - `Lat` | `Lng` (Tọa độ mốc lúc Start)
   - `BánKínhMặcĐịnh` (m - 20/50/100/200m)
   - `TrạngThái` (`OPEN` / `CLOSED`)

6. **Tab `Attendance`** (Bản ghi điểm danh mặc định):
   - `MãGiaoDịch` (Ticket ID: e.g. `CHK-20261104-XXXX`)
   - `ThờiĐiểmĐiểmDanh`
   - `MãPhiên`
   - `MãNhóm`
   - `MãNgười`
   - `HọTên`
   - `Lat` | `Lng` | `SaiSốGPS`
   - `KhoảngCách` (m)
   - `PhútTrễ` (Làm tròn xuống, 0 nếu đúng giờ)
   - `CờCảnhBáo` (`NONE` / `HIGH_GPS_ERROR` / `MANUAL_APPROVED`)
   - `TrạngThái` (`SUCCESS` / `REJECTED`)

7. **Tab `Rejected`** (Danh sách bị hệ thống từ chối - Chờ duyệt thủ công):
   - `ThờiĐiểm` | `MãPhiên` | `MãNgười` | `LýDoTừChối` | `TrạngTháiDuyệt`

### 2.2. Custom Sheet (Sheet Riêng của Leader)
- Tên Tab cố định: **`Attendance`**
- Cấu trúc cột trùng khớp 100% với tab `Attendance` trên Master Sheet.
- **Cơ chế tự phục hồi (Self-healing):** Khi Backend phát hiện tab `Attendance` bị lỡ xóa hoặc đổi tên cột sai định dạng, tự động tạo lại Tab `Attendance` mới với dải Header tiêu chuẩn và phát thông báo trên PWA của Leader.

---

## ⚡ 3. Luồng Xử Lý Kỹ Thuật Core (Technical Workflows)

### 3.1. Luồng Gắn Thiết Bị (1-to-1 Device Pairing)
1. User mở PWA lần đầu $\rightarrow$ Nhập `MãNgười` + `MãKíchHoạt` (8 ký tự).
2. Backend đối chiếu `Roster`:
   - Nếu `DeviceID` trống: Lưu `DeviceID` mới, sinh `ClientToken` (HMAC) trả về cho PWA lưu ở `localStorage`.
   - Nếu `DeviceID` đã tồn tại trên tài khoản khác: Từ chối.
3. Khi đổi điện thoại: Admin/Leader bấm "Reset Thiết Bị" trên dashboard $\rightarrow$ Xóa `DeviceID` trên Roster $\rightarrow$ Cấp mã kích hoạt mới.

### 3.2. Luồng Tạo Phiên & Mã QR Xoay Vòng (Leader)
1. Leader bấm **Start** $\rightarrow$ PWA lấy vị trí GPS (chọn sai số nhỏ nhất).
2. Backend kiểm tra quyền Sheet riêng (Pre-flight Check) $\rightarrow$ Khởi tạo `SessionID` lưu vào `CacheService`.
3. Màn hình Leader hiển thị QR Code xoay vòng mỗi 30 giây:
   $$\text{Mã QR} = \text{HMAC}(\text{SecretPhiên}, \lfloor \text{Timestamp} / 30 \rfloor)$$
4. Giờ Server được đồng bộ để tránh lệch múi giờ thiết bị.

### 3.3. Luồng Kiểm Tra Điểm Danh & Ghi Dữ Liệu
1. Member quét QR $\rightarrow$ PWA gửi payload: `ClientToken`, `MãPhiên`, `MãQR`, `Lat`, `Lng`, `Accuracy`.
2. Backend validate bằng `CacheService` (xử lý dưới 0.2s):
   - Check Mã QR xoay vòng (chấp nhận bước hiện tại và bước liền trước - 60s).
   - Check Bán kính GPS (Công thức Haversine so với vị trí Leader lúc Start).
   - Check quy tắc 15 phút: Từ chối nếu user đã điểm danh thành công phiên khác trong 15 phút gần nhất.
   - Tính `SốPhútTrễ` = $\max\left(0, \lfloor (\text{TimeCheckin} - \text{HạnChót}) / 60 \rfloor\right)$.
3. Đẩy dữ liệu điểm danh vào Queue/Batch Writer $\rightarrow$ Phản hồi tức thì cho PWA mã **Ticket ID** và thông báo *"Xác nhận thành công - Trễ X phút"*.
4. **Tự động đóng phiên:** Khi chạm ngưỡng `HạnChót + TrễTốiĐa + 15 phút`, tiến trình background giải phóng `CacheService` và ghi tổng kết phiên.

---

## 📡 4. Sơ Đồ API (Apps Script Web App Endpoint)

Tất cả request gửi qua đường dẫn Apps Script Web App `POST /exec`:

| Action | Payload Yêu Cầu | Phản Hồi Trả Về |
| :--- | :--- | :--- |
| `registerDevice` | `{ userId, activationCode, deviceId }` | `{ success: true, token, name }` |
| `verifyCustomSheet`| `{ sheetUrl }` | `{ success: true, sheetId, title }` hoặc `{ error: "NO_PERMISSION", serviceEmail }` |
| `startSession` | `{ token, groupId, lat, lng, radius, deadline, maxLateMinutes, customSheetId }` | `{ success: true, sessionId, qrSecret }` |
| `submitCheckin` | `{ token, sessionId, qrCode, lat, lng, accuracy }` | `{ success: true, ticketId, lateMinutes, timestamp }` |
| `getHistory` | `{ token }` | `{ success: true, history: [{ ticketId, sessionName, time, status, lateMinutes }] }` |
| `exportReport` | `{ token, groupId, month, year }` | `{ success: true, rawData: [...] }` *(PWA tự dùng SheetJS xuất .xlsx)* |

---

## 🛠️ 5. Cấu Trúc Thư Mục Repository `Check-in`

```text
Check-in/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD tự động deploy PWA lên GitHub Pages
├── docs/
│   └── PLAN.md                 # Tài liệu kế hoạch chi tiết hệ thống
├── src/
│   ├── frontend/               # PWA Frontend Source (Tách biệt từng màn hình)
│   │   ├── index.html          # UI Điểm danh, Quét QR, Tab Lịch sử (Member)
│   │   ├── leader.html         # UI Tạo phiên, Quản lý QR, Nhập Sheet riêng (Leader)
│   │   ├── register-leader.html# UI Đăng ký tài khoản Leader mới & Tạo Nhóm
│   │   ├── admin.html          # UI Quản trị hệ thống, Duyệt Leader, Reset thiết bị (Admin)
│   │   ├── css/
│   │   │   └── style.css       # Style giao diện PWA tối ưu Mobile
│   │   ├── js/
│   │   │   ├── app.js          # Core PWA Logic, Camera Scanner, GPS Geofencing
│   │   │   ├── leader-auth.js  # Module logic Đăng ký & Xác thực Leader
│   │   │   └── admin.js        # Module logic Phê duyệt & Reset thiết bị
│   │   └── lib/                # Thư viện lưu cục bộ
│   │       ├── jsQR.js         # Thư viện đọc QR Code từ Camera
│   │       └── xlsx.full.min.js# Thư viện SheetJS xuất báo cáo Excel ở Client
│   └── backend/                # Google Apps Script Backend Source (Modularized)
│       ├── Code.gs             # Router điều hướng API: doGet(), doPost()
│       ├── Config.gs           # Hằng số cấu hình hệ thống
│       ├── Setup.gs            # Script tự động khởi tạo 7 Tab Master Sheet
│       ├── Auth.gs             # HMAC Token & Đăng ký gắn thiết bị 1-1
│       ├── SessionManager.gs   # Quản lý phiên, QR xoay vòng TOTP 30s, Haversine GPS
│       ├── SheetService.gs     # Đọc/ghi Master Sheet & Custom Sheet (Self-healing Header)
│       ├── LeaderService.gs    # Module Đăng ký Leader & Quản lý Nhóm/Custom Sheet
│       └── AdminService.gs     # Module Phê duyệt Leader & Reset DeviceID cho Member
└── README.md                   # Hướng dẫn thiết lập & Triển khai
