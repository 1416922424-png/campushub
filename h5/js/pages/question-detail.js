async function renderQuestionDetail(view, params) {
  const id = params.id;
  if (!id) {
    view.innerHTML = '<div class="page-error">缺少题目 ID</div>';
    return;
  }

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const [question, commentsRes] = await Promise.all([
      api.question.detail(id),
      api.comment.list({ targetType: 'question', targetId: id, page: 1, limit: 50 })
    ]);

    const q = formatQuestion(question);
    const comments = (commentsRes.list || []).map(formatComment);

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/questions">‹</a>
        <div class="title">题目详情</div>
      </div>
      <div class="detail-card">
        <div class="post-header">
          <div class="avatar">${q.avatar}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(q.nickname)}</div>
            <div class="post-info">${q.school} · ${q.grade} · ${q.publishTime}</div>
          </div>
          <div class="reward-tag">◇ ${q.reward} 积分</div>
        </div>
        <div style="margin-top:10px;">
          <span class="tag">${q.subject}</span>
          <span class="tag ${q.status === 'answered' ? 'tag-success' : ''}">${q.statusText}</span>
        </div>
        <div class="detail-title">${escapeHtml(q.title)}</div>
        <div class="detail-content">${escapeHtml(question.content || '')}</div>
        ${(question.images || []).length ? `<div class="post-images detail-images">${question.images.map((url, idx) => renderImage(url, idx)).join('')}</div>` : ''}
        ${question.isAuthor && q.status !== 'answered' ? `<button class="btn btn-primary btn-block" id="mark-answered" style="margin-top:16px;">标记已解答</button>` : ''}
      </div>
      <div class="comment-section">
        <div class="comment-section-title">回答 / 讨论 ${comments.length}</div>
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
        `).join('') : '<div class="empty-state">暂无回答，快来抢答赚积分</div>'}
      </div>
      <div class="bottom-safe"></div>
      <div class="float-input-bar">
        <input type="text" placeholder="写回答..." id="comment-input">
        <button id="send-comment">发送</button>
      </div>
    `;

    view.querySelectorAll('.detail-images .image-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openImageViewer(question.images, parseInt(wrap.dataset.index, 10)));
    });

    const sendBtn = document.getElementById('send-comment');
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        if (!requireLogin()) return;
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (!text) return;
        try {
          await api.comment.create({ targetType: 'question', targetId: id, content: text });
          input.value = '';
          showToast('回答成功');
          renderQuestionDetail(view, params);
        } catch (err) {}
      });
    }

    const markBtn = document.getElementById('mark-answered');
    if (markBtn) {
      markBtn.addEventListener('click', async () => {
        try {
          await api.question.markAnswered(id);
          showToast('已标记为已解答');
          renderQuestionDetail(view, params);
        } catch (err) {}
      });
    }
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/question-detail', renderQuestionDetail);
