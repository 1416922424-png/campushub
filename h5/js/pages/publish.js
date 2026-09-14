const PUBLISH_CHANNELS = [
  { key: 'gossip', label: '吃瓜捞人' },
  { key: 'lostfound', label: '寻物启事' },
  { key: 'book', label: '二手书' },
  { key: 'question', label: '题目讲解' },
  { key: 'idle', label: '闲置出售' },
  { key: 'buddy', label: '找搭子' }
];

const PUBLISH_SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '其他'];
const IDLE_CATEGORIES = [
  { key: 'digital', label: '数码' },
  { key: 'daily', label: '生活用品' },
  { key: 'beauty', label: '美妆' },
  { key: 'others', label: '其他' }
];
const CONDITIONS = ['全新', '九成新', '八成新', '七成新'];
const PUBLISH_BUDDY_TYPES = [
  { key: 'movie', label: '电影搭子' },
  { key: 'study', label: '学习搭子' },
  { key: 'dining', label: '吃饭搭子' },
  { key: 'sports', label: '运动搭子' },
  { key: 'game', label: '游戏搭子' },
  { key: 'other', label: '其他' }
];

function renderPublish(view) {
  if (!requireLogin()) return;

  view.innerHTML = `
    <div class="page-header">
      <a class="back-btn" href="#/">‹</a>
      <div class="title">发布</div>
      <button id="submit-publish" class="publish-submit">发布</button>
    </div>
    <div class="publish-body">
      <div class="publish-channels">
        ${PUBLISH_CHANNELS.map(c => `<div class="publish-channel ${c.key === 'gossip' ? 'active' : ''}" data-channel="${c.key}">${c.label}</div>`).join('')}
      </div>

      <div id="extra-fields"></div>

      <div class="form-group">
        <input class="form-input" type="text" id="pub-title" placeholder="写一个吸引人的标题">
      </div>
      <div class="form-group">
        <textarea class="form-textarea" id="pub-body" placeholder="详细内容..."></textarea>
      </div>
      <div class="form-group" id="price-field" style="display:none;">
        <label class="form-label" id="price-label">价格 / 赏金（元/积分）</label>
        <input class="form-input" type="number" id="pub-price" placeholder="0" min="0">
      </div>
      <div class="form-group">
        <input type="file" id="pub-images" accept="image/*" multiple style="display:none;">
        <button class="btn" id="choose-image-btn" style="border:1px solid var(--border);background:#fff;">+ 添加图片</button>
        <div id="image-preview" class="image-preview"></div>
      </div>
    </div>
  `;

  let activeChannel = 'gossip';
  let selectedFiles = [];

  const updateUI = () => {
    const extra = document.getElementById('extra-fields');
    const priceField = document.getElementById('price-field');
    const priceLabel = document.getElementById('price-label');

    document.querySelectorAll('.publish-channel').forEach(el => {
      el.classList.toggle('active', el.dataset.channel === activeChannel);
    });

    let extraHtml = '';
    if (activeChannel === 'question') {
      extraHtml = `
        <div class="form-group">
          <label class="form-label">科目</label>
          <select class="form-select" id="pub-subject">${PUBLISH_SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
        </div>
      `;
      priceField.style.display = 'block';
      priceLabel.textContent = '悬赏积分';
    } else if (activeChannel === 'idle') {
      extraHtml = `
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="form-select" id="pub-category">${IDLE_CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">成色</label>
          <select class="form-select" id="pub-condition">${CONDITIONS.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
      `;
      priceField.style.display = 'block';
      priceLabel.textContent = '出售价格（元）';
    } else if (activeChannel === 'book') {
      priceField.style.display = 'block';
      priceLabel.textContent = '出售价格（元）';
    } else if (activeChannel === 'buddy') {
      extraHtml = `
        <div class="form-group">
          <label class="form-label">搭子类型</label>
          <select class="form-select" id="pub-buddy-type">${PUBLISH_BUDDY_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}</select>
        </div>
      `;
      priceField.style.display = 'none';
    } else {
      priceField.style.display = 'none';
    }
    extra.innerHTML = extraHtml;
  };

  document.querySelectorAll('.publish-channel').forEach(el => {
    el.addEventListener('click', () => {
      activeChannel = el.dataset.channel;
      updateUI();
    });
  });

  document.getElementById('choose-image-btn').addEventListener('click', () => {
    document.getElementById('pub-images').click();
  });

  document.getElementById('pub-images').addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    const preview = document.getElementById('image-preview');
    preview.innerHTML = selectedFiles.map((f, i) => `
      <div class="preview-item">
        <img src="${URL.createObjectURL(f)}" alt="">
        <span class="preview-remove" data-idx="${i}">✕</span>
      </div>
    `).join('');

    preview.querySelectorAll('.preview-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        selectedFiles.splice(idx, 1);
        document.getElementById('pub-images').value = '';
        document.getElementById('pub-images').dispatchEvent(new Event('change'));
      });
    });
  });

  document.getElementById('submit-publish').addEventListener('click', async () => {
    const title = document.getElementById('pub-title').value.trim();
    const body = document.getElementById('pub-body').value.trim();
    if (!title) {
      showToast('请填写标题');
      return;
    }
    if (!body) {
      showToast('请填写内容');
      return;
    }

    const btn = document.getElementById('submit-publish');
    btn.disabled = true;
    btn.textContent = '发布中...';

    try {
      const uploaded = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const url = await api.upload(selectedFiles[i]);
        uploaded.push(url);
      }

      const price = document.getElementById('pub-price')?.value || 0;
      let res;

      if (activeChannel === 'question') {
        res = await api.question.create({
          subject: document.getElementById('pub-subject').value,
          title,
          content: body,
          images: uploaded,
          reward: parseFloat(price) || 0
        });
        location.hash = `#/question-detail?id=${res.id}`;
      } else if (activeChannel === 'idle') {
        res = await api.idle.create({
          title,
          content: body,
          images: uploaded,
          price: parseFloat(price) || 0,
          category: document.getElementById('pub-category').value,
          conditionLevel: document.getElementById('pub-condition').value
        });
        location.hash = `#/idle-detail?id=${res.id}`;
      } else if (activeChannel === 'buddy') {
        res = await api.buddy.create({
          type: document.getElementById('pub-buddy-type').value,
          title,
          content: body
        });
        location.hash = '#/buddies';
      } else {
        res = await api.post.create({
          type: activeChannel,
          title,
          content: body,
          images: uploaded,
          tags: activeChannel === 'book' ? ['二手书'] : []
        });
        location.hash = `#/post-detail?id=${res.id}`;
      }
      showToast('发布成功');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '发布';
    }
  });

  updateUI();
}

ROUTER.registerRoute('/publish', renderPublish);
