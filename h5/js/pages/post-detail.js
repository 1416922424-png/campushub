function formatComment(c) {
  const author = c.author || {};
  return {
    id: c.id,
    avatar: renderAvatar(author.avatarUrl, author.nickname),
    nickname: author.nickname || '匿名同学',
    content: c.content,
    time: timeAgo(c.createdAt),
    likeCount: c.likeCount || 0,
    liked: c.liked
  };
}

async function renderPostDetail(view, params) {
  const id = params.id;
  if (!id) {
    view.innerHTML = '<div class="page-error">缺少帖子 ID</div>';
    return;
  }

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const [post, commentsRes] = await Promise.all([
      api.post.detail(id),
      api.comment.list({ targetType: 'post', targetId: id, page: 1, limit: 50 })
    ]);

    const p = formatPost(post);
    const comments = (commentsRes.list || []).map(formatComment);

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/">‹</a>
        <div class="title">帖子详情</div>
      </div>
      <div class="detail-card">
        <div class="post-header">
          <div class="avatar">${p.avatar}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(p.nickname)}</div>
            <div class="post-info">${escapeHtml(p.schoolGrade)} · ${p.time}</div>
          </div>
        </div>
        <div class="detail-title">${escapeHtml(p.title)}</div>
        <div class="detail-content">${escapeHtml(p.summary)}</div>
        ${p.images.length ? `<div class="post-images detail-images">${p.images.map((url, idx) => renderImage(url, idx)).join('')}</div>` : ''}
        <div class="post-actions" style="margin-top:16px;">
          <span class="action ${p.liked ? 'active' : ''}" id="post-like">${p.liked ? '♥' : '♡'} ${p.likeCount}</span>
          <span class="action">💬 ${p.commentCount}</span>
          <span class="action" id="post-report">⚠️ 举报</span>
        </div>
      </div>
      <div class="comment-section">
        <div class="comment-section-title">评论 ${comments.length}</div>
        ${comments.length ? comments.map(c => `
          <div class="comment-item">
            <div class="avatar">${c.avatar}</div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">${escapeHtml(c.nickname)}</span>
                <span class="comment-time">${c.time}</span>
              </div>
              <div class="comment-content">${escapeHtml(c.content)}</div>
            </div>
          </div>
        `).join('') : '<div class="empty-state">暂无评论</div>'}
      </div>
      <div class="bottom-safe"></div>
      <div class="float-input-bar">
        <input type="text" placeholder="写评论..." id="comment-input">
        <button id="send-comment">发送</button>
      </div>
    `;

    view.querySelectorAll('.detail-images .image-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openImageViewer(p.images, parseInt(wrap.dataset.index, 10)));
    });

    document.getElementById('post-like').addEventListener('click', async () => {
      if (!requireLogin()) return;
      const btn = document.getElementById('post-like');
      try {
        await api.like.toggle('post', id);
        const liked = btn.classList.contains('active');
        const count = parseInt(btn.textContent.replace(/\D/g, '')) || 0;
        btn.classList.toggle('active');
        btn.innerHTML = `${liked ? '♡' : '♥'} ${liked ? Math.max(0, count - 1) : count + 1}`;
      } catch (err) {}
    });

    document.getElementById('post-report').addEventListener('click', () => {
      location.hash = `#/report?id=${id}&type=post`;
    });

    document.getElementById('send-comment').addEventListener('click', async () => {
      if (!requireLogin()) return;
      const input = document.getElementById('comment-input');
      const text = input.value.trim();
      if (!text) return;
      try {
        await api.comment.create({ targetType: 'post', targetId: id, content: text });
        input.value = '';
        showToast('评论成功');
        renderPostDetail(view, params);
      } catch (err) {}
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/post-detail', renderPostDetail);
