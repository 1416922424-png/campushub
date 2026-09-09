// 占位路由，避免 undefined
ROUTER.registerRoute('/search', async (view, params) => {
  const keyword = params.keyword || '';
  view.innerHTML = '<div class="page-loading">搜索中...</div>';
  try {
    const res = await api.search.global({ keyword, page: 1, limit: 30 });
    const posts = (res.posts || []).map(formatPost);
    const questions = (res.questions || []).map(formatQuestion);
    const idle = (res.idle || []).map(formatIdle);

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/">‹</a>
        <div class="title">搜索结果</div>
      </div>
      <div style="padding:16px;">
        <div class="form-group">
          <input class="form-input" type="text" id="search-keyword" value="${escapeHtml(keyword)}" placeholder="搜索关键词">
        </div>
        ${posts.length ? `<div style="font-weight:600;margin:16px 0 8px;">帖子</div>` + posts.map(p => `
          <div class="post-item" data-id="${p.id}" data-type="post">
            <div class="post-title">${escapeHtml(p.title)}</div>
            <div class="post-summary">${escapeHtml(p.summary)}</div>
          </div>
        `).join('') : ''}
        ${questions.length ? `<div style="font-weight:600;margin:16px 0 8px;">题目</div>` + questions.map(q => `
          <div class="question-item" data-id="${q.id}" data-type="question">
            <div class="post-title">${escapeHtml(q.title)}</div>
          </div>
        `).join('') : ''}
        ${idle.length ? `<div style="font-weight:600;margin:16px 0 8px;">闲置</div>` + idle.map(it => `
          <div class="idle-item" data-id="${it.id}" data-type="idle">
            <div class="post-title">${escapeHtml(it.title)}</div>
          </div>
        `).join('') : ''}
        ${!posts.length && !questions.length && !idle.length ? '<div class="empty-state">未找到相关内容</div>' : ''}
      </div>
    `;

    document.getElementById('search-keyword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const kw = e.target.value.trim();
        if (kw) location.hash = `#/search?keyword=${encodeURIComponent(kw)}`;
      }
    });

    view.querySelectorAll('[data-type="post"]').forEach(el => {
      el.addEventListener('click', () => location.hash = `#/post-detail?id=${el.dataset.id}`);
    });
    view.querySelectorAll('[data-type="question"]').forEach(el => {
      el.addEventListener('click', () => location.hash = `#/question-detail?id=${el.dataset.id}`);
    });
    view.querySelectorAll('[data-type="idle"]').forEach(el => {
      el.addEventListener('click', () => location.hash = `#/idle-detail?id=${el.dataset.id}`);
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">搜索失败：${escapeHtml(err.message)}</div>`;
  }
});

ROUTER.registerRoute('/report', (view, params) => {
  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">举报</div>
    </div>
    <div style="padding:16px;">
      <div class="form-group">
        <label class="form-label">举报原因</label>
        <select class="form-select" id="report-reason">
          <option value="spam">垃圾广告</option>
          <option value="harassment">骚扰/人身攻击</option>
          <option value="inappropriate">不良信息</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">补充说明</label>
        <textarea class="form-textarea" id="report-content" placeholder="请描述举报原因..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="submit-report">提交举报</button>
    </div>
  `;

  document.getElementById('submit-report').addEventListener('click', async () => {
    try {
      await api.report.create({
        targetType: params.type || 'post',
        targetId: params.id,
        reason: document.getElementById('report-reason').value,
        content: document.getElementById('report-content').value.trim()
      });
      showToast('举报已提交');
      history.back();
    } catch (err) {}
  });
});

ROUTER.registerRoute('/feedback', (view) => {
  if (!requireLogin()) return;
  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/profile">‹</a>
      <div class="title">反馈建议</div>
    </div>
    <div style="padding:16px;">
      <div class="form-group">
        <label class="form-label">反馈内容</label>
        <textarea class="form-textarea" id="feedback-content" placeholder="请填写你的建议或遇到的问题..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="submit-feedback">提交反馈</button>
    </div>
  `;

  document.getElementById('submit-feedback').addEventListener('click', async () => {
    const content = document.getElementById('feedback-content').value.trim();
    if (!content) return;
    try {
      await api.feedback.create({ type: 'suggestion', content });
      showToast('反馈已提交');
      history.back();
    } catch (err) {}
  });
});

