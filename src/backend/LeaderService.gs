/**
 * LeaderService.gs - Module Quản Lý & Đăng Ký Leader
 */

// Đăng ký Leader mới (Chờ Admin duyệt hoặc tự động kích hoạt nếu Email có trong Staff)
function handleRegisterLeader(data) {
  const email = (data.email || "").trim().toLowerCase();
  const fullName = (data.fullName || "").trim();
  const groupName = (data.groupName || "").trim();
  const customSheetUrl = (data.customSheetUrl || "").trim();

  if (!email || !fullName || !groupName) {
    return { success: false, error: "Vui lòng điền đầy đủ Email, Họ tên và Tên nhóm!" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName("Staff");
  const groupsSheet = ss.getSheetByName("Groups");

  // Check xem Email đã là Staff chưa
  const roleInfo = checkStaffRole(email);
  if (!roleInfo.isStaff) {
    // Thêm vào Tab Staff dạng Chờ duyệt (PENDING_LEADER)
    staffSheet.appendRow([email, "PENDING_LEADER", fullName, new Date()]);
  }

  // Khởi tạo Mã nhóm ngẫu nhiên
  const groupId = "GRP_" + Math.floor(1000 + Math.random() * 9000);
  
  // Kiểm tra Sheet riêng nếu có
  let sheetStatus = "NOT_CONFIGURED";
  if (customSheetUrl) {
    const verify = verifyAndPrepareCustomSheet(customSheetUrl);
    sheetStatus = verify.success ? "ACTIVE" : "ERROR";
  }

  groupsSheet.appendRow([groupId, groupName, email, customSheetUrl, sheetStatus]);

  return {
    success: true,
    groupId: groupId,
    message: roleInfo.isStaff ? "Đăng ký nhóm thành công!" : "Yêu cầu đăng ký Leader đã gửi, vui lòng chờ Admin phê duyệt!"
  };
}

// Lấy danh sách Nhóm thuộc quyền quản lý của Leader
function handleGetLeaderGroups(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groupsSheet = ss.getSheetByName("Groups");
  const data = groupsSheet.getDataRange().getValues();
  const userGroups = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
      userGroups.push({
        groupId: data[i][0],
        groupName: data[i][1],
        customSheetUrl: data[i][3],
        status: data[i][4]
      });
    }
  }
  return { success: true, groups: userGroups };
}
