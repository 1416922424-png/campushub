const BUDDY_TYPES = [
  { key: 'all', label: '全部' },
  { key: 'movie', label: '电影' },
  { key: 'study', label: '学习' },
  { key: 'dining', label: '吃饭' },
  { key: 'sports', label: '运动' },
  { key: 'game', label: '游戏' },
  { key: 'other', label: '其他' }
];

function formatBuddy(b) {
  const author = b.author || {};
  const typeMap = { movie: '电影', study: '学习', dining: '吃饭', sports: '运动', game: '游戏', other: '其他' };
  return {
    id: b.id,
    typeName: typeMap[b.type] || '其他',
    title: b.title,
    content: b.content,
    school: b.school || author.school,
    grade: b.grade || author.grade,
    avatar: author.avatarUrl ? `<img src="${escapeHtml(author.avatarUrl)}" alt="">` : escapeHtml(avatarText(author.nickname)),
    nickname: author.nickname || '匿名同学',
    publishTime: timeAgo(b.createdAt),
    commentCount: b.commentCount || 0
  };
}

async function renderBuddies(view) {
  let activeType = 'all';

  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">找搭子</div>
    </div>
    <div class="tabs" style="overflow-x:auto;flex-wrap:nowrap;">
      ${BUDDY_TYPES.map(t => `<div class="tab ${t.key === activeType ? 'active' : ''}" data-type="${t.key}" style="white-space:nowrap;">${t.label}</div>`).join('')}
    </div>
    <div class="post-list" id="buddy-list">
      <div class="page-loading">加载中...</div>
    </div>
    <div class="bottom-safe"></div>
  `;

  const loadBuddies = async () => {
    const listEl = document.getElementById('buddy-list');
    listEl.innerHTML = '<div class="page-loading">加载中...</div>';
    try {
      const params = { page: 1, limit: 50 };
      if (activeType !== 'all') params.type = activeType;
      const res = await api.buddy.list(params);
      const list = (res.list || []).map(formatBuddy);

      if (list.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无搭子</div>';
        return;
      }

      listEl.innerHTML = list.map(b => `
        <div class="buddy-item" data-id="${b.id}">
          <div class="post-header">
            <div class="avatar">${b.avatar}</div>
            <div class="post-meta">
              <div class="post-author">${escapeHtml(b.nickname)}</div>
              <div class="post-info">${b.school || ''} · ${b.grade || ''} · ${b.publishTime}</div>
            </div>
            <span class="tag">${b.typeName}</span>
          </div>
          <div class="post-title" style="margin-top:10px;">${escapeHtml(b.title)}</div>
          <div class="post-summary">${escapeHtml(b.content)}</div>
          <div class="post-actions" style="margin-top:10px;">
            <span class="action">💬 ${b.commentCount}</span>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.buddy-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          location.hash = `#/post-detail?id=${id}`;
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeType = tab.dataset.type;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadBuddies();
    });
  });

  await loadBuddies();
}

ROUTER.registerRoute('/buddies', renderBuddies);
