let parsedMembersData = [];
let lastUploadResult = [];
let isSheetVerified = false;

document.addEventListener("DOMContentLoaded", () => {
  checkLeaderAuth();
  setupTabEvents();
  setupLeaderAuthEvents();
  setupUploadTabEvents();
  setupRegisterPageEvents();
});

// 1. Chuyển đổi Tab linh hoạt (Hỗ trợ Mobile)
function setupTabEvents() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      
      const targetBtn = e.currentTarget;
      targetBtn.classList.add("active");
      const targetTabId = targetBtn.dataset.tab;
      document.getElementById(targetTabId)?.classList.remove("hidden");
    });
  });
}

// 2. Kiểm tra trạng thái Đăng nhập Leader
function checkLeaderAuth() {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const loginCard = document.getElementById("leader-login-card");
  const dashboardContent = document.getElementById("leader-dashboard-content");
  const logoutBtn = document.getElementById("btn-leader-logout");
  const badge = document.getElementById("leader-badge");

  if (leaderEmail) {
    loginCard?.classList.add("hidden");
    dashboardContent?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    if (badge) badge.textContent = leaderEmail;
    loadLeaderGroups();
  } else {
    loginCard?.classList.remove("hidden");
    dashboardContent?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    if (badge) badge.textContent = "Leader";
  }
}

function setupLeaderAuthEvents() {
  // Sự kiện Đăng Nhập
  document.getElementById("btn-leader-login")?.addEventListener("click", async () => {
    const email = document.getElementById("leader-login-email").value.trim();
    const password = document.getElementById("leader-login-pass").value.trim();

    if (!email || !password) {
      alert("Vui lòng nhập Email và Mật khẩu!");
      return;
    }

    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({ action: "leaderLogin", email: email, password: password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("CHECKIN_LEADER_SESSION", data.email);
        alert(data.message);
        checkLeaderAuth();
      } else {
        alert("Lỗi đăng nhập: " + data.error);
      }
    } catch (err) {
      alert("Không thể kết nối máy chủ: " + err.toString());
    }
  });

  // Sự kiện Đăng Xuất
  document.getElementById("btn-leader-logout")?.addEventListener("click", () => {
    localStorage.removeItem("CHECKIN_LEADER_SESSION");
    checkLeaderAuth();
  });

  document.getElementById("btn-refresh-groups")?.addEventListener("click", loadLeaderGroups);
}

// 3. Sự kiện Đăng Ký Leader (Cho trang register-leader.html)
function setupRegisterPageEvents() {
  // Kiểm tra link Sheet riêng
  document.getElementById("btn-verify-sheet")?.addEventListener("click", async () => {
    const customSheetUrl = document.getElementById("sheet-url")?.value.trim();
    const statusText = document.getElementById("sheet-verify-status");

    if (!customSheetUrl) {
      alert("Vui lòng dán Link Google Sheet riêng trước khi kiểm tra!");
      return;
    }

    if (statusText) statusText.textContent = "⏳ Đang kiểm tra quyền truy cập...";

    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({ action: "verifyCustomSheet", customSheetUrl: customSheetUrl })
      });
      const data = await res.json();

      if (data.success) {
        isSheetVerified = true;
        if (statusText) {
          statusText.style.color = "var(--success)";
          statusText.textContent = `✅ Kết nối thành công tới Sheet: "${data.title}"`;
        }
        alert("Kết nối Google Sheet thành công!");
      } else {
        isSheetVerified = false;
        if (statusText) {
          statusText.style.color = "var(--danger)";
          statusText.textContent = `❌ Lỗi: ${data.error}`;
        }
        alert("Không thể truy cập Google Sheet riêng! Hãy cấp quyền Chia sẻ (Editor) cho Apps Script.");
      }
    } catch (err) {
      alert("Lỗi kiểm tra Sheet: " + err.toString());
    }
  });

  // Gửi yêu cầu Đăng ký
  document.getElementById("btn-register-leader")?.addEventListener("click", async () => {
    const fullName = document.getElementById("leader-name")?.value.trim();
    const email = document.getElementById("leader-email")?.value.trim();
    const pass = document.getElementById("leader-pass")?.value.trim();
    const passConfirm = document.getElementById("leader-pass-confirm")?.value.trim();
    const customSheetUrl = document.getElementById("sheet-url")?.value.trim();

    if (!fullName || !email || !pass) {
      alert("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!");
      return;
    }

    if (pass.length < 6) {
      alert("Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }

    if (pass !== passConfirm) {
      alert("Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    if (customSheetUrl && !isSheetVerified) {
      if (!confirm("Bạn chưa bấm kiểm tra kết nối Link Sheet riêng. Bạn có chắc muốn tiếp tục?")) return;
    }

    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "registerLeader",
          fullName: fullName,
          email: email,
          password: pass,
          customSheetUrl: customSheetUrl
        })
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        window.location.href = "leader.html";
      } else {
        alert("Lỗi đăng ký: " + data.error);
      }
    } catch (err) {
      alert("Không thể kết nối máy chủ: " + err.toString());
    }
  });
}

