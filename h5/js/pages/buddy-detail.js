function formatBuddyComment(c) {
  const author = c.author || {};
  return {
    id: c.id,
    avatar: renderAvatar(author.avatarUrl, author.nickname),
    nickname: author.nickname || '匿名同学',
    content: c.content,
    time: timeAgo(c.createdAt)
  };
}

async function renderBuddyDetail(view, params) {
  const id = params.id;
  if (!id) {
    view.innerHTML = '<div class="page-error">缺少搭子 ID</div>';
    return;
  }

  view.innerHTML = '<div class="page-loading">加载中...</div>';
  try {
    const [buddy, commentsRes] = await Promise.all([
      api.buddy.detail(id),
      api.comment.list({ targetType: 'buddy', targetId: id, page: 1, limit: 50 })
    ]);
    const author = buddy.author || {};
    const comments = (commentsRes.list || []).map(formatBuddyComment);
    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/buddies">‹</a>
        <div class="title">搭子详情</div>
      </div>
      <div class="detail-card">
        <div class="post-header">
          <div class="avatar">${renderAvatar(author.avatarUrl, author.nickname)}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(author.nickname || '匿名同学')}</div>
            <div class="post-info">${escapeHtml(buddy.school || author.school || '')} · ${escapeHtml(buddy.grade || author.grade || '')} · ${timeAgo(buddy.createdAt)}</div>
          </div>
          ${friendActionMarkup(author.id)}
        </div>
        <div style="margin-top:10px;"><span class="tag">${escapeHtml(({movie:'电影',study:'学习',dining:'吃饭',sports:'运动',game:'游戏',other:'其他'})[buddy.type] || '其他')}</span></div>
        <div class="detail-title">${escapeHtml(buddy.title)}</div>
        <div class="detail-content">${escapeHtml(buddy.content || '')}</div>
        <div style="margin-top:16px;">
          <button class="btn btn-primary btn-block" id="buddy-chat-btn">发消息</button>
        </div>
      </div>
      <div class="comment-section">
        <div class="comment-section-title">评论 ${comments.length}</div>
        ${comments.length ? comments.map(c => `
          <div class="comment-item">
            <div class="avatar">${c.avatar}</div>
            <div class="comment-body">
              <div class="comment-header"><span class="comment-author">${escapeHtml(c.nickname)}</span><span class="comment-time">${c.time}</span></div>
              <div class="comment-content">${escapeHtml(c.content)}</div>
            </div>
          </div>
        `).join('') : '<div class="empty-state">暂无评论</div>'}
      </div>
      <div class="bottom-safe"></div>
      <div class="float-input-bar">
        <input type="text" maxlength="500" placeholder="评论一下..." id="comment-input">
        <button id="send-comment">发送</button>
      </div>
    `;

    await setupFriendButtons(view);
    document.getElementById('buddy-chat-btn').addEventListener('click', () => {
      if (!requireLogin()) return;
      if (author.id) location.hash = `#/messages?userId=${author.id}`;
    });

    const sendComment = async () => {
      if (!requireLogin()) return;
      const input = document.getElementById('comment-input');
      const button = document.getElementById('send-comment');
      const text = input.value.trim();
      if (!text || button.disabled) return;
      button.disabled = true;
      try {
        await api.comment.create({ targetType: 'buddy', targetId: id, content: text });
        showToast('评论成功');
        await renderBuddyDetail(view, params);
      } catch (err) {
        button.disabled = false;
      }
    };
    document.getElementById('send-comment').addEventListener('click', sendComment);
    document.getElementById('comment-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendComment();
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/buddy-detail', renderBuddyDetail);
