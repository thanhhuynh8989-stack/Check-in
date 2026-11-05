// CONFIG: Web App URL triển khai trên Apps Script
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxhqmMvaMageZgpfCRrjdkPPMJtUWsIU1nkfWYL5J6sSQHpIrdVF1yUgtSKNenb6p7_yQ/exec";

// State ứng dụng
let currentUser = JSON.parse(localStorage.getItem("CHECKIN_USER") || "null");
let checkinHistory = JSON.parse(localStorage.getItem("CHECKIN_HISTORY") || "[]");
let videoStream = null;
let scanning = false;
let currentSessionId = null;
let currentSessionSecret = null;
let serverStartMs = 0;
let localStartPerfMs = 0;
let lastStep = -1;
let qrTimerInterval = null;
let isRequestingGPS = false; // Biến cờ ngăn chặn gọi GPS chồng chéo (Throttle)

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  setupEventListeners();
});

function initApp() {
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
  // 1. Navigation Drawer (Hamburger Menu PWA)
  const btnHamburger = document.getElementById("btn-hamburger");
  const navDrawer = document.getElementById("nav-drawer");
  const menuOverlay = document.getElementById("menu-overlay");
  const btnCloseDrawer = document.getElementById("btn-close-drawer");

  function openDrawer() {
    navDrawer?.classList.remove("hidden");
    menuOverlay?.classList.remove("hidden");
  }

  function closeDrawer() {
    navDrawer?.classList.add("hidden");
    menuOverlay?.classList.add("hidden");
  }

  btnHamburger?.addEventListener("click", openDrawer);
  btnCloseDrawer?.addEventListener("click", closeDrawer);
  menuOverlay?.addEventListener("click", closeDrawer);

  // Tự động đóng Menu khi bấm chọn 1 đường dẫn trong Drawer
  document.querySelectorAll(".drawer-menu a").forEach(link => {
    link.addEventListener("click", closeDrawer);
  });

  // 2. Chuyển Tab Nội Bộ (Navigation Tabs Switcher)
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      
      const targetBtn = e.currentTarget;
      targetBtn.classList.add("active");
      document.getElementById(targetBtn.dataset.tab)?.classList.remove("hidden");
    });
  });

  // 3. Kích Hoạt / Xác Nhận Tài Khoản Member (Gắn DeviceId)
  document.getElementById("btn-register")?.addEventListener("click", handleRegister);

  // 4. Gửi Mã QR Nhập Tay Member
  document.getElementById("btn-submit-manual")?.addEventListener("click", () => {
    const inputElem = document.getElementById("manual-qr-code");
    const code = inputElem ? inputElem.value.trim() : "";
    if (code) {
      submitCheckinRequest(code);
    } else {
      alert("Vui lòng nhập 8 ký tự mã QR!");
    }
  });

  // 5. Bật/Tắt Camera Thủ Công
  document.getElementById("btn-toggle-camera")?.addEventListener("click", () => {
    if (scanning) {
      scanning = false;
      const status = document.getElementById("scan-status");
      if (status) status.textContent = "Camera đã tắt.";
    } else {
      startCamera();
    }
  });

  // 6. Leader: Sự kiện Tạo Phiên & Đóng Phiên
  document.getElementById("btn-start-session")?.addEventListener("click", handleLeaderStartSession);
  document.getElementById("btn-close-session")?.addEventListener("click", handleCloseSession);
}

// Chuyển đổi ẩn/hiện ô nhập địa chỉ thủ công trên UI Leader
function toggleLocationInput() {
  const type = document.querySelector('input[name="location-type"]:checked')?.value;
  const addressBox = document.getElementById("address-input-box");
  if (!addressBox) return;

  if (type === "address") {
    addressBox.classList.remove("hidden");
  } else {
    addressBox.classList.add("hidden");
  }
}

