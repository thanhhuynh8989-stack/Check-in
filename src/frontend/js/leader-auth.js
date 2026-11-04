document.getElementById("btn-register-leader")?.addEventListener("click", async () => {
  const fullName = document.getElementById("leader-name").value.trim();
  const email = document.getElementById("leader-email").value.trim();
  const groupName = document.getElementById("group-name").value.trim();
  const customSheetUrl = document.getElementById("sheet-url").value.trim();

  if (!fullName || !email || !groupName) {
    alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
    return;
  }

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registerLeader",
        fullName: fullName,
        email: email,
        groupName: groupName,
        customSheetUrl: customSheetUrl
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      window.location.href = "leader.html";
    } else {
      alert("Lỗi: " + data.error);
    }
  } catch (err) {
    alert("Không thể kết nối máy chủ: " + err.toString());
  }
});
