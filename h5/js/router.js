const routes = {};

function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

function navigateTo(path) {
  location.hash = '#' + path;
}

function getRoute() {
  const hash = location.hash.slice(1) || '/';
  const [path, queryString] = hash.split('?');
  const params = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
  }
  return { path, params };
}

async function renderRoute() {
  const { path, params } = getRoute();
  const view = document.getElementById('router-view');
  const tabBar = document.getElementById('tab-bar');

  // 隐藏底部 tab 的页面
  const hideTabPaths = ['/login', '/publish'];
  if (hideTabPaths.includes(path)) {
    tabBar.classList.add('hidden');
  } else {
    tabBar.classList.remove('hidden');
  }

  // 更新 tab 激活态
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.toggle('active', item.dataset.path === path);
  });

  view.innerHTML = '<div class="page-loading">加载中...</div>';

  const renderFn = routes[path] || routes['/'];
  try {
    await renderFn(view, params);
  } catch (err) {
    view.innerHTML = `<div class="page-error">加载失败：${escapeHtml(err.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', renderRoute);

window.ROUTER = { registerRoute, navigateTo, getRoute, renderRoute };
