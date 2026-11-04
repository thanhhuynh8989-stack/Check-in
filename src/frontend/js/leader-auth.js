document.getElementById("btn-register-leader")?.addEventListener("click", async () => {
  const fullName = document.getElementById("leader-name")?.value.trim();
  const email = document.getElementById("leader-email")?.value.trim();
  const customSheetUrl = document.getElementById("sheet-url")?.value.trim();

  if (!fullName || !email) {
    alert("Vui lòng nhập đầy đủ Họ tên và Email!");
    return;
  }

  try {
    // Đảm bảo lấy đúng WEB_APP_URL
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

    const res = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "registerLeader",
        fullName: fullName,
        email: email,
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

let parsedMembersData = [];
let lastUploadResult = [];

document.addEventListener("DOMContentLoaded", () => {
  setupUploadTabEvents();
});

function setupUploadTabEvents() {
  // 1. Tải File Excel Mẫu (.xlsx)
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

  // 2. Đọc File Excel khi người dùng chọn
  document.getElementById("excel-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      parsedMembersData = json.map(row => ({
        userId: String(row["MãNgười"] || row["MaNguoi"] || "").trim(),
        fullName: String(row["HọTên"] || row["HoTen"] || "").trim(),
        groupId: String(row["MãNhóm"] || row["MaNhom"] || "").trim(),
        note: String(row["GhiChú"] || row["GhiChu"] || "").trim()
      })).filter(item => item.userId !== "" && item.fullName !== "");

      if (parsedMembersData.length > 0) {
        document.getElementById("file-preview-box").classList.remove("hidden");
        document.getElementById("preview-count").textContent = parsedMembersData.length;
      } else {
        alert("File Excel không đúng định dạng cột hoặc không có dữ liệu!");
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // 3. Gửi danh sách lên Backend xử lý
  document.getElementById("btn-process-upload")?.addEventListener("click", async () => {
    const email = document.getElementById("leader-email")?.value.trim() || prompt("Nhập Email Leader của bạn:");
    if (!email) return alert("Vui lòng nhập Email Leader!");

    try {
      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "batchUploadRoster",
          email: email,
          members: parsedMembersData
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Thành công! Đã xử lý ${data.totalUploaded} thành viên (${data.newCreated} mã kích hoạt mới được sinh).`);
        lastUploadResult = data.resultCodes;
        renderUploadResultTable(data.resultCodes);
      } else {
        alert("Lỗi upload: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ: " + err.toString());
    }
  });

  // 4. Xuất File Excel Danh Sách Mã Kích Hoạt Vừa Sinh
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