ROUTER.registerRoute('/user-agreement', (view) => {
  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/login">‹</a>
      <div class="title">用户协议</div>
    </div>
    <div class="card" style="line-height:1.7;">
      <p>欢迎使用金乡校园圈。本协议是你与平台之间关于使用本服务所订立的协议。</p>
      <p>1. 用户应当遵守国家法律法规，不得发布违法违规内容。</p>
      <p>2. 用户不得利用本平台进行骚扰、诈骗、侵犯他人隐私等行为。</p>
      <p>3. 平台有权对违规内容进行删除、屏蔽或限制账号使用。</p>
      <p>4. 用户在交易、交友等场景应当自行注意安全，平台不承担线下行为责任。</p>
    </div>
  `;
});

ROUTER.registerRoute('/my-posts', async (view) => {
  if (!requireLogin()) return;
  view.innerHTML = '<div class="page-loading">加载中...</div>';
  try {
    const res = await api.post.list({ page: 1, limit: 100 });
    const list = (res.list || []).filter(p => p.isAuthor).map(formatPost);
    view.innerHTML = `
      <div class="page-header"><a class="back-btn" href="#/profile">‹</a><div class="title">我的发布</div></div>
      <div class="post-list" id="my-posts-list"></div>
      <div class="bottom-safe"></div>
    `;
    const listEl = document.getElementById('my-posts-list');
    if (!list.length) {
      listEl.innerHTML = '<div class="empty-state">还没有发布过内容</div>';
      return;
    }
    listEl.innerHTML = list.map(p => `
      <div class="post-item" data-id="${p.id}">
        <div class="post-title">${escapeHtml(p.title)}</div>
        <div class="post-summary">${escapeHtml(p.summary)}</div>
        <div class="post-info" style="margin-top:8px;">${p.time} · ${p.likeCount} 赞 · ${p.commentCount} 评论</div>
      </div>
    `).join('');
    listEl.querySelectorAll('.post-item').forEach(item => {
      item.addEventListener('click', () => location.hash = `#/post-detail?id=${item.dataset.id}`);
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
});

ROUTER.registerRoute('/my-favorites', async (view) => {
  if (!requireLogin()) return;
  view.innerHTML = '<div class="page-loading">加载中...</div>';
  try {
    const res = await api.search.global({ keyword: '' });
    view.innerHTML = `
      <div class="page-header"><a class="back-btn" href="#/profile">‹</a><div class="title">我的收藏</div></div>
      <div class="empty-state">收藏功能已记录，可在详情页点击收藏</div>
    `;
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
});

ROUTER.registerRoute('/my-buddies', async (view) => {
  if (!requireLogin()) return;
  view.innerHTML = '<div class="page-loading">加载中...</div>';
  try {
    const res = await api.buddy.list({ page: 1, limit: 100 });
    const list = (res.list || []).filter(b => b.isAuthor).map(formatBuddy);
    view.innerHTML = `
      <div class="page-header"><a class="back-btn" href="#/profile">‹</a><div class="title">我的搭子</div></div>
      <div class="post-list" id="my-buddies-list"></div>
      <div class="bottom-safe"></div>
    `;
    const listEl = document.getElementById('my-buddies-list');
    if (!list.length) {
      listEl.innerHTML = '<div class="empty-state">还没有发布过搭子</div>';
      return;
    }
    listEl.innerHTML = list.map(b => `
      <div class="buddy-item" data-id="${b.id}">
        <div class="post-title">${escapeHtml(b.title)}</div>
        <div class="post-summary">${escapeHtml(b.content)}</div>
        <div class="post-info" style="margin-top:8px;">${b.publishTime}</div>
      </div>
    `).join('');
    listEl.querySelectorAll('.buddy-item').forEach(item => {
      item.addEventListener('click', () => location.hash = `#/post-detail?id=${item.dataset.id}`);
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
});

ROUTER.registerRoute('/settings', (view) => {
  if (!requireLogin()) return;
  view.innerHTML = `
    <div class="page-header"><a class="back-btn" href="#/profile">‹</a><div class="title">账号设置</div></div>
    <div class="card-flat" style="margin-top:12px;">
      <a class="menu-item" href="#/user-agreement"><span>用户协议</span><span>›</span></a>
      <a class="menu-item" href="#/privacy-policy"><span>隐私政策</span><span>›</span></a>
    </div>
  `;
});

ROUTER.registerRoute('/about', (view) => {
  view.innerHTML = `
    <div class="page-header"><a class="back-btn" href="#/profile">‹</a><div class="title">关于我们</div></div>
    <div class="card" style="text-align:center;line-height:1.7;">
      <div style="font-size:22px;font-weight:700;color:var(--primary);margin-bottom:8px;">金乡校园圈</div>
      <div style="color:var(--text-muted);">服务金乡县城校园生活</div>
      <div style="color:var(--text-muted);font-size:13px;margin-top:8px;">版本 v1.0.0</div>
    </div>
  `;
});

ROUTER.registerRoute('/privacy-policy', (view) => {
  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/login">‹</a>
      <div class="title">隐私政策</div>
    </div>
    <div class="card" style="line-height:1.7;">
      <p>金乡校园圈重视你的隐私保护。</p>
      <p>1. 我们会收集你的微信 openid、昵称、学校、年级等基本信息。</p>
      <p>2. 收集的信息仅用于提供服务、内容推荐和校园身份识别。</p>
      <p>3. 我们不会将个人信息出售或提供给第三方。</p>
      <p>4. 你可以随时停止使用并联系我们删除账号相关信息。</p>
    </div>
  `;
});

// 启动
ROUTER.renderRoute();
