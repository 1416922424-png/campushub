const SUBJECTS = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '其他'];

function formatQuestion(q) {
  const author = q.author || {};
  return {
    id: q.id,
    avatar: author.avatarUrl ? `<img src="${escapeHtml(author.avatarUrl)}" alt="">` : escapeHtml(avatarText(author.nickname)),
    nickname: author.nickname || '匿名同学',
    school: q.school || author.school,
    grade: q.grade || author.grade,
    subject: q.subject,
    reward: q.reward || 0,
    status: q.status,
    statusText: q.status === 'answered' ? '已解答' : (q.status === 'closed' ? '已关闭' : '待解答'),
    publishTime: timeAgo(q.createdAt),
    title: q.title,
    answerCount: q.answerCount || 0
  };
}

async function renderQuestions(view, params) {
  const user = getCurrentUser();
  let activeTab = params.tab || 'pending';
  let selectedSubject = '全部';

  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">题目讲解</div>
    </div>
    <div class="tabs">
      <div class="tab ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">待解答</div>
      <div class="tab ${activeTab === 'answered' ? 'active' : ''}" data-tab="answered">已解答</div>
      <div class="tab ${activeTab === 'mine' ? 'active' : ''}" data-tab="mine">我的提问</div>
    </div>
    <div class="card" style="margin:12px 16px;padding:12px;">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">科目筛选</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;" id="subject-tags">
        ${SUBJECTS.map(s => `<span class="tag ${s === selectedSubject ? '' : 'tag-outline'}" data-subject="${s}" style="cursor:pointer;">${s}</span>`).join('')}
      </div>
    </div>
    <div class="post-list" id="question-list">
      <div class="page-loading">加载中...</div>
    </div>
    <div class="bottom-safe"></div>
  `;

  const loadQuestions = async () => {
    const listEl = document.getElementById('question-list');
    listEl.innerHTML = '<div class="page-loading">加载中...</div>';
    try {
      const query = {
        school: user.school || APP_CONFIG.schools[0],
        grade: user.grade || APP_CONFIG.grades[1],
        status: activeTab === 'mine' ? undefined : activeTab,
        page: 1,
        limit: 50
      };
      if (selectedSubject !== '全部') query.subject = selectedSubject;

      const res = await api.question.list(query);
      let list = (res.list || []).map(formatQuestion);
      if (activeTab === 'mine') {
        list = list.filter(q => q.isAuthor);
      }

      if (list.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无题目</div>';
        return;
      }

      listEl.innerHTML = list.map(q => `
        <div class="question-item" data-id="${q.id}">
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
          <div class="post-title" style="margin-top:8px;">${escapeHtml(q.title)}</div>
          <div class="post-actions" style="margin-top:10px;">
            <span class="action">💬 ${q.answerCount} 人回答</span>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.question-item').forEach(item => {
        item.addEventListener('click', () => {
          location.hash = `#/question-detail?id=${item.dataset.id}`;
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadQuestions();
    });
  });

  document.getElementById('subject-tags').addEventListener('click', (e) => {
    const tag = e.target.closest('[data-subject]');
    if (!tag) return;
    selectedSubject = tag.dataset.subject;
    document.querySelectorAll('#subject-tags .tag').forEach(t => {
      t.style.background = t.dataset.subject === selectedSubject ? 'var(--primary-light)' : 'transparent';
      t.style.color = t.dataset.subject === selectedSubject ? 'var(--primary)' : 'var(--text-muted)';
    });
    loadQuestions();
  });

  await loadQuestions();
}

ROUTER.registerRoute('/questions', renderQuestions);
