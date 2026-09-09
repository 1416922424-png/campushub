async function renderIdleDetail(view, params) {
  const id = params.id;
  if (!id) {
    view.innerHTML = '<div class="page-error">缺少商品 ID</div>';
    return;
  }

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const item = await api.idle.detail(id);
    const it = formatIdle(item);
    const commentsRes = await api.comment.list({ targetType: 'idle', targetId: id, page: 1, limit: 50 });
    const comments = (commentsRes.list || []).map(formatComment);

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/idle">‹</a>
        <div class="title">商品详情</div>
      </div>
      <div class="detail-card">
        ${(item.images || []).length ? `<div class="post-images detail-images" style="margin-bottom:16px;">${item.images.map((url, idx) => renderImage(url, idx)).join('')}</div>` : ''}
        <div class="detail-title">${escapeHtml(it.title)}</div>
        <div style="margin:10px 0;">
          <span class="idle-price">¥${it.price}</span>
          ${it.originalPrice ? `<span class="idle-original">¥${it.originalPrice}</span>` : ''}
        </div>
        <div style="margin-bottom:12px;">
          <span class="tag">${it.condition}</span>
          <span class="tag">${it.categoryName}</span>
          <span class="tag">${it.campus}</span>
        </div>
        <div class="detail-content">${escapeHtml(item.content || '')}</div>
        <div class="post-header" style="margin-top:16px;">
          <div class="avatar">${it.sellerAvatar}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(it.sellerName)}</div>
            <div class="post-info">${it.publishTime}</div>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
          <button class="btn btn-primary" id="chat-btn" style="flex:1;">联系卖家</button>
          <button class="btn" id="collect-btn" style="flex:1;border:1px solid var(--border);background:#fff;">收藏</button>
        </div>
      </div>
      <div class="comment-section">
        <div class="comment-section-title">留言 ${comments.length}</div>
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
        `).join('') : '<div class="empty-state">暂无留言</div>'}
      </div>
      <div class="bottom-safe"></div>
      <div class="float-input-bar">
        <input type="text" placeholder="留言询问..." id="comment-input">
        <button id="send-comment">发送</button>
      </div>
    `;

    view.querySelectorAll('.detail-images .image-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openImageViewer(item.images, parseInt(wrap.dataset.index, 10)));
    });

    document.getElementById('chat-btn').addEventListener('click', () => {
      if (!requireLogin()) return;
      const sellerId = item.sellerId || item.seller?.id || item.author?.id;
      if (sellerId) location.hash = `#/messages?userId=${sellerId}`;
    });

    document.getElementById('collect-btn').addEventListener('click', async () => {
      if (!requireLogin()) return;
      try {
        await api.favorite.toggle('idle', id);
        showToast('收藏已切换');
      } catch (err) {}
    });

    document.getElementById('send-comment').addEventListener('click', async () => {
      if (!requireLogin()) return;
      const input = document.getElementById('comment-input');
      const text = input.value.trim();
      if (!text) return;
      try {
        await api.comment.create({ targetType: 'idle', targetId: id, content: text });
        input.value = '';
        showToast('留言成功');
        renderIdleDetail(view, params);
      } catch (err) {}
    });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/idle-detail', renderIdleDetail);
