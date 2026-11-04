// CONFIG: Dán Web App URL thu được từ Google Apps Script Deploy vào đây
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxhqmMvaMageZgpfCRrjdkPPMJtUWsIU1nkfWYL5J6sSQHpIrdVF1yUgtSKNenb6p7_yQ/exec";

// Application State
let currentUser = JSON.parse(localStorage.getItem("CHECKIN_USER") || "null");
let checkinHistory = JSON.parse(localStorage.getItem("CHECKIN_HISTORY") || "[]");
let videoStream = null;
let scanning = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-start-session")?.addEventListener("click", handleLeaderStartSession);
  document.getElementById("btn-close-session")?.addEventListener("click", handleCloseSession);

  initApp();
  setupEventListeners();
});

function initApp() {
  // Kiểm tra trạng thái Kích hoạt thiết bị
  if (!currentUser || !currentUser.token) {
    document.getElementById("activation-section")?.classList.remove("hidden");
    document.getElementById("checkin-tab")?.classList.add("hidden");
  } else {
    document.getElementById("activation-section")?.classList.add("hidden");
    document.getElementById("checkin-tab")?.classList.remove("hidden");
    const badge = document.getElementById("user-badge");
    if (badge) {
      badge.textContent = `${currentUser.userName} (${currentUser.userId})`;
      badge.classList.remove("hidden");
    }
    startCamera();
  }
  renderHistory();
}

function setupEventListeners() {
  // Tab Switcher
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      e.target.classList.add("active");
      document.getElementById(e.target.dataset.tab)?.classList.remove("hidden");
    });
  });

  // Kích Hoạt Thiết Bị
  document.getElementById("btn-register")?.addEventListener("click", handleRegister);

  // Gửi Mã QR Nhập Tay
  document.getElementById("btn-submit-manual")?.addEventListener("click", () => {
    const code = document.getElementById("manual-qr-code").value.trim();
    if (code) submitCheckinRequest(code);
  });

  // Leader: Start Session
  document.getElementById("btn-start-session")?.addEventListener("click", handleLeaderStartSession);
}

// 1. Xử Lý Đăng Ký Thiết Bị (Activation)
async function handleRegister() {
  const userId = document.getElementById("reg-user-id").value.trim().toUpperCase();
  const activationCode = document.getElementById("reg-code").value.trim().toUpperCase();
  let deviceId = localStorage.getItem("CHECKIN_DEVICE_ID");
  
  if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("CHECKIN_DEVICE_ID", deviceId);
  }

  if (!userId || !activationCode) {
    alert("Vui lòng nhập đầy đủ Mã người dùng và Mã kích hoạt!");
    return;
  }

  showLoading(true);
  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registerDevice",
        userId: userId,
        activationCode: activationCode,
        deviceId: deviceId
      })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = { token: data.token, userId: data.userId, userName: data.userName };
      localStorage.setItem("CHECKIN_USER", JSON.stringify(currentUser));
      alert("Kích hoạt thiết bị thành công!");
      initApp();
    } else {
      alert("Lỗi kích hoạt: " + data.error);
    }
  } catch (err) {
    alert("Không thể kết nối đến máy chủ: " + err.toString());
  } finally {
    showLoading(false);
  }
}

// 2. Tự Động Quét Mã QR Bằng Camera
function startCamera() {
  const video = document.getElementById("video");
  if (!video) return;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      videoStream = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      video.play();
      scanning = true;
      requestAnimationFrame(tickScan);
    })
    .catch(err => {
      document.getElementById("scan-status").textContent = "Không thể mở Camera. Vui lòng nhập mã thủ công!";
    });
}

function tickScan() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  if (!scanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    if (scanning) requestAnimationFrame(tickScan);
    return;
  }

  canvas.height = video.videoHeight;
  canvas.width = video.videoWidth;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code && code.data) {
    scanning = false; // Tạm dừng quét khi thấy mã
    submitCheckinRequest(code.data);
  } else {
    requestAnimationFrame(tickScan);
  }
}

