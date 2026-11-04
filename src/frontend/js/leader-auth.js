let parsedMembersData = [];
let lastUploadResult = [];
let isSheetVerified = false;
let globalLeaderGroups = [];

document.addEventListener("DOMContentLoaded", () => {
  checkLeaderAuth();
  setupTabEvents();
  setupLeaderAuthEvents();
  setupUploadTabEvents();
  setupRegisterPageEvents();
});

function setupTabEvents() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      
      const targetBtn = e.currentTarget;
      targetBtn.classList.add("active");
      document.getElementById(targetBtn.dataset.tab)?.classList.remove("hidden");
    });
  });
}

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
  document.getElementById("btn-leader-login")?.addEventListener("click", async () => {
    const email = document.getElementById("leader-login-email").value.trim();
    const password = document.getElementById("leader-login-pass").value.trim();

    if (!email || !password) return alert("Vui lòng nhập Email và Mật khẩu!");

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

  document.getElementById("btn-leader-logout")?.addEventListener("click", () => {
    localStorage.removeItem("CHECKIN_LEADER_SESSION");
    checkLeaderAuth();
  });

  document.getElementById("btn-refresh-groups")?.addEventListener("click", loadLeaderGroups);
}

// 1. Tải Danh Sách Nhóm & Đổ vào Dropdown + Render Cards
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
      globalLeaderGroups = data.groups || [];
      populateGroupSelectDropdown(globalLeaderGroups);
      renderLeaderGroups(globalLeaderGroups);
    }
  } catch (err) {
    console.error("Lỗi tải danh sách nhóm:", err);
  }
}

// Đổ dữ liệu vào Dropdown chọn nhóm ở Tab 1 (Điểm danh)
function populateGroupSelectDropdown(groups) {
  const selectElem = document.getElementById("group-id");
  if (!selectElem) return;

  if (!groups || groups.length === 0) {
    selectElem.innerHTML = '<option value="">-- Bạn chưa có nhóm nào (Hãy Upload Excel trước) --</option>';
    return;
  }

  selectElem.innerHTML = groups.map(g => `
    <option value="${g.groupId}">${g.groupName} (${g.groupId})</option>
  `).join("");
}

// Render Các Thẻ Nhóm có ĐẦY ĐỦ NÚT THAO TÁC
function renderLeaderGroups(groups) {
  const container = document.getElementById("groups-grid-container");
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = '<p class="sub-text">Bạn chưa phụ trách nhóm nào. Hãy sang tab "Nhập/Xuất Data" để Upload danh sách mới!</p>';
    return;
  }

  container.innerHTML = groups.map(g => `
    <div class="card" style="border: 1px solid #aecbfa; background: #f8faff; margin-bottom: 12px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="color: var(--primary); margin: 0;">${g.groupName} <span style="font-size: 0.85rem; color: #666;">(${g.groupId})</span></h3>
        <span class="badge" style="background: #e8f0fe; color: #1a73e8;">Sheet: ${g.customSheetUrl ? 'Riêng' : 'Master'}</span>
      </div>

      <!-- Khung Chứa Danh Sách Thành Viên (Ẩn Mặc Định) -->
      <div id="members-box-${g.groupId}" class="hidden" style="margin: 10px 0; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #dadce0;">
        <p class="sub-text">Đang tải thành viên...</p>
      </div>

      <!-- Nút Thao Tác Trực Tiếp Bổ Sung -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
        <button onclick="quickStartSession('${g.groupId}')" class="btn primary" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">🚀 Điểm Danh Nhanh</button>
        <button onclick="toggleGroupMembers('${g.groupId}')" class="btn secondary" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">👁️ Xem Thành Viên</button>
        <button onclick="downloadGroupAttendanceReport('${g.groupId}')" class="btn secondary" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">📥 Tải KQ Điểm Danh</button>
        <button onclick="confirmDeleteGroup('${g.groupId}')" class="btn danger" style="width: auto; padding: 6px 12px; font-size: 0.8rem;">🗑️ Xóa Nhóm</button>
      </div>
    </div>
  `).join("");
}

// 2. Thao Tác: Điểm Danh Nhanh Từng Nhóm
function quickStartSession(groupId) {
  const selectElem = document.getElementById("group-id");
  if (selectElem) selectElem.value = groupId;

  // Chuyển sang Tab 1
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  
  const tab1Btn = document.querySelector('.tab-btn[data-tab="tab-session"]');
  if (tab1Btn) tab1Btn.classList.add("active");
  document.getElementById("tab-session")?.classList.remove("hidden");
}

