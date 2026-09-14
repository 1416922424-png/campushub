const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || '/api/v1';

function getToken() {
  return localStorage.getItem('token') || '';
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function isLoggedIn() {
  return !!getToken();
}

async function request(url, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...(options.headers || {})
  };

  const fetchOptions = {
    method,
    headers,
    credentials: 'omit'
  };

  if (options.body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let fullUrl = `${API_BASE_URL}${url}`;
  if (options.params) {
    const qs = new URLSearchParams(options.params).toString();
    if (qs) fullUrl += `?${qs}`;
  }

  try {
    const res = await fetch(fullUrl, fetchOptions);
    if (res.status === 401) {
      removeToken();
      throw new Error('登录已过期');
    }
    const data = await res.json();
    if (data.code === 0) {
      return data.data;
    }
    throw new Error(data.message || '请求失败');
  } catch (err) {
    showToast(err.message || '网络异常');
    throw err;
  }
}

const api = {
  auth: {
    sendCode: (phone) => request('/auth/send-code', { method: 'POST', body: { phone } }),
    login: (phone, code, school, grade) => request('/auth/login', { method: 'POST', body: { phone, code, school, grade } })
  },
  user: {
    getMe: () => request('/users/me'),
    updateMe: (data) => request('/users/me', { method: 'PUT', body: data })
  },
  post: {
    list: (params) => request('/posts', { params }),
    detail: (id) => request(`/posts/${id}`),
    create: (data) => request('/posts', { method: 'POST', body: data })
  },
  question: {
    list: (params) => request('/questions', { params }),
    detail: (id) => request(`/questions/${id}`),
    create: (data) => request('/questions', { method: 'POST', body: data }),
    markAnswered: (id) => request(`/questions/${id}/answered`, { method: 'POST' })
  },
  idle: {
    list: (params) => request('/idle', { params }),
    detail: (id) => request(`/idle/${id}`),
    create: (data) => request('/idle', { method: 'POST', body: data })
  },
  buddy: {
    list: (params) => request('/buddies', { params }),
    detail: (id) => request(`/buddies/${id}`),
    create: (data) => request('/buddies', { method: 'POST', body: data })
  },
  friend: {
    status: (userId) => request('/friends/status', { params: { userId } }),
    add: (userId) => request('/friends/add', { method: 'POST', body: { userId } })
  },
  comment: {
    list: (params) => request('/comments', { params }),
    create: (data) => request('/comments', { method: 'POST', body: data })
  },
  like: {
    toggle: (targetType, targetId) => request('/likes/toggle', { method: 'POST', body: { targetType, targetId } })
  },
  favorite: {
    toggle: (targetType, targetId) => request('/favorites/toggle', { method: 'POST', body: { targetType, targetId } })
  },
  search: {
    global: (params) => request('/search', { params })
  },
  report: {
    create: (data) => request('/reports', { method: 'POST', body: data })
  },
  feedback: {
    create: (data) => request('/feedback', { method: 'POST', body: data })
  },
  chat: {
    contacts: () => request('/chat/contacts'),
    messages: (params) => request('/chat/messages', { params }),
    send: (data) => request('/chat/send', { method: 'POST', body: data })
  },
  notification: {
    list: (params) => request('/notifications', { params }),
    unread: () => request('/notifications/unread'),
    markRead: (id) => request('/notifications/read', { method: 'POST', body: { id } }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' })
  },
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: formData
    });
    const data = await res.json();
    if (data.code === 0) return data.data.url;
    throw new Error(data.message || '上传失败');
  }
};

window.APP_API = api;
window.APP_TOKEN = { getToken, setToken, removeToken, isLoggedIn, request };