// 3. Gửi Yêu Cầu Điểm Danh Đính Kèm GPS
function submitCheckinRequest(qrCode) {
  if (!navigator.geolocation) {
    alert("Thiết bị không hỗ trợ GPS!");
    scanning = true;
    requestAnimationFrame(tickScan);
    return;
  }

  document.getElementById("scan-status").textContent = "Đang lấy vị trí GPS...";

  navigator.geolocation.getCurrentPosition(async (pos) => {
    showLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "submitCheckin",
          token: currentUser.token,
          sessionId: localStorage.getItem("CURRENT_SESSION_ID") || "SESS_ACTIVE",
          qrCode: qrCode,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        })
      });
      const data = await res.json();
      if (data.success) {
        showResultCard(data);
        saveHistory(data);
      } else {
        alert("Điểm danh thất bại: " + data.error);
        scanning = true;
        requestAnimationFrame(tickScan);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ!");
      scanning = true;
      requestAnimationFrame(tickScan);
    } finally {
      showLoading(false);
    }
  }, (err) => {
    alert("Không thể lấy vị trí GPS. Bạn cần bật quyền GPS để điểm danh!");
    scanning = true;
    requestAnimationFrame(tickScan);
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function showResultCard(data) {
  document.getElementById("result-card").classList.remove("hidden");
  document.getElementById("result-ticket-id").textContent = data.ticketId;
  document.getElementById("result-detail").textContent = 
    `Thời điểm: ${data.timestamp} | Trễ: ${data.lateMinutes} phút | Khoảng cách: ${data.distance}m`;
}

function saveHistory(item) {
  checkinHistory.unshift(item);
  localStorage.setItem("CHECKIN_HISTORY", JSON.stringify(checkinHistory));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  if (checkinHistory.length === 0) {
    list.innerHTML = '<li class="empty-msg">Chưa có dữ liệu điểm danh.</li>';
    return;
  }
  list.innerHTML = checkinHistory.map(h => `
    <li style="padding: 10px; border-bottom: 1px solid #eee;">
      <strong>${h.ticketId}</strong> - ${h.timestamp}<br>
      <small>Trễ: ${h.lateMinutes} phút | Khoảng cách: ${h.distance}m</small>
    </li>
  `).join("");
}

let currentSessionId = null;
let qrTimerInterval = null;

// Hàm Bắt đầu phiên điểm danh
async function handleLeaderStartSession() {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const groupId = document.getElementById("group-id")?.value.trim().toUpperCase();
  const radius = document.getElementById("gps-radius")?.value;
  const deadlineMinutes = document.getElementById("deadline-min")?.value || 15;
  const maxLateMinutes = document.getElementById("max-late-min")?.value || 30;
  const customSheetUrl = document.getElementById("custom-sheet-url")?.value.trim();

  if (!leaderEmail) return alert("Vui lòng đăng nhập tài khoản Leader!");
  if (!groupId) return alert("Vui lòng nhập Mã Nhóm / Lớp!");

  if (!navigator.geolocation) return alert("Trình duyệt không hỗ trợ GPS!");

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

      const res = await fetch(apiUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "startSession",
          email: leaderEmail,
          groupId: groupId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius: radius,
          deadlineMinutes: deadlineMinutes,
          maxLateMinutes: maxLateMinutes,
          customSheetUrl: customSheetUrl
        })
      });
      const data = await res.json();

      if (data.success) {
        currentSessionId = data.sessionId;
        alert("Khởi tạo phiên thành công!");

        document.getElementById("session-form-card")?.classList.add("hidden");
        document.getElementById("qr-display-card")?.classList.remove("hidden");

        // Tách chuỗi sessionId|TOTPCode
        const qrPayload = data.qrCode; // Chuỗi đầy đủ SESS_xxx|X7K2M9P4
        const rawCode = qrPayload.includes("|") ? qrPayload.split("|")[1] : qrPayload;

        // Mã hiển thị nhập tay: CHỈ HIỂN THỊ 8 KÝ TỰ TOTP
        document.getElementById("qr-text-code").textContent = rawCode;

        // Mã QR Code: Nén đầy đủ chuỗi để Camera quét 1-click
        if (typeof QRCode !== "undefined") {
          document.getElementById("qrcode-box").innerHTML = "";
          new QRCode(document.getElementById("qrcode-box"), {
            text: qrPayload,
            width: 220,
            height: 220
          });
        }

        startQRCountdown();
      } else {
        alert("Lỗi tạo phiên: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ: " + err.toString());
    }
  }, (err) => {
    alert("Vui lòng cấp quyền GPS để định vị vị trí điểm danh!");
  }, { enableHighAccuracy: true });
}

// Hàm Xử lý Đóng Phiên Thủ Công
async function handleCloseSession() {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  if (!currentSessionId) return alert("Không tìm thấy thông tin phiên hiện tại!");

  if (!confirm("Bạn có chắc chắn muốn đóng phiên điểm danh này ngay lập tức?")) return;

  try {
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

    const res = await fetch(apiUrl, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "closeSession",
        email: leaderEmail,
        sessionId: currentSessionId
      })
    });
    const data = await res.json();

    if (data.success) {
      if (qrTimerInterval) clearInterval(qrTimerInterval);
      alert(data.message);

      document.getElementById("qr-display-card")?.classList.add("hidden");
      document.getElementById("session-form-card")?.classList.remove("hidden");
      currentSessionId = null;
    } else {
      alert("Lỗi đóng phiên: " + data.error);
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.toString());
  }
}

// Hàm Xoay vòng bộ đếm 30s
function startQRCountdown() {
  let seconds = 30;
  if (qrTimerInterval) clearInterval(qrTimerInterval);

  qrTimerInterval = setInterval(() => {
    seconds--;
    const countdownElem = document.getElementById("qr-countdown");
    if (countdownElem) countdownElem.textContent = seconds;

    if (seconds <= 0) {
      seconds = 30;
      // Tự xoay mã mới (Client-side sync)
    }
  }, 1000);
}

function showLoading(show) {
  const status = document.getElementById("scan-status");
  if (status) status.textContent = show ? "Đang xử lý dữ liệu..." : "Sẵn sàng quét mã QR";
}
