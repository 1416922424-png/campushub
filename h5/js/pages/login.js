function renderLogin(view, params) {
  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">登录</div>
    </div>
    <div style="padding:40px 24px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:var(--primary);margin-bottom:8px;">金乡校园圈</div>
      <div style="color:var(--text-muted);margin-bottom:40px;">金乡县城校园生活社区</div>

      <div class="form-group" style="text-align:left;">
        <label class="form-label">学校</label>
        <select class="form-select" id="login-school">
          ${APP_CONFIG.schools.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>

      <div class="form-group" style="text-align:left;">
        <label class="form-label">年级</label>
        <select class="form-select" id="login-grade">
          ${APP_CONFIG.grades.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>

      <label style="display:flex;align-items:flex-start;font-size:13px;color:var(--text-muted);margin:16px 0;text-align:left;">
        <input type="checkbox" id="agree" style="margin-right:8px;margin-top:2px;">
        我已阅读并同意
        <a href="#/user-agreement" style="color:var(--primary);">用户协议</a>
        和
        <a href="#/privacy-policy" style="color:var(--primary);">隐私政策</a>
      </label>

      <button class="btn btn-primary btn-block" id="login-btn" style="margin-top:8px;">微信一键登录</button>
      <div style="margin-top:20px;font-size:13px;color:var(--text-muted);">H5 演示环境：无需真实微信授权</div>
    </div>
  `;

  document.getElementById('login-btn').addEventListener('click', async () => {
    const agree = document.getElementById('agree').checked;
    if (!agree) {
      showToast('请先同意用户协议和隐私政策');
      return;
    }
    const school = document.getElementById('login-school').value;
    const grade = document.getElementById('login-grade').value;

    try {
      const code = `h5_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const res = await api.auth.login(code, school, grade);
      APP_TOKEN.setToken(res.token);
      setCurrentUser({
        id: res.user.id,
        nickName: res.user.nickname,
        avatarUrl: res.user.avatarUrl,
        school: res.user.school,
        grade: res.user.grade
      });
      showToast('登录成功');
      const redirect = params.redirect || '#/';
      location.hash = decodeURIComponent(redirect);
    } catch (err) {}
  });
}

ROUTER.registerRoute('/login', renderLogin);
