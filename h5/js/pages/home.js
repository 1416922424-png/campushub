function formatPost(post) {
  const author = post.author || {};
  return {
    id: post.id,
    avatar: renderAvatar(author.avatarUrl, author.nickname),
    nickname: author.nickname || '匿名同学',
    schoolGrade: `${post.school || author.school || ''} · ${post.grade || author.grade || ''}`,
    time: timeAgo(post.createdAt),
    title: post.title,
    summary: post.content,
    images: post.images || [],
    likeCount: post.likeCount || 0,
    commentCount: post.commentCount || 0,
    liked: post.liked
  };
}

async function renderHome(view, params = {}) {
  const user = getCurrentUser();
  const school = user.school || APP_CONFIG.schools[0];
  const grade = user.grade || APP_CONFIG.grades[1];

  view.innerHTML = `
    <div class="home-header">
      <div class="logo-bar">
        <div class="logo">金乡校园圈</div>
      </div>
      <div class="search-box" id="home-search">
        <span>🔍</span>
        <input type="text" placeholder="搜索帖子、题目、闲置、搭子..." id="search-input">
      </div>
      <div class="filter-bar">
        <select id="school-select">
          ${APP_CONFIG.schools.map(s => `<option value="${s}" ${s === school ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select id="grade-select">
          ${APP_CONFIG.grades.map(g => `<option value="${g}" ${g === grade ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="category-grid">
      <a class="category-item" href="#/?type=gossip">
        <div class="category-icon">🍉</div><div class="category-label">吃瓜捞人</div>
      </a>
      <a class="category-item" href="#/?type=lostfound">
        <div class="category-icon">🔎</div><div class="category-label">寻物启事</div>
      </a>
      <a class="category-item" href="#/questions">
        <div class="category-icon">✏️</div>
        <div class="category-label">题目讲解</div>
      </a>
      <a class="category-item" href="#/idle">
        <div class="category-icon">🛍️</div>
        <div class="category-label">闲置出售</div>
      </a>
      <a class="category-item" href="#/buddies">
        <div class="category-icon">🙌</div>
        <div class="category-label">找搭子</div>
      </a>
      <a class="category-item" href="#/search">
        <div class="category-icon">🔍</div>
        <div class="category-label">全站搜索</div>
      </a>
    </div>

    <div class="section-title" style="margin:0 16px 8px;font-weight:600;">热门帖子</div>
    <div class="post-list" id="post-list">
      <div class="pull-down-tip">下拉刷新</div>
      <div id="post-items"></div>
      <div class="load-more" id="load-more">上拉加载更多</div>
    </div>
    <div class="bottom-safe"></div>
  `;

  let page = 1;
  let loading = false;
  let hasMore = true;
  let posts = [];

  const itemsEl = document.getElementById('post-items');
  const loadMoreEl = document.getElementById('load-more');

  const renderItems = () => {
    if (posts.length === 0) {
      itemsEl.innerHTML = '<div class="empty-state">暂无内容，来发布第一条吧～</div>';
      return;
    }
    itemsEl.innerHTML = posts.map(p => `
      <div class="post-item" data-id="${p.id}">
        <div class="post-header">
          <div class="avatar">${p.avatar}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(p.nickname)}</div>
            <div class="post-info">${escapeHtml(p.schoolGrade)} · ${p.time}</div>
          </div>
        </div>
        <div class="post-title">${escapeHtml(p.title)}</div>
        <div class="post-summary">${escapeHtml(p.summary)}</div>
        ${p.images.length ? `<div class="post-images">${p.images.map((url, idx) => renderImage(url, idx)).join('')}</div>` : ''}
        <div class="post-actions">
          <span class="action ${p.liked ? 'active' : ''}" data-action="like" data-id="${p.id}">
            ${p.liked ? '♥' : '♡'} ${p.likeCount}
          </span>
          <span class="action">💬 ${p.commentCount}</span>
          <span class="action" data-action="share" data-id="${p.id}">↗ 分享</span>
        </div>
      </div>
    `).join('');

    bindEvents();
  };

  const bindEvents = () => {
    itemsEl.querySelectorAll('.post-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="like"]') || e.target.closest('[data-action="share"]') || e.target.closest('.image-wrap')) return;
        location.hash = `#/post-detail?id=${item.dataset.id}`;
      });
    });

    itemsEl.querySelectorAll('[data-action="like"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!requireLogin()) return;
        const id = parseInt(btn.dataset.id, 10);
        try {
          await api.like.toggle('post', id);
          const liked = btn.classList.contains('active');
          const count = parseInt(btn.textContent.replace(/\D/g, '')) || 0;
          btn.classList.toggle('active');
          btn.innerHTML = `${liked ? '♡' : '♥'} ${liked ? Math.max(0, count - 1) : count + 1}`;
        } catch (err) {}
      });
    });

    itemsEl.querySelectorAll('.image-wrap').forEach(wrap => {
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = wrap.closest('.post-item');
        const post = posts.find(p => p.id === parseInt(item.dataset.id, 10));
        if (post && post.images.length) openImageViewer(post.images, parseInt(wrap.dataset.index, 10));
      });
    });
  };

  const loadPosts = async (reset = false) => {
    if (loading) return;
    loading = true;
    if (reset) {
      page = 1;
      hasMore = true;
      posts = [];
      itemsEl.innerHTML = '<div class="page-loading">加载中...</div>';
    }
    loadMoreEl.textContent = '加载中...';

    try {
      const currentSchool = document.getElementById('school-select').value;
      const currentGrade = document.getElementById('grade-select').value;
      const res = await api.post.list({ school: currentSchool, grade: currentGrade, type: params.type || '', sort: 'hot', page, limit: 10 });
      const list = (res.list || []).map(formatPost);
      if (list.length < 10) hasMore = false;
      posts = reset ? list : posts.concat(list);
      page++;
      renderItems();
      loadMoreEl.textContent = hasMore ? '上拉加载更多' : '没有更多了';
    } catch (err) {
      loadMoreEl.textContent = '加载失败，点击重试';
    } finally {
      loading = false;
    }
  };

  // 下拉刷新
  let startY = 0;
  let pullDown = false;
  const listEl = document.getElementById('post-list');
  const tipEl = listEl.querySelector('.pull-down-tip');

  listEl.addEventListener('touchstart', (e) => {
    if (window.scrollY <= 0) startY = e.touches[0].clientY;
  }, { passive: true });

  listEl.addEventListener('touchmove', (e) => {
    if (startY && window.scrollY <= 0) {
      const diff = e.touches[0].clientY - startY;
      if (diff > 60) {
        pullDown = true;
        tipEl.textContent = '松开刷新';
        tipEl.style.transform = `translateY(${Math.min(diff / 2, 40)}px)`;
      }
    }
  }, { passive: true });

  listEl.addEventListener('touchend', async () => {
    if (pullDown) {
      pullDown = false;
      tipEl.textContent = '刷新中...';
      await loadPosts(true);
      tipEl.style.transform = 'translateY(0)';
      tipEl.textContent = '下拉刷新';
    }
    startY = 0;
  });

  // 无限滚动
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) loadPosts();
  }, { rootMargin: '50px' });
  observer.observe(loadMoreEl);

  document.getElementById('school-select').addEventListener('change', () => {
    const u = getCurrentUser(); u.school = document.getElementById('school-select').value; setCurrentUser(u);
    loadPosts(true);
  });

  document.getElementById('grade-select').addEventListener('change', () => {
    const u = getCurrentUser(); u.grade = document.getElementById('grade-select').value; setCurrentUser(u);
    loadPosts(true);
  });

  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const keyword = e.target.value.trim();
      if (keyword) location.hash = `#/search?keyword=${encodeURIComponent(keyword)}`;
    }
  });

  await loadPosts(true);
}

ROUTER.registerRoute('/', renderHome);
