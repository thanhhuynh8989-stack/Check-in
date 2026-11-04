const ADMIN_EMAIL_KEY = "CHECKIN_ADMIN_EMAIL";

document.addEventListener("DOMContentLoaded", () => {
  let adminEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
  if (!adminEmail) {
    adminEmail = prompt("Nhập Email Quản trị viên (Admin) của bạn:");
    if (adminEmail) localStorage.setItem(ADMIN_EMAIL_KEY, adminEmail);
  }
});

// Duyệt Leader
document.getElementById("btn-approve-leader")?.addEventListener("click", async () => {
  const adminEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
  const targetEmail = document.getElementById("approve-email").value.trim();

  if (!targetEmail) return alert("Vui lòng nhập Email!");

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "approveLeader",
        adminEmail: adminEmail,
        targetEmail: targetEmail
      })
    });
    const data = await res.json();
    alert(data.success ? data.message : "Lỗi: " + data.error);
  } catch (err) {
    alert("Lỗi kết nối: " + err.toString());
  }
});

// Reset Thiết Bị
document.getElementById("btn-reset-device")?.addEventListener("click", async () => {
  const adminEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
  const userId = document.getElementById("reset-user-id").value.trim().toUpperCase();

  if (!userId) return alert("Vui lòng nhập Mã người dùng!");

  try {
    const res = await fetch(WEB_APP_URL, {
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
      alert("Lỗi: " + data.error);
    }
  } catch (err) {
    alert("Lỗi kết nối: " + err.toString());
  }
});
