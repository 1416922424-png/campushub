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
        <div class="profile-avatar">${user.avatarUrl ? `<img src="${escapeHtml(getImageUrl(user.avatarUrl))}" alt="">` : escapeHtml(avatarText(user.nickname))}</div>
        <div class="profile-name">${escapeHtml(user.nickname)}</div>
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

    document.getElementById('logout-btn').addEventListener('click', () => {
      APP_TOKEN.removeToken();
      localStorage.removeItem('userInfo');
      showToast('已退出登录');
      location.hash = '#/';
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/profile', renderProfile);
