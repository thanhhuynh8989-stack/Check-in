/**
 * leader-auto-auth.js - Module Xử Lý Đăng Ký Tự Động Qua Email Giáo Dục (.edu.vn) & OTP
 */
const LeaderAutoAuth = (() => {
  
  // Kiểm tra định dạng email giáo dục
  function isEduEmail(email) {
    if (!email) return false;
    return String(email).trim().toLowerCase().endsWith(".edu.vn");
  }

  // Xử lý gửi OTP và Xác thực Đăng Ký
  async function handleAutoRegisterFlow(formData) {
    const { fullName, email, password, customSheetUrl } = formData;
    const apiUrl = typeof WEB_APP_URL !== "undefined" ? WEB_APP_URL : window.WEB_APP_URL;

    // 1. Kiểm tra nếu không phải Email Giáo Dục -> Hướng dẫn liên hệ Admin
    if (!isEduEmail(email)) {
      alert("⚠️ Email của bạn không phải là Email Giáo Dục (.edu.vn)!\n\nVui lòng liên hệ tác giả qua email: thanhhuynh8989@gmail.com để được cấp quyền và duyệt tài khoản thủ công.");
      return { success: false, handled: true };
    }

    // 2. Gửi yêu cầu lấy mã OTP cho Email Giáo Dục
    try {
      console.log("🚀 [OTP REGISTER] Gửi yêu cầu OTP cho:", email);
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "sendLeaderOTP",
          email: email
        })
      });
      const data = await res.json();

      if (!data.success) {
        alert("Lỗi gửi OTP: " + (data.error || "Không thể gửi email OTP!"));
        return { success: false, handled: true };
      }

      // 3. Hiển thị hộp thoại yêu cầu nhập OTP 6 số
      const otpInput = prompt(`Mã OTP 6 chữ số đã được gửi tới email ${email}.\nVui lòng kiểm tra Hộp thư (bao gồm cả thư rác/Spam) và nhập mã vào đây:`);

      if (!otpInput || otpInput.trim() === "") {
        alert("Bạn đã hủy thao tác nhập mã OTP!");
        return { success: false, handled: true };
      }

      // 4. Gửi mã OTP xác nhận đăng ký lên Backend
      const verifyRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "verifyLeaderOTP",
          email: email,
          otp: otpInput.trim(),
          fullName: fullName,
          password: password,
          customSheetUrl: customSheetUrl
        })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        alert("🎉 " + verifyData.message + "\nTài khoản của bạn đã được kích hoạt thành công!");
        return { success: true, handled: true };
      } else {
        alert("Xác thực OTP thất bại: " + verifyData.error);
        return { success: false, handled: true };
      }

    } catch (err) {
      alert("Lỗi kết nối máy chủ xác thực OTP: " + err.toString());
      return { success: false, handled: true };
    }
  }

  return {
    isEduEmail,
    handleAutoRegisterFlow
  };
})();
