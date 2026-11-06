/**
 * GPSGuideModal - Module quản lý và hiển thị Bottom Sheet hướng dẫn cấp quyền GPS
 */
const GPSGuideModal = (() => {
  let modalInitialized = false;

  // 1. Nhận diện thiết bị và trình duyệt
  function detectBrowser() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isChromeIOS = isIOS && /CriOS/.test(ua);
    const isChromeAndroid = isAndroid && /Chrome/.test(ua);

    return { isIOS, isAndroid, isSafari, isChromeIOS, isChromeAndroid };
  }

  // 2. Sinh nội dung hướng dẫn từng bước dựa trên trình duyệt
  function getInstructionSteps() {
    const env = detectBrowser();

    if (env.isSafari) {
      return {
        browserName: "Safari trên iPhone/iPad",
        steps: [
          "Nhấn vào biểu tượng <strong>'aA'</strong> hoặc <strong>'Cài đặt trang web'</strong> ở góc trái thanh địa chỉ URL.",
          "Chọn mục <strong>Cài đặt trang web (Website Settings)</strong>.",
          "Tại dòng <strong>Vị trí (Location)</strong>, chuyển từ 'Từ chối' sang <strong>'Cho phép' (Allow)</strong>."
        ]
      };
    } else if (env.isChromeIOS) {
      return {
        browserName: "Chrome trên iPhone/iPad",
        steps: [
          "Mở ứng dụng <strong>Cài đặt (Settings)</strong> trên iPhone của bạn.",
          "Cuộn xuống chọn <strong>Chrome</strong> $\\rightarrow$ Chọn mục <strong>Vị trí (Location)</strong>.",
          "Đổi sang <strong>'Khi dùng Ứng dụng'</strong> và BẬT <strong>'Vị trí chính xác'</strong>."
        ]
      };
    } else if (env.isChromeAndroid || env.isAndroid) {
      return {
        browserName: "Chrome trên Android",
        steps: [
          "Nhấn vào biểu tượng <strong>Biểu tượng Ổ khóa 🔒</strong> (hoặc Cài đặt trang) trên thanh địa chỉ.",
          "Chọn <strong>Quyền (Permissions)</strong> $\\rightarrow$ Mục <strong>Vị trí (Location)</strong>.",
          "Bật chuyển sang trạng thái <strong>Cho phép (Allow)</strong> và tải lại trang."
        ]
      };
    } else {
      return {
        browserName: "Trình duyệt của bạn",
        steps: [
          "Nhấn vào biểu tượng cài đặt/ổ khóa cạnh thanh địa chỉ trang web.",
          "Tìm mục <strong>Quyền riêng tư / Vị trí (Location)</strong>.",
          "Chuyển trạng thái sang <strong>Cho phép (Allow)</strong>."
        ]
      };
    }
  }

  // 3. Khởi tạo và chèn HTML Bottom Sheet vào DOM
  function initDOM() {
    if (modalInitialized) return;

    const info = getInstructionSteps();
    const stepsHTML = info.steps.map((step, idx) => `
      <div class="gps-step-item">
        <div class="gps-step-num">${idx + 1}</div>
        <div class="gps-step-text">${step}</div>
      </div>
    `).join("");

    const modalHTML = `
      <div id="gps-guide-overlay" class="gps-modal-overlay">
        <div class="gps-bottom-sheet">
          <div class="gps-sheet-handle"></div>
          <div class="gps-sheet-header">
            <h3 class="gps-sheet-title">📍 Yêu Cầu Quyền Vị Trí GPS</h3>
            <p class="gps-sheet-subtitle">Trình duyệt <strong>${info.browserName}</strong> đã bị tắt vị trí.</p>
          </div>
          
          <div class="gps-steps-container">
            ${stepsHTML}
          </div>

          <div class="gps-sheet-actions">
            <button id="btn-gps-retry" class="gps-btn-primary">🔄 Tôi Đã Bật GPS, Thử Lại</button>
            <button id="btn-gps-close" class="gps-btn-secondary">Đóng hướng dẫn</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Gắn sự kiện đóng/thử lại
    document.getElementById("btn-gps-retry")?.addEventListener("click", () => {
      hide();
      if (typeof window.onGPSRetryCallback === "function") {
        window.onGPSRetryCallback();
      } else {
        location.reload();
      }
    });

    document.getElementById("btn-gps-close")?.addEventListener("click", hide);
    document.getElementById("gps-guide-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "gps-guide-overlay") hide();
    });

    modalInitialized = true;
  }

  // 4. Các hàm Public điều khiển Modal
  function show() {
    initDOM();
    setTimeout(() => {
      document.getElementById("gps-guide-overlay")?.classList.add("active");
    }, 10);
  }

  function hide() {
    const overlay = document.getElementById("gps-guide-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  // 5. Hàm kiểm tra quyền GPS ngầm tự động
  function checkGPSPermission(onDeniedCallback) {
    if (!navigator.geolocation) return;

    // Sử dụng API Permissions nếu được hỗ trợ
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'denied') {
            show();
            if (onDeniedCallback) onDeniedCallback();
          }
          result.onchange = function () {
            if (this.state === 'denied') {
              show();
            } else if (this.state === 'granted') {
              hide();
            }
          };
        })
        .catch(() => {
          // Trình duyệt không hỗ trợ query permissions -> bỏ qua kiểm tra tĩnh
        });
    }
  }

  return {
    show: show,
    hide: hide,
    checkGPSPermission: checkGPSPermission
  };
})();