// 1. Liên Kết Máy Tự Động Theo Mã NV/HS
async function handleRegister() {
  const userIdElem = document.getElementById("reg-user-id");
  const userId = userIdElem ? userIdElem.value.trim().toUpperCase() : "";
  let deviceId = localStorage.getItem("CHECKIN_DEVICE_ID");
  
  if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("CHECKIN_DEVICE_ID", deviceId);
  }

  if (!userId) {
    alert("Vui lòng nhập Mã người dùng (Mã NV/HS)!");
    return;
  }

  showLoading(true);
  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registerDevice",
        userId: userId,
        deviceId: deviceId
      })
    });
    const data = await res.json();

    if (data.success) {
      currentUser = { token: data.token, userId: data.userId, userName: data.userName };
      localStorage.setItem("CHECKIN_USER", JSON.stringify(currentUser));
      alert(`Xác nhận tài khoản ${data.userId} thành công!`);
      initApp();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert("Không thể kết nối đến máy chủ: " + err.toString());
  } finally {
    showLoading(false);
  }
}

// 2. Camera QR Reader
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
      const status = document.getElementById("scan-status");
      if (status) status.textContent = "Không thể mở Camera. Vui lòng nhập mã thủ công!";
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
  const code = typeof jsQR !== "undefined" ? jsQR(imageData.data, imageData.width, imageData.height) : null;

  if (code && code.data) {
    scanning = false;
    submitCheckinRequest(code.data);
  } else {
    requestAnimationFrame(tickScan);
  }
}

// 3. Member Điểm Danh (GPS + Quét QR)
function submitCheckinRequest(rawQrCode) {
  if (isRequestingGPS) return;

  if (!navigator.geolocation) {
    alert("Thiết bị của bạn không hỗ trợ định vị GPS!");
    resumeScanningWithDelay(2000);
    return;
  }

  isRequestingGPS = true;
  scanning = false;

  const status = document.getElementById("scan-status");
  if (status) status.textContent = "📍 Đang xác minh vị trí GPS...";

  let targetSessionId = localStorage.getItem("CURRENT_SESSION_ID") || "SESS_ACTIVE";
  let payloadCode = rawQrCode;

  if (rawQrCode.includes("|")) {
    const parts = rawQrCode.split("|");
    targetSessionId = parts[0].trim();
    payloadCode = parts[1].trim();
  }

  console.log("📲 [MEMBER CHECKIN SENDING]", {
    targetSessionId: targetSessionId,
    rawQrInput: rawQrCode,
    payloadCode: payloadCode
  });

  const gpsOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 };

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      showLoading(true);
      try {
        const payload = {
          action: "submitCheckin",
          token: currentUser.token,
          sessionId: targetSessionId,
          qrCode: payloadCode,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };

        console.log("📤 [MEMBER FETCH PAYLOAD]:", payload);

        const res = await fetch(WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        console.log("📥 [MEMBER CHECKIN RESPONSE]:", data);

        if (data.success) {
          showResultCard(data);
          saveHistory(data);
        } else {
          alert("Điểm danh thất bại: " + data.error);
          resumeScanningWithDelay(3000);
        }
      } catch (err) {
        console.error("❌ [MEMBER CHECKIN ERROR]:", err);
        alert("Lỗi kết nối máy chủ!");
        resumeScanningWithDelay(3000);
      } finally {
        showLoading(false);
        isRequestingGPS = false;
      }
    },
    (err) => {
      isRequestingGPS = false;
      alert("Vui lòng bật quyền GPS trên trình duyệt để điểm danh!");
      resumeScanningWithDelay(3000);
    },
    gpsOptions
  );
}

function resumeScanningWithDelay(delayMs) {
  setTimeout(() => {
    scanning = true;
    requestAnimationFrame(tickScan);
  }, delayMs || 2000);
}

