/**
 * sheet-verifier.js - Module Xử Lý Kiểm Tra & Xác Minh Link Google Sheet Cá Nhân
 */
const SheetVerifier = (() => {
  let isVerified = false;

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

    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

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
