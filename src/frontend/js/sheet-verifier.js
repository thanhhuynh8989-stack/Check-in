/**
 * sheet-verifier.js - Module Xử Lý Kiểm Tra & Xác Minh Link Google Sheet Cá Nhân
 */
const SheetVerifier = (() => {
  let isVerified = false;

  // URL Web App mặc định dự phòng nếu chưa khai báo toàn cục
  const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxhqmMvaMageZgpfCRrjdkPPMJtUWsIU1nkfWYL5J6sSQHpIrdVF1yUgtSKNenb6p7_yQ/exec";

  async function verifyCustomSheet(urlInputId, statusElemId) {
    const urlElem = document.getElementById(urlInputId);
    const statusElem = document.getElementById(statusElemId);
    const customSheetUrl = urlElem ? urlElem.value.trim() : "";

    if (!customSheetUrl) {
      alert("Vui lòng dán đường link Google Sheet cá nhân trước khi kiểm tra!");
      return false;
    }

    if (statusElem) {
      statusElem.style.color = "#1a73e8";
      statusElem.textContent = "⏳ Đang kết nối & kiểm tra quyền truy cập...";
    }

    // Ưu tiên lấy URL từ biến toàn cục WEB_APP_URL hoặc window.WEB_APP_URL, nếu không có sẽ lấy DEFAULT_WEB_APP_URL
    let apiUrl = DEFAULT_WEB_APP_URL;
    if (typeof WEB_APP_URL !== "undefined" && WEB_APP_URL) {
      apiUrl = WEB_APP_URL;
    } else if (typeof window !== "undefined" && window.WEB_APP_URL) {
      apiUrl = window.WEB_APP_URL;
    }

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "verifyCustomSheet",
          customSheetUrl: customSheetUrl
        })
      });
      const data = await res.json();

      if (data.success) {
        isVerified = true;
        if (statusElem) {
          statusElem.style.color = "var(--success, #1e8e3e)";
          statusElem.textContent = `✅ Đã kết nối thành công: "${data.title || 'Sheet cá nhân'}"`;
        }
        alert("Xác minh Google Sheet cá nhân thành công! Hệ thống có thể ghi dữ liệu điểm danh vào file này.");
        return true;
      } else {
        isVerified = false;
        if (statusElem) {
          statusElem.style.color = "var(--danger, #d93025)";
          statusElem.textContent = `❌ Lỗi: ${data.error}`;
        }
        alert("Không thể kết nối đến Google Sheet cá nhân!\nVui lòng đảm bảo bạn đã Share quyền Chỉnh sửa (Editor) cho Email Master của hệ thống.");
        return false;
      }
    } catch (err) {
      isVerified = false;
      if (statusElem) {
        statusElem.style.color = "var(--danger, #d93025)";
        statusElem.textContent = `❌ Lỗi kết nối: ${err.toString()}`;
      }
      alert("Lỗi kiểm tra Google Sheet: " + err.toString());
      return false;
    }
  }

  function getStatus() {
    return isVerified;
  }

  return {
    verifyCustomSheet,
    getStatus
  };
})();

// Khai báo đối tượng ra môi trường toàn cục window để các file khác dễ dàng gọi tới
if (typeof window !== "undefined") {
  window.SheetVerifier = SheetVerifier;
}
