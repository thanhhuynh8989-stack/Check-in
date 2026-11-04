/**
 * AdminService.gs - Module Quản Trị Viên (Admin)
 */

// Phê duyệt tài khoản Leader
function handleApproveLeader(adminEmail, targetEmail) {
  const roleInfo = checkStaffRole(adminEmail);
  if (roleInfo.role !== "ADMIN") {
    return { success: false, error: "Chỉ ADMIN mới có quyền phê duyệt Leader!" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName("Staff");
  const data = staffSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(targetEmail).trim().toLowerCase()) {
      staffSheet.getRange(i + 1, 2).setValue("LEADER");
      return { success: true, message: `Đã duyệt ${targetEmail} thành LEADER!` };
    }
  }
  return { success: false, error: "Không tìm thấy yêu cầu đăng ký!" };
}

// Reset thiết bị cho Thành viên (Cho phép đăng ký lại trên máy mới)
function handleResetDevice(adminOrLeaderEmail, userId) {
  const roleInfo = checkStaffRole(adminOrLeaderEmail);
  if (!roleInfo.isStaff) {
    return { success: false, error: "Bạn không có quyền thực hiện thao tác này!" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rosterSheet = ss.getSheetByName("Roster");
  const data = rosterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === String(userId).trim().toUpperCase()) {
      // Xóa DeviceID cũ
      rosterSheet.getRange(i + 1, 4).setValue("");
      
      // Tạo Mã kích hoạt 8 ký tự mới
      const newActivationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const codeHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, newActivationCode));
      rosterSheet.getRange(i + 1, 3).setValue(codeHash);

      return {
        success: true,
        userId: userId,
        newActivationCode: newActivationCode,
        message: "Đã Reset thiết bị. Vui lòng gửi mã kích hoạt mới cho thành viên!"
      };
    }
  }
  return { success: false, error: "Không tìm thấy Mã người dùng trong Roster!" };
}
