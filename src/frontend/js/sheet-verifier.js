/**
 * sheet-verifier.js - Module Xử Lý Kiểm Tra & Xác Minh Link Google Sheet Cá Nhân (Thân Thiện UX)
 */
const SheetVerifier = (() => {
  let isVerified = false;

  // Email Master của hệ thống nhận quyền Editor
  const MASTER_EMAIL = "thanhhuynh8989@gmail.com";
  const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxhqmMvaMageZgpfCRrjdkPPMJtUWsIU1nkfWYL5J6sSQHpIrdVF1yUgtSKNenb6p7_yQ/exec";

  async function verifyCustomSheet(urlInputId, statusElemId) {
    const urlElem = document.getElementById(urlInputId);
    const statusElem = document.getElementById(statusElemId);
    const customSheetUrl = urlElem ? urlElem.value.trim() : "";

    if (!customSheetUrl) {
      alert("💡 Bạn đang để trống Link Sheet.\nHệ thống sẽ tự động sử dụng Master Sheet chung để lưu dữ liệu điểm danh!");
      if (statusElem) {
        statusElem.style.color = "#1a73e8";
        statusElem.textContent = "ℹ️ Đang sử dụng Master Sheet chung của hệ thống.";
      }
      isVerified = true;
      return true;
    }

    if (statusElem) {
      statusElem.style.color = "#1a73e8";
      statusElem.textContent = "⏳ Đang kết nối & kiểm tra quyền truy cập...";
    }

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
        alert("🎉 Xác minh thành công!\nDữ liệu điểm danh của nhóm bạn từ nay sẽ được lưu trực tiếp vào Sheet cá nhân này.");
        return true;
      } else {
        isVerified = false;
        
        // Bắt trường hợp chưa chia sẻ quyền
        if (data.needShare || data.error?.includes("chưa được cấp quyền")) {
          const userChoice = confirm(
            `📋 HƯỚNG DẪN KẾT NỐI SHEET CÁ NHÂN:\n\n` +
            `Hệ thống chưa có quyền ghi dữ liệu vào File Google Sheet này.\n\n` +
            `👉 HƯỚNG DẪN BẬT QUYỀN:\n` +
            `1. Mở file Google Sheet của bạn.\n` +
            `2. Bấm nút "Chia sẻ" (Share) ở góc phải.\n` +
            `3. Thêm Email hệ thống: ${MASTER_EMAIL}\n` +
            `4. Chọn quyền: "Người chỉnh sửa" (Editor) rồi bấm Gửi.\n\n` +
            `💡 GỢI Ý: Bạn có muốn XÓA TRẮNG ô link này để sử dụng Master Sheet chung thay thế không?`
          );

          if (userChoice && urlElem) {
            urlElem.value = "";
            if (statusElem) {
              statusElem.style.color = "#1a73e8";
              statusElem.textContent = "ℹ️ Đã chuyển sang sử dụng Master Sheet chung của hệ thống.";
            }
            isVerified = true;
          } else if (statusElem) {
            statusElem.style.color = "var(--danger, #d93025)";
            statusElem.textContent = `⚠️ Cần chia sẻ quyền Editor cho email: ${MASTER_EMAIL}`;
          }
        } else {
          alert("Lỗi kiểm tra Google Sheet: " + data.error);
          if (statusElem) {
            statusElem.style.color = "var(--danger, #d93025)";
            statusElem.textContent = `❌ Lỗi: ${data.error}`;
          }
        }
        return false;
      }
    } catch (err) {
      isVerified = false;
      alert(
        `📋 HƯỚNG DẪN KẾT NỐI SHEET CÁ NHÂN:\n\n` +
        `Không thể xác minh quyền truy cập file Google Sheet cá nhân.\n\n` +
        `Vui lòng kiểm tra chắc chắn bạn đã Chia sẻ (Share) quyền "Người chỉnh sửa" (Editor) cho Email hệ thống: ${MASTER_EMAIL}.\n\n` +
        `Nếu không thực hiện chia sẻ, bạn hãy xóa trống khung dán link để tự động sử dụng Master Sheet chung!`
      );
      if (statusElem) {
        statusElem.style.color = "var(--danger, #d93025)";
        statusElem.textContent = `⚠️ Vui lòng chia sẻ quyền Editor cho: ${MASTER_EMAIL} hoặc để trống.`;
      }
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

if (typeof window !== "undefined") {
  window.SheetVerifier = SheetVerifier;
}