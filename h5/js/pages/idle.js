const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'digital', label: '数码' },
  { key: 'daily', label: '生活用品' },
  { key: 'beauty', label: '美妆' },
  { key: 'others', label: '其他' }
];

function formatIdle(item) {
  const seller = item.seller || item.author || {};
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    originalPrice: item.originalPrice,
    condition: item.conditionLevel,
    campus: item.school || seller.school,
    categoryName: { digital: '数码', daily: '生活用品', beauty: '美妆', others: '其他' }[item.category] || '其他',
    sellerAvatar: seller.avatarUrl ? `<img src="${escapeHtml(seller.avatarUrl)}" alt="">` : escapeHtml(avatarText(seller.nickname)),
    sellerName: seller.nickname || '匿名同学',
    publishTime: timeAgo(item.createdAt)
  };
}

async function renderIdle(view) {
  let activeCategory = 'all';
  let sort = '';

  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">闲置出售</div>
    </div>
    <div class="tabs">
      ${CATEGORIES.map(c => `<div class="tab ${c.key === activeCategory ? 'active' : ''}" data-cat="${c.key}">${c.label}</div>`).join('')}
    </div>
    <div class="card" style="margin:12px 16px;padding:12px;display:flex;gap:10px;">
      <select id="sort-select" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;">
        <option value="">默认排序</option>
        <option value="price_asc">价格从低到高</option>
        <option value="price_desc">价格从高到低</option>
      </select>
    </div>
    <div class="post-list" id="idle-list">
      <div class="page-loading">加载中...</div>
    </div>
    <div class="bottom-safe"></div>
  `;

  const loadItems = async () => {
    const listEl = document.getElementById('idle-list');
    listEl.innerHTML = '<div class="page-loading">加载中...</div>';
    try {
      const params = { page: 1, limit: 50 };
      if (activeCategory !== 'all') params.category = activeCategory;
      if (sort) params.sort = sort;

      const res = await api.idle.list(params);
      const items = (res.list || []).map(formatIdle);

      if (items.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无闲置</div>';
        return;
      }

      listEl.innerHTML = items.map(it => `
        <div class="idle-item" data-id="${it.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div class="post-title" style="flex:1;">${escapeHtml(it.title)}</div>
            <div style="white-space:nowrap;margin-left:10px;">
              <span class="idle-price">¥${it.price}</span>
              ${it.originalPrice ? `<span class="idle-original">¥${it.originalPrice}</span>` : ''}
            </div>
          </div>
          <div style="margin-top:8px;">
            <span class="tag">${it.condition}</span>
            <span class="tag">${it.categoryName}</span>
            <span class="tag">${it.campus}</span>
          </div>
          <div class="post-header" style="margin-top:12px;">
            <div class="avatar">${it.sellerAvatar}</div>
            <div class="post-meta">
              <div class="post-author">${escapeHtml(it.sellerName)}</div>
              <div class="post-info">${it.publishTime}</div>
            </div>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.idle-item').forEach(item => {
        item.addEventListener('click', () => {
          location.hash = `#/idle-detail?id=${item.dataset.id}`;
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.cat;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadItems();
    });
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    sort = e.target.value;
    loadItems();
  });

  await loadItems();
}

ROUTER.registerRoute('/idle', renderIdle);
