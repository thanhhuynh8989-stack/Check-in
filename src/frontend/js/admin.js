document.addEventListener("DOMContentLoaded", () => {
  checkAdminAuth();
  setupAdminEvents();
});

// Kiểm tra trạng thái Đăng nhập Admin
function checkAdminAuth() {
  const currentAdmin = localStorage.getItem("CHECKIN_ADMIN_SESSION");
  const loginCard = document.getElementById("admin-login-card");
  const dashboardContent = document.getElementById("admin-dashboard-content");
  const logoutBtn = document.getElementById("btn-admin-logout");

  if (currentAdmin) {
    loginCard?.classList.add("hidden");
    dashboardContent?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    loadLeadersList(); // Nạp danh sách Leader khi đã đăng nhập
  } else {
    loginCard?.classList.remove("hidden");
    dashboardContent?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
  }
}

function setupAdminEvents() {
  // Navigation Tabs Switcher
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      e.target.classList.add("active");
      document.getElementById(e.target.dataset.tab)?.classList.remove("hidden");
    });
  });

  // Sự kiện Đăng nhập & Đăng xuất
  document.getElementById("btn-admin-login")?.addEventListener("click", handleAdminLogin);
  document.getElementById("btn-admin-logout")?.addEventListener("click", () => {
    localStorage.removeItem("CHECKIN_ADMIN_SESSION");
    checkAdminAuth();
  });

  document.getElementById("btn-refresh-leaders")?.addEventListener("click", loadLeadersList);
  document.getElementById("btn-reset-device")?.addEventListener("click", handleResetDevice);
}

// 1. Hàm Đăng Nhập Admin trên Frontend
async function handleAdminLogin() {
  const email = document.getElementById("admin-login-email").value.trim();
  const password = document.getElementById("admin-login-pass").value.trim();

  if (!email || !password) {
    alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
    return;
  }

  try {
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "adminLogin",
        email: email,
        password: password
      })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("CHECKIN_ADMIN_SESSION", data.email);
      alert(data.message);
      checkAdminAuth();
    } else {
      alert("Lỗi đăng nhập: " + data.error);
    }
  } catch (err) {
    alert("Không thể kết nối máy chủ: " + err.toString());
  }
}

// 2. Tải danh sách Leader từ Backend
async function loadLeadersList() {
  const adminEmail = localStorage.getItem("CHECKIN_ADMIN_SESSION");
  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "getLeadersList", adminEmail: adminEmail })
    });
    const data = await res.json();
    if (data.success) {
      renderPendingList(data.pending);
      renderActiveList(data.active);
    } else {
      alert("Không thể tải danh sách: " + data.error);
    }
  } catch (err) {
    console.error("Lỗi nạp danh sách Leader:", err);
  }
}

// 3. Render Danh sách Chờ Duyệt
function renderPendingList(list) {
  const container = document.getElementById("pending-list-container");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<p class="sub-text" style="color: var(--success); font-weight: bold;">🎉 Không có yêu cầu nào đang chờ duyệt.</p>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong>${item.fullName}</strong> (${item.email})<br>
        <small style="color: #666;">Ngày đăng ký: ${item.createdAt}</small>
      </div>
      <div style="display: flex; gap: 6px;">
        <button onclick="processAction('${item.email}', 'APPROVE')" class="btn primary" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">✅ Duyệt</button>
        <button onclick="processAction('${item.email}', 'REJECT')" class="btn danger" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">❌ Từ Chối</button>
      </div>
    </div>
  `).join("");
}

// 4. Render Danh sách Leader Đã Duyệt
function renderActiveList(list) {
  const container = document.getElementById("active-list-container");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<p class="sub-text">Chưa có Leader nào được duyệt.</p>';
    return;
  }

  container.innerHTML = `
    <ul style="list-style: none; padding: 0;">
      ${list.map(item => `
        <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${item.fullName}</strong><br>
            <small style="color: #666;">${item.email}</small>
          </div>
          <span class="badge" style="background: #e6f4ea; color: #137333; font-size: 0.75rem;">Đang hoạt động</span>
        </li>
      `).join("")}
    </ul>
  `;
}

// 5. Xử lý Duyệt / Từ Chối 1-Click
async function processAction(targetEmail, actionType) {
  const adminEmail = localStorage.getItem("CHECKIN_ADMIN_SESSION");
  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "processLeaderAction",
        adminEmail: adminEmail,
        targetEmail: targetEmail,
        actionType: actionType
      })
    });
    const data = await res.json();
    alert(data.message);
    loadLeadersList();
  } catch (err) {
    alert("Lỗi thao tác: " + err.toString());
  }
}

// 6. Reset Thiết Bị cho Thành viên
async function handleResetDevice() {
  const adminEmail = localStorage.getItem("CHECKIN_ADMIN_SESSION");
  const userId = document.getElementById("reset-user-id").value.trim().toUpperCase();

  if (!userId) return alert("Vui lòng nhập Mã người dùng!");

  try {
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "resetDevice",
        email: adminEmail,
        userId: userId
      })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("reset-result").classList.remove("hidden");
      document.getElementById("new-activation-code").textContent = data.newActivationCode;
      alert(data.message);
    } else {
      alert("Lỗi reset: " + data.error);
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.toString());
  }
}