// 4. Quản lý danh sách Nhóm
async function loadLeaderGroups() {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  if (!leaderEmail) return;

  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "getLeaderGroups", email: leaderEmail })
    });
    const data = await res.json();
    if (data.success) {
      renderLeaderGroups(data.groups);
    }
  } catch (err) {
    console.error("Lỗi tải nhóm:", err);
  }
}

function renderLeaderGroups(groups) {
  const container = document.getElementById("groups-grid-container");
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = '<p class="sub-text">Bạn chưa phụ trách nhóm nào. Hãy sang tab "Nhập/Xuất Data" để Upload danh sách mới!</p>';
    return;
  }

  container.innerHTML = groups.map(g => `
    <div style="background: #e8f0fe; border: 1px solid #aecbfa; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
      <h4 style="color: var(--primary);">${g.groupName} (${g.groupId})</h4>
      <p class="sub-text" style="font-size: 0.8rem;">Sheet riêng: ${g.customSheetUrl ? 'Đã cấu hình' : 'Dùng Master Sheet'}</p>
    </div>
  `).join("");
}

// 5. Xử Lý Upload Data Excel
function setupUploadTabEvents() {
  document.getElementById("btn-download-template")?.addEventListener("click", () => {
    const templateData = [
      ["MãNgười", "HọTên", "MãNhóm", "GhiChú"],
      ["NV001", "Nguyễn Văn A", "LOP_10A1", "0905123456"],
      ["NV002", "Trần Thị B", "LOP_10A1", "0905654321"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Upload");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Thanh_Vien.xlsx");
  });

  document.getElementById("excel-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet);

      parsedMembersData = json.map(row => ({
        userId: String(row["MãNgười"] || row["MaNguoi"] || "").trim(),
        fullName: String(row["HọTên"] || row["HoTen"] || "").trim(),
        groupId: String(row["MãNhóm"] || row["MaNhom"] || "").trim(),
        note: String(row["GhiChú"] || row["GhiChu"] || "").trim()
      })).filter(item => item.userId !== "" && item.fullName !== "");

      if (parsedMembersData.length > 0) {
        document.getElementById("file-preview-box")?.classList.remove("hidden");
        const countElem = document.getElementById("preview-count");
        if (countElem) countElem.textContent = parsedMembersData.length;
      } else {
        alert("File Excel không có dữ liệu hợp lệ!");
      }
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById("btn-process-upload")?.addEventListener("click", async () => {
    const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
    if (!leaderEmail) return alert("Vui lòng đăng nhập tài khoản Leader!");

    try {
      const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "batchUploadRoster",
          email: leaderEmail,
          members: parsedMembersData
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Đã xử lý ${data.totalUploaded} thành viên (${data.newCreated} mã kích hoạt mới được sinh).`);
        lastUploadResult = data.resultCodes;
        renderUploadResultTable(data.resultCodes);
        loadLeaderGroups();
      } else {
        alert("Lỗi upload: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ: " + err.toString());
    }
  });

  document.getElementById("btn-export-result-excel")?.addEventListener("click", () => {
    if (lastUploadResult.length === 0) return;
    const exportData = lastUploadResult.map(item => ({
      "Mã Người": item.userId,
      "Họ Tên": item.fullName,
      "Mã Nhóm": item.groupId,
      "Mã Kích Hoạt (8 Ký Tự)": item.activationCode,
      "Trạng Thái": item.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Ma_Kich_Hoat");
    XLSX.writeFile(wb, "Danh_Sach_Ma_Kich_Hoat.xlsx");
  });
}

function renderUploadResultTable(list) {
  const tbody = document.querySelector("#result-table tbody");
  if (!tbody) return;
  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>${item.userId}</strong></td>
      <td>${item.fullName}</td>
      <td>${item.groupId}</td>
      <td style="color: var(--primary); font-weight: bold;">${item.activationCode}</td>
    </tr>
  `).join("");
  document.getElementById("upload-result-card")?.classList.remove("hidden");
}
