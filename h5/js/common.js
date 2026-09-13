window.APP_CONFIG = {
  apiBaseUrl: '/api/v1',
  schools: ['金乡一中', '金乡二中', '金乡实验中学', '金乡王杰中学', '金乡崇文中学', '金乡金曼克中学', '金乡奎星中学', '金乡文峰中学', '金乡青华园外国语学校', '金乡阳光学校', '金乡育才学校', '金乡鸿庠学校'],
  grades: ['高一', '高二', '高三']
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function avatarText(nickname) {
  return (nickname || '用').charAt(0);
}

function renderAvatar(avatarUrl, nickname) {
  if (avatarUrl) return `<img src="${escapeHtml(getImageUrl(avatarUrl))}" alt="">`;
  return escapeHtml(avatarText(nickname));
}

function renderImage(url, index) {
  return `<div class="image-wrap" data-index="${index || 0}"><img src="${escapeHtml(getImageUrl(url))}" loading="lazy" alt=""></div>`;
}

function openImageViewer(images, startIndex) {
  const viewer = document.createElement('div');
  viewer.className = 'image-viewer';
  viewer.innerHTML = `
    <div class="viewer-backdrop"></div>
    <div class="viewer-content">
      <img src="${escapeHtml(getImageUrl(images[startIndex]))}" alt="">
    </div>
    <div class="viewer-close">✕</div>
    <div class="viewer-counter">${startIndex + 1} / ${images.length}</div>
  `;
  document.body.appendChild(viewer);

  let current = startIndex;
  const img = viewer.querySelector('img');
  const counter = viewer.querySelector('.viewer-counter');

  const show = (idx) => {
    current = (idx + images.length) % images.length;
    img.src = getImageUrl(images[current]);
    counter.textContent = `${current + 1} / ${images.length}`;
  };

  viewer.addEventListener('click', (e) => {
    if (e.target.classList.contains('viewer-backdrop') || e.target.classList.contains('viewer-close')) {
      viewer.remove();
    } else if (e.clientX < window.innerWidth / 2) {
      show(current - 1);
    } else {
      show(current + 1);
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function requireLogin() {
  if (!APP_TOKEN.isLoggedIn()) {
    location.hash = '#/login?redirect=' + encodeURIComponent(location.hash);
    return false;
  }
  return true;
}

function friendActionMarkup(userId) {
  if (!userId) return '';
  const current = getCurrentUser();
  if (current.id && String(current.id) === String(userId)) return '';
  return `<button class="btn add-friend-btn" data-user-id="${escapeHtml(String(userId))}" type="button" style="padding:5px 10px;font-size:12px;border:1px solid var(--primary);color:var(--primary);background:var(--primary-light);white-space:nowrap;">加好友</button>`;
}

async function setupFriendButtons(root = document) {
  const buttons = Array.from(root.querySelectorAll('.add-friend-btn'));
  if (!buttons.length || !APP_TOKEN.isLoggedIn()) return;
  await Promise.all(buttons.map(async (button) => {
    const userId = button.dataset.userId;
    try {
      const status = await api.friend.status(userId);
      if (status.isFriend) {
        button.textContent = '已添加';
        button.disabled = true;
        button.style.opacity = '0.65';
      }
    } catch (err) {}
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = '添加中';
      try {
        await api.friend.add(userId);
        button.textContent = '已添加';
        button.style.opacity = '0.65';
        showToast('已添加好友');
      } catch (err) {
        button.disabled = false;
        button.textContent = '加好友';
      }
    });
  }));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch (e) {
    return {};
  }
}

function setCurrentUser(user) {
  localStorage.setItem('userInfo', JSON.stringify(user));
}

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = window.APP_CONFIG?.apiBaseUrl || 'http://localhost:3000/api/v1';
  return base.replace(/\/api\/v1$/, '') + url;
}

window.timeAgo = timeAgo;
window.avatarText = avatarText;
window.renderAvatar = renderAvatar;
window.renderImage = renderImage;
window.openImageViewer = openImageViewer;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.requireLogin = requireLogin;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.getImageUrl = getImageUrl;
window.friendActionMarkup = friendActionMarkup;
window.setupFriendButtons = setupFriendButtons;