// 3. Thao Tác: Bật/Tắt Hiển Thị Danh Sách Thành Viên
async function toggleGroupMembers(groupId) {
  const box = document.getElementById(`members-box-${groupId}`);
  if (!box) return;

  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = '<p class="sub-text">⏳ Đang lấy danh sách từ hệ thống...</p>';

  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "getGroupMembers", email: leaderEmail, groupId: groupId })
    });
    const data = await res.json();

    if (data.success && data.members.length > 0) {
      box.innerHTML = `
        <table class="data-table" style="margin: 0;">
          <thead>
            <tr><th>Mã NV/HS</th><th>Họ và Tên</th></tr>
          </thead>
          <tbody>
            ${data.members.map(m => `<tr><td><strong>${m.userId}</strong></td><td>${m.fullName}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else {
      box.innerHTML = '<p class="sub-text">Nhóm này chưa có thành viên nào.</p>';
    }
  } catch (err) {
    box.innerHTML = '<p class="sub-text" style="color: var(--danger);">Lỗi tải danh sách!</p>';
  }
}

// 4. Thao Tác: Xuất File Excel Kết Quả Điểm Danh Của Nhóm
async function downloadGroupAttendanceReport(groupId) {
  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "getGroupAttendanceReport", email: leaderEmail, groupId: groupId })
    });
    const data = await res.json();

    if (data.success && data.records.length > 0) {
      const exportData = data.records.map(r => ({
        "Ticket ID": r.ticketId,
        "Thời Gian": r.timestamp,
        "Mã Nhóm": r.groupId,
        "Mã Thành Viên": r.userId,
        "Số Phút Trễ": r.lateMinutes,
        "Khoảng Cách (m)": r.distance,
        "Trạng Thái": r.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KQ_Diem_Danh");
      XLSX.writeFile(wb, `Ket_Qua_Diem_Danh_${groupId}.xlsx`);
    } else {
      alert("Chưa có dữ liệu điểm danh nào cho nhóm này!");
    }
  } catch (err) {
    alert("Lỗi tải báo cáo: " + err.toString());
  }
}

// 5. Thao Tác: Xóa Nhóm
async function confirmDeleteGroup(groupId) {
  if (!confirm(`Bạn có chắc chắn muốn XÓA nhóm ${groupId}? Thao tác này sẽ bỏ liên kết thành viên khỏi nhóm.`)) return;

  const leaderEmail = localStorage.getItem("CHECKIN_LEADER_SESSION");
  const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "deleteGroup", email: leaderEmail, groupId: groupId })
    });
    const data = await res.json();
    alert(data.message);
    loadLeaderGroups(); // Refresh lại giao diện
  } catch (err) {
    alert("Lỗi xóa nhóm: " + err.toString());
  }
}

// 6. Xử lý Upload Data & Đăng ký (Giữ nguyên)
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

function setupRegisterPageEvents() {
  document.getElementById("btn-verify-sheet")?.addEventListener("click", async () => {
    const customSheetUrl = document.getElementById("sheet-url")?.value.trim();
    const statusText = document.getElementById("sheet-verify-status");

    if (!customSheetUrl) return alert("Vui lòng dán Link Google Sheet riêng trước!");

    if (statusText) statusText.textContent = "⏳ Đang kiểm tra...";

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
          statusText.textContent = `✅ Kết nối thành công: "${data.title}"`;
        }
        alert("Kết nối Google Sheet thành công!");
      } else {
        isSheetVerified = false;
        if (statusText) {
          statusText.style.color = "var(--danger)";
          statusText.textContent = `❌ Lỗi: ${data.error}`;
        }
        alert("Không thể truy cập Google Sheet riêng!");
      }
    } catch (err) {
      alert("Lỗi kiểm tra Sheet: " + err.toString());
    }
  });

  document.getElementById("btn-register-leader")?.addEventListener("click", async () => {
    const fullName = document.getElementById("leader-name")?.value.trim();
    const email = document.getElementById("leader-email")?.value.trim();
    const pass = document.getElementById("leader-pass")?.value.trim();
    const passConfirm = document.getElementById("leader-pass-confirm")?.value.trim();
    const customSheetUrl = document.getElementById("sheet-url")?.value.trim();

    if (!fullName || !email || !pass) return alert("Vui lòng điền đầy đủ thông tin!");
    if (pass.length < 6) return alert("Mật khẩu tối thiểu 6 ký tự!");
    if (pass !== passConfirm) return alert("Mật khẩu xác nhận không khớp!");

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
