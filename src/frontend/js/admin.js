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
  } else {
    loginCard?.classList.remove("hidden");
    dashboardContent?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
  }
}

function setupAdminEvents() {
  // 1. Đăng nhập Admin
  document.getElementById("btn-admin-login")?.addEventListener("click", async () => {
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
  });

  // 2. Đăng xuất Admin
  document.getElementById("btn-admin-logout")?.addEventListener("click", () => {
    localStorage.removeItem("CHECKIN_ADMIN_SESSION");
    checkAdminAuth();
  });

  // 3. Duyệt Tài Khoản Leader
  document.getElementById("btn-approve-leader")?.addEventListener("click", async () => {
    const adminEmail = localStorage.getItem("CHECKIN_ADMIN_SESSION");
    const targetEmail = document.getElementById("approve-email").value.trim();

    if (!targetEmail) return alert("Vui lòng nhập Email Leader cần duyệt!");

    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

      const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "approveLeader",
          adminEmail: adminEmail,
          targetEmail: targetEmail
        })
      });
      const data = await res.json();
      alert(data.success ? data.message : "Lỗi duyệt: " + data.error);
    } catch (err) {
      alert("Lỗi kết nối: " + err.toString());
    }
  });

  // 4. Reset Thiết Bị
  document.getElementById("btn-reset-device")?.addEventListener("click", async () => {
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
  });
}
