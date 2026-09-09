function renderMessages(view, params) {
  if (params.userId) {
    return renderChatDetail(view, params);
  }
  return renderChatList(view);
}

async function renderChatList(view) {
  if (!requireLogin()) return;

  view.innerHTML = '<div class="page-loading">加载中...</div>';
  try {
    const res = await api.chat.contacts();
    const contacts = res.contacts || [];

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/profile">‹</a>
        <div class="title">消息</div>
      </div>
      ${contacts.length ? contacts.map(c => `
        <a class="chat-item" href="#/messages?userId=${c.userId}">
          <div class="avatar">${c.avatarUrl ? `<img src="${escapeHtml(c.avatarUrl)}" alt="">` : escapeHtml(avatarText(c.nickname))}</div>
          <div class="chat-info">
            <div class="chat-name">${escapeHtml(c.nickname)}</div>
            <div class="chat-preview">${escapeHtml(c.lastMessage || '')}</div>
          </div>
          <div style="text-align:right;">
            <div class="chat-time">${timeAgo(c.lastTime)}</div>
            ${c.unreadCount ? `<div style="background:var(--primary);color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;margin-left:auto;">${c.unreadCount}</div>` : ''}
          </div>
        </a>
      `).join('') : '<div class="empty-state">暂无消息</div>'}
    `;
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

async function renderChatDetail(view, params) {
  const userId = params.userId;
  if (!userId) {
    view.innerHTML = '<div class="page-error">缺少用户 ID</div>';
    return;
  }
  if (!requireLogin()) return;

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const res = await api.chat.messages({ userId, page: 1, limit: 100 });
    const messages = res.messages || [];
    const currentUser = getCurrentUser();

    view.innerHTML = `
      <div class="page-header">
        <a class="back-btn" href="#/messages">‹</a>
        <div class="title">聊天</div>
      </div>
      <div id="chat-messages" style="padding:16px;padding-bottom:80px;">
        ${messages.map(m => {
          const isMe = String(m.senderId) === String(currentUser.id);
          return `
            <div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};margin-bottom:12px;">
              <div style="max-width:70%;padding:10px 14px;border-radius:16px;background:${isMe ? 'var(--primary)' : '#fff'};color:${isMe ? '#fff' : 'var(--text)'};box-shadow:var(--shadow);word-break:break-word;">
                ${escapeHtml(m.content)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="float-input-bar">
        <input type="text" placeholder="发消息..." id="msg-input">
        <button id="send-msg">发送</button>
      </div>
    `;

    const refresh = async () => {
      const latest = await api.chat.messages({ userId, page: 1, limit: 100 });
      const box = document.getElementById('chat-messages');
      if (!box) return;
      box.innerHTML = (latest.messages || []).map(m => {
        const isMe = String(m.senderId) === String(currentUser.id);
        return `<div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};margin-bottom:12px;"><div style="max-width:70%;padding:10px 14px;border-radius:16px;background:${isMe ? 'var(--primary)' : '#fff'};color:${isMe ? '#fff' : 'var(--text)'};box-shadow:var(--shadow);word-break:break-word;">${escapeHtml(m.content)}</div></div>`;
      }).join('');
      box.scrollTop = box.scrollHeight;
    };
    const timer = setInterval(() => refresh().catch(() => {}), 3000);
    document.getElementById('send-msg').addEventListener('click', async () => {
      const input = document.getElementById('msg-input');
      const text = input.value.trim();
      if (!text) return;
      try {
        await api.chat.send({ receiverId: userId, content: text, type: 'text' });
        input.value = '';
        await refresh();
      } catch (err) {}
    });
    document.getElementById('msg-input').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('send-msg').click(); });
    window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

ROUTER.registerRoute('/messages', renderMessages);
