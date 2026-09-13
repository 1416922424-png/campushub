async function renderProfile(view) {
  if (!APP_TOKEN.isLoggedIn()) {
    location.hash = '#/login?redirect=' + encodeURIComponent(location.hash);
    return;
  }

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const user = await api.user.getMe();
    setCurrentUser({
      ...getCurrentUser(),
      id: user.id,
      nickName: user.nickname,
      avatarUrl: user.avatarUrl,
      school: user.school,
      grade: user.grade
    });

    view.innerHTML = `
      <div class="page-header">
        <div class="title" style="padding-right:0;">个人中心</div>
      </div>
      <div class="card profile-card">
        <button class="profile-avatar" id="profile-avatar-picker" type="button" aria-label="更换头像" style="border:0;padding:0;position:relative;overflow:hidden;cursor:pointer;">
          ${user.avatarUrl ? `<img src="${escapeHtml(getImageUrl(user.avatarUrl))}" alt="${escapeHtml(user.nickname)}" style="width:100%;height:100%;object-fit:cover;display:block;">` : escapeHtml(avatarText(user.nickname))}
          <span class="profile-avatar-edit" style="position:absolute;inset:auto 0 0;padding:3px 0;background:rgba(45,42,38,.62);color:#fff;font-size:11px;line-height:15px;font-weight:500;">更换</span>
        </button>
        <input id="profile-avatar-input" type="file" accept="image/*" hidden>
        <div class="profile-avatar-hint" style="margin:-2px 0 10px;color:var(--text-muted);font-size:12px;">点击头像更换照片</div>
        <div class="profile-name-row">
          <div class="profile-name" id="profile-name">${escapeHtml(user.nickname)}</div>
          <button class="profile-name-edit" id="profile-name-edit" type="button">编辑</button>
        </div>
        <div class="profile-school">${user.school} · ${user.grade}</div>
      </div>
      <div class="card" style="display:flex;padding:0;overflow:hidden;">
        <a class="stat-item" href="#/my-posts" style="flex:1;text-align:center;padding:16px 0;border-right:1px solid var(--border);color:inherit;">
          <div style="font-size:20px;font-weight:700;">${user.postCount || 0}</div>
          <div style="font-size:12px;color:var(--text-muted);">发布</div>
        </a>
        <a class="stat-item" href="#/my-favorites" style="flex:1;text-align:center;padding:16px 0;border-right:1px solid var(--border);color:inherit;">
          <div style="font-size:20px;font-weight:700;">${user.favoriteCount || 0}</div>
          <div style="font-size:12px;color:var(--text-muted);">收藏</div>
        </a>
        <a class="stat-item" href="#/my-buddies" style="flex:1;text-align:center;padding:16px 0;color:inherit;">
          <div style="font-size:20px;font-weight:700;">${user.buddyCount || 0}</div>
          <div style="font-size:12px;color:var(--text-muted);">搭子</div>
        </a>
      </div>
      <div class="card-flat">
        <a class="menu-item" href="#/messages">
          <span>消息通知</span>
          <span>›</span>
        </a>
        <a class="menu-item" href="#/settings">
          <span>账号设置</span>
          <span>›</span>
        </a>
      </div>
      <div class="card-flat" style="margin-top:12px;">
        <a class="menu-item" href="#/feedback">
          <span>反馈建议</span>
          <span>›</span>
        </a>
        <a class="menu-item" href="#/about">
          <span>关于我们</span>
          <span>›</span>
        </a>
      </div>
      <div style="padding:20px 16px;">
        <button class="btn btn-primary btn-block" id="logout-btn">退出登录</button>
      </div>
      <div class="bottom-safe"></div>
    `;

    const avatarPicker = document.getElementById('profile-avatar-picker');
    const avatarInput = document.getElementById('profile-avatar-input');
    const nameEl = document.getElementById('profile-name');
    const nameEditBtn = document.getElementById('profile-name-edit');
    let savedAvatarMarkup = avatarPicker.innerHTML;

    const chooseAvatar = () => avatarInput.click();
    avatarPicker.addEventListener('click', chooseAvatar);
    avatarPicker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chooseAvatar();
      }
    });

    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件');
        avatarInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('头像不能超过 5MB');
        avatarInput.value = '';
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      avatarPicker.classList.add('is-uploading');
      avatarPicker.innerHTML = `<img src="${previewUrl}" alt="${escapeHtml(user.nickname)}" style="width:100%;height:100%;object-fit:cover;display:block;"><span class="profile-avatar-edit" style="position:absolute;inset:auto 0 0;padding:3px 0;background:rgba(45,42,38,.62);color:#fff;font-size:11px;line-height:15px;font-weight:500;">上传中</span>`;
      try {
        const uploadedUrl = await api.upload(file);
        const updated = await api.user.updateMe({ avatarUrl: uploadedUrl });
        user.avatarUrl = updated.avatarUrl || uploadedUrl;
        savedAvatarMarkup = `<img src="${escapeHtml(getImageUrl(user.avatarUrl))}" alt="${escapeHtml(user.nickname)}" style="width:100%;height:100%;object-fit:cover;display:block;"><span class="profile-avatar-edit" style="position:absolute;inset:auto 0 0;padding:3px 0;background:rgba(45,42,38,.62);color:#fff;font-size:11px;line-height:15px;font-weight:500;">更换</span>`;
        avatarPicker.innerHTML = savedAvatarMarkup;
        setCurrentUser({
          ...getCurrentUser(),
          id: user.id,
          nickName: user.nickname,
          avatarUrl: user.avatarUrl,
          school: user.school,
          grade: user.grade
        });
        showToast('头像已更新');
      } catch (err) {
        avatarPicker.innerHTML = savedAvatarMarkup;
      } finally {
        avatarPicker.classList.remove('is-uploading');
        URL.revokeObjectURL(previewUrl);
        avatarInput.value = '';
      }
    });

    nameEditBtn.addEventListener('click', async () => {
      const currentName = user.nickname || '';
      const nextName = window.prompt('请输入新的昵称（2-20个字符）', currentName);
      if (nextName === null) return;
      const nickname = nextName.trim();
      if (nickname.length < 2 || nickname.length > 20) {
        showToast('昵称需要 2-20 个字符');
        return;
      }
      if (nickname === currentName) return;

      nameEditBtn.disabled = true;
      nameEditBtn.textContent = '保存中';
      try {
        const updated = await api.user.updateMe({ nickname });
        user.nickname = updated.nickname || nickname;
        nameEl.textContent = user.nickname;
        setCurrentUser({
          ...getCurrentUser(),
          id: user.id,
          nickName: user.nickname,
          avatarUrl: user.avatarUrl,
          school: user.school,
          grade: user.grade
        });
        showToast('昵称已更新');
      } catch (err) {
        // api.request 已显示错误提示
      } finally {
        nameEditBtn.disabled = false;
        nameEditBtn.textContent = '编辑';
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      APP_TOKEN.removeToken();
      localStorage.removeItem('userInfo');
      showToast('已退出登录');
      location.hash = '#/';
    });
  } catch (err) {
    if (err.message === '用户不存在' || err.message === '登录已过期') {
      APP_TOKEN.removeToken();
      localStorage.removeItem('userInfo');
      view.innerHTML = `
        <div class="page-error profile-session-expired">
          <div>登录状态已失效，请重新登录</div>
          <button class="btn btn-primary" id="profile-relogin">重新登录</button>
        </div>
      `;
      document.getElementById('profile-relogin').addEventListener('click', () => {
        location.hash = '#/login?redirect=' + encodeURIComponent('#/profile');
      });
      return;
    }
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/profile', renderProfile);