function showResultCard(data) {
  document.getElementById("result-card")?.classList.remove("hidden");
  const ticketElem = document.getElementById("result-ticket-id");
  const detailElem = document.getElementById("result-detail");

  if (ticketElem) ticketElem.textContent = data.ticketId;
  if (detailElem) detailElem.textContent = `Thời điểm: ${data.timestamp} | Trễ: ${data.lateMinutes} phút | Khoảng cách: ${data.distance}m`;
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

// 4. Leader Khởi Tạo Phiên (GPS hoặc Địa chỉ thủ công)
async function handleLeaderStartSession() {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const groupId = document.getElementById("group-id")?.value.trim().toUpperCase();
  const radius = document.getElementById("gps-radius")?.value;
  const deadlineMinutes = document.getElementById("deadline-min")?.value || 15;
  const maxLateMinutes = document.getElementById("max-late-min")?.value || 30;
  const customSheetUrl = document.getElementById("custom-sheet-url")?.value.trim();

  const locationType = document.querySelector('input[name="location-type"]:checked')?.value;
  const address = document.getElementById("leader-address")?.value.trim();

  if (!leaderEmail) return alert("Vui lòng đăng nhập tài khoản Leader!");
  if (!groupId) return alert("Vui lòng chọn hoặc nhập Mã Nhóm / Lớp!");

  if (locationType === "address") {
    if (!address) return alert("Vui lòng nhập địa chỉ mốc điểm danh!");
    sendStartSessionRequest({
      email: leaderEmail,
      groupId: groupId,
      address: address,
      radius: radius,
      deadlineMinutes: deadlineMinutes,
      maxLateMinutes: maxLateMinutes,
      customSheetUrl: customSheetUrl
    });
    return;
  }

  if (!navigator.geolocation) return alert("Trình duyệt không hỗ trợ định vị GPS!");

  navigator.geolocation.getCurrentPosition((pos) => {
    sendStartSessionRequest({
      email: leaderEmail,
      groupId: groupId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      radius: radius,
      deadlineMinutes: deadlineMinutes,
      maxLateMinutes: maxLateMinutes,
      customSheetUrl: customSheetUrl
    });
  }, (err) => {
    alert("Vui lòng cấp quyền GPS hoặc chọn tùy chọn 'Nhập địa chỉ thủ công'!");
  }, { enableHighAccuracy: true });
}

let configSecretKey = "CHECKIN_SECRET_KEY_2026"; // Fallback Secret Key

// 1. Nhận response từ Server khi tạo phiên thành công
async function sendStartSessionRequest(payload) {
  try {
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;
    console.log("🚀 [LEADER] Gửi request tạo phiên mới tới Server...", payload);
    
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "startSession", ...payload })
    });
    const data = await res.json();

    console.log("📥 [LEADER] Nhận phản hồi từ Server:", data);

    if (data.success) {
      currentSessionId = data.sessionId;
      currentSessionSecret = data.sessionSecret;
      if (data.secretKey) configSecretKey = data.secretKey;
      
      serverStartMs = Number(data.serverStartMs);
      localStartPerfMs = performance.now();

      console.log(`✅ [LEADER SESSION READY] SessionID: ${currentSessionId} | ServerStartMs: ${serverStartMs}`);

      localStorage.setItem("CURRENT_SESSION_ID", currentSessionId);
      alert("Khởi tạo phiên thành công!");

      document.getElementById("session-form-card")?.classList.add("hidden");
      document.getElementById("qr-display-card")?.classList.remove("hidden");

      startAnchorBasedQRCountdown();
    } else {
      alert("Lỗi tạo phiên: " + data.error);
    }
  } catch (err) {
    console.error("❌ [LEADER ERROR] Không thể tạo phiên:", err);
    alert("Lỗi kết nối máy chủ: " + err.toString());
  }
}

// 5. Render Ảnh QR & Mã Chữ Nhập Tay Chuẩn Đồng Bộ Với Backend
function renderQRAndText(sessionId, rawQR) {
  const textCodeElem = document.getElementById("qr-text-code");
  if (textCodeElem) textCodeElem.textContent = rawQR;

  const fullQRPayload = `${sessionId}|${rawQR}`;
  const qrContainer = document.getElementById("qrcode-box");
  if (qrContainer && typeof QRCode !== "undefined") {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: fullQRPayload,
      width: 220,
      height: 220,
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

// 6. Reset Giao Diện Leader về Form Tạo Phiên & Dọn Dẹp Session State
function resetToSessionForm(message) {
  if (qrTimerInterval) clearInterval(qrTimerInterval);
  if (message) alert(message);

  localStorage.removeItem("CURRENT_SESSION_ID");

  document.getElementById("qr-display-card")?.classList.add("hidden");
  document.getElementById("session-form-card")?.classList.remove("hidden");
  
  currentSessionId = null;
  currentSessionSecret = null;
  serverStartMs = 0;
  localStartPerfMs = 0;
  lastStep = -1;
}

// 7. Leader Đóng Phiên Thủ Công
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
      resetToSessionForm("✅ Đã đóng phiên điểm danh thành công!");
    } else {
      alert("Lỗi đóng phiên: " + data.error);
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.toString());
  }
}

// 8. Thuật toán sinh Mã QR 8 ký tự Offline dựa trên Mốc Neo Server
function generateAnchorQR(secret, stepOffset) {
  if (!serverStartMs || isNaN(serverStartMs)) return "--------";

  const elapsedMs = performance.now() - localStartPerfMs;
  const currentEstimatedServerMs = serverStartMs + elapsedMs;
  const timeStep = Math.floor(currentEstimatedServerMs / 30000) + (stepOffset || 0);

  const rawString = secret + "_" + timeStep;

  // Dùng CryptoJS băm HMAC-SHA256 giống hệt Utilities.computeHmacSha256Signature của Apps Script
  let code = "";
  if (typeof CryptoJS !== "undefined") {
    const hash = CryptoJS.HmacSHA256(rawString, configSecretKey);
    const base64 = CryptoJS.enc.Base64.stringify(hash);
    code = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  } else {
    // Fallback nếu thiếu CryptoJS
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
      hash |= 0;
    }
    code = Math.abs(hash).toString(16).toUpperCase().padStart(8, 'X').substring(0, 8);
  }

  console.log(`🔑 [LEADER GEN QR] Elapsed: ${Math.round(elapsedMs)}ms | Step: ${timeStep} | Raw: "${rawString}" -> Code: ${code}`);
  return code;
}

// 9. Bộ Đếm Ngược 30s Offline Dựa Trên Mốc Neo (Không Tốn Request)
function startAnchorBasedQRCountdown() {
  if (qrTimerInterval) clearInterval(qrTimerInterval);
  lastStep = -1;

  function tick() {
    if (!currentSessionId || !serverStartMs || isNaN(serverStartMs)) return;

    const elapsedMs = performance.now() - localStartPerfMs;
    const currentEstimatedServerMs = serverStartMs + elapsedMs;

    const currentStep = Math.floor(currentEstimatedServerMs / 30000);
    const secondsRemaining = 30 - Math.floor((currentEstimatedServerMs % 30000) / 1000);

    const countdownElem = document.getElementById("qr-countdown");
    if (countdownElem) countdownElem.textContent = isNaN(secondsRemaining) ? "30" : secondsRemaining;

    if (currentStep !== lastStep) {
      lastStep = currentStep;
      const rawQR = generateAnchorQR(currentSessionSecret, 0);
      renderQRAndText(currentSessionId, rawQR);
    }
  }

  tick();
  qrTimerInterval = setInterval(tick, 1000);
}

function showLoading(show) {
  const status = document.getElementById("scan-status");
  if (status) status.textContent = show ? "Đang xử lý dữ liệu..." : "Sẵn sàng quét mã QR";
}
