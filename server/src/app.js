const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, insert, findById, update, getUserById, rowToUser, getCounts } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 同时托管网页版前端，启动后访问 http://localhost:3000 即可使用
app.use(express.static(path.join(__dirname, '..', '..', 'h5')));

app.use(cors());
app.use(express.json());
app.use(authMiddleware);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

function generateToken(user) {
  return Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
}

function parseToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const [id] = Buffer.from(token, 'base64').toString().split(':');
    return parseInt(id, 10);
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  req.userId = parseToken(req);
  next();
}

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ code: 401, message: '请先登录' });
  next();
}

function getTargetTable(targetType) {
  switch (targetType) {
    case 'post': return 'posts';
    case 'question': return 'questions';
    case 'idle': return 'idle';
    case 'buddy': return 'buddies';
    case 'comment': return 'comments';
    default: return null;
  }
}

function getTargetCountField(targetType) {
  switch (targetType) {
    case 'post': return 'commentCount';
    case 'question': return 'answerCount';
    case 'buddy': return 'commentCount';
    default: return null;
  }
}

function success(data) {
  return { code: 0, message: 'ok', data };
}

function error(msg, code = 1) {
  return { code, message: msg };
}

function pagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// 上传
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 登录
app.post('/api/v1/auth/login', (req, res) => {
  const { code, school, grade } = req.body;
  const openid = `openid_${code || Date.now()}`;
  let user = db.users.find(u => u.openid === openid);
  if (!user) {
    const nickname = `同学${Math.floor(Math.random() * 10000)}`;
    user = insert('users', { openid, nickname, school: school || '金乡一中', grade: grade || '高二' });
  }
  res.json(success({ token: generateToken(user), user: rowToUser(user) }));
});

// 当前用户
app.get('/api/v1/users/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json(error('用户不存在'));
  res.json(success({ ...rowToUser(user), ...getCounts(req.userId) }));
});

app.put('/api/v1/users/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json(error('用户不存在'));
  const { nickname, avatarUrl, school, grade } = req.body || {};
  const patch = {};
  if (nickname) patch.nickname = nickname;
  if (avatarUrl) patch.avatarUrl = avatarUrl;
  if (school) patch.school = school;
  if (grade) patch.grade = grade;
  const updated = update('users', user.id, patch);
  res.json(success({ ...rowToUser(updated), ...getCounts(req.userId) }));
});

// 格式化辅助
function liked(userId, targetType, targetId) {
  return userId ? db.likes.some(l => l.userId === userId && l.targetType === targetType && l.targetId === parseInt(targetId, 10)) : false;
}
function favorited(userId, targetType, targetId) {
  return userId ? db.favorites.some(f => f.userId === userId && f.targetType === targetType && f.targetId === parseInt(targetId, 10)) : false;
}

function formatPost(row, userId) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    images: row.images || [],
    tags: row.tags || [],
    school: row.school,
    grade: row.grade,
    viewCount: row.viewCount || 0,
    likeCount: row.likeCount || 0,
    commentCount: row.commentCount || 0,
    createdAt: row.createdAt,
    author: rowToUser(getUserById(row.userId)),
    isAuthor: userId === row.userId,
    liked: liked(userId, 'post', row.id),
    favorited: favorited(userId, 'post', row.id)
  };
}

function formatQuestion(row, userId) {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    content: row.content,
    images: row.images || [],
    reward: row.reward || 0,
    status: row.status || 'pending',
    school: row.school,
    grade: row.grade,
    likeCount: row.likeCount || 0,
    answerCount: row.answerCount || 0,
    createdAt: row.createdAt,
    author: rowToUser(getUserById(row.userId)),
    isAuthor: userId === row.userId,
    liked: liked(userId, 'question', row.id),
    favorited: favorited(userId, 'question', row.id)
  };
}

function formatIdle(row, userId) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    images: row.images || [],
    price: row.price || 0,
    originalPrice: row.originalPrice,
    category: row.category,
    conditionLevel: row.conditionLevel,
    school: row.school,
    status: row.status || 'selling',
    viewCount: row.viewCount || 0,
    likeCount: row.likeCount || 0,
    createdAt: row.createdAt,
    seller: rowToUser(getUserById(row.userId)),
    sellerId: row.userId,
    isAuthor: userId === row.userId,
    liked: liked(userId, 'idle', row.id),
    favorited: favorited(userId, 'idle', row.id)
  };
}

function formatBuddy(row, userId) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    school: row.school,
    grade: row.grade,
    commentCount: row.commentCount || 0,
    createdAt: row.createdAt,
    author: rowToUser(getUserById(row.userId)),
    isAuthor: userId === row.userId,
    favorited: favorited(userId, 'buddy', row.id)
  };
}

function formatComment(row, userId) {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    content: row.content,
    likeCount: row.likeCount || 0,
    createdAt: row.createdAt,
    author: rowToUser(getUserById(row.userId)),
    liked: liked(userId, 'comment', row.id)
  };
}

// 帖子
app.get('/api/v1/posts', authMiddleware, (req, res) => {
  const { school, grade, type, keyword, sort } = req.query;
  const { limit, offset } = pagination(req);

  let list = db.posts.slice();
  if (school) list = list.filter(p => p.school === school);
  if (grade) list = list.filter(p => p.grade === grade);
  if (type) list = list.filter(p => p.type === type);
  if (keyword) {
    const k = keyword.toLowerCase();
    list = list.filter(p => (p.title || '').toLowerCase().includes(k) || (p.content || '').toLowerCase().includes(k));
  }
  list.sort((a, b) => {
    if (sort === 'hot') return ((b.likeCount || 0) + (b.commentCount || 0) * 2) - ((a.likeCount || 0) + (a.commentCount || 0) * 2);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const total = list.length;
  list = list.slice(offset, offset + limit);
  res.json(success({ list: list.map(r => formatPost(r, req.userId)), total, page: req.query.page || 1, limit }));
});

app.get('/api/v1/posts/:id', authMiddleware, (req, res) => {
  const row = findById('posts', req.params.id);
  if (!row) return res.status(404).json(error('帖子不存在'));
  update('posts', row.id, { viewCount: (row.viewCount || 0) + 1 });
  res.json(success(formatPost(findById('posts', req.params.id), req.userId)));
});

app.post('/api/v1/posts', requireAuth, (req, res) => {
  const { type, title, content, images, tags } = req.body;
  const user = getUserById(req.userId);
  const row = insert('posts', {
    userId: req.userId,
    type: type || 'gossip',
    title,
    content: content || '',
    images: images || [],
    tags: tags || [],
    school: user.school,
    grade: user.grade
  });
  res.json(success(formatPost(row, req.userId)));
});

// 题目
app.get('/api/v1/questions', authMiddleware, (req, res) => {
  const { school, grade, subject, status, keyword } = req.query;
  const { limit, offset } = pagination(req);
  let list = db.questions.slice();
  if (school) list = list.filter(q => q.school === school);
  if (grade) list = list.filter(q => q.grade === grade);
  if (subject) list = list.filter(q => q.subject === subject);
  if (status) list = list.filter(q => q.status === status);
  if (keyword) {
    const k = keyword.toLowerCase();
    list = list.filter(q => (q.title || '').toLowerCase().includes(k) || (q.content || '').toLowerCase().includes(k));
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = list.length;
  list = list.slice(offset, offset + limit);
  res.json(success({ list: list.map(r => formatQuestion(r, req.userId)), total }));
});

app.get('/api/v1/questions/:id', authMiddleware, (req, res) => {
  const row = findById('questions', req.params.id);
  if (!row) return res.status(404).json(error('题目不存在'));
  res.json(success(formatQuestion(row, req.userId)));
});

app.post('/api/v1/questions', requireAuth, (req, res) => {
  const { subject, title, content, images, reward } = req.body;
  const user = getUserById(req.userId);
  const row = insert('questions', {
    userId: req.userId,
    subject: subject || '其他',
    title,
    content: content || '',
    images: images || [],
    reward: reward || 0,
    school: user.school,
    grade: user.grade
  });
  res.json(success(formatQuestion(row, req.userId)));
});

app.post('/api/v1/questions/:id/answered', requireAuth, (req, res) => {
  const row = findById('questions', req.params.id);
  if (!row || row.userId !== req.userId) return res.status(403).json(error('无权操作'));
  update('questions', row.id, { status: 'answered' });
  res.json(success({ success: true }));
});

// 闲置
app.get('/api/v1/idle', authMiddleware, (req, res) => {
  const { category, sort, keyword } = req.query;
  const { limit, offset } = pagination(req);
  let list = db.idle.slice();
  if (category) list = list.filter(i => i.category === category);
  if (keyword) {
    const k = keyword.toLowerCase();
    list = list.filter(i => (i.title || '').toLowerCase().includes(k) || (i.content || '').toLowerCase().includes(k));
  }
  list.sort((a, b) => {
    if (sort === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const total = list.length;
  list = list.slice(offset, offset + limit);
  res.json(success({ list: list.map(r => formatIdle(r, req.userId)), total }));
});

app.get('/api/v1/idle/:id', authMiddleware, (req, res) => {
  const row = findById('idle', req.params.id);
  if (!row) return res.status(404).json(error('商品不存在'));
  update('idle', row.id, { viewCount: (row.viewCount || 0) + 1 });
  res.json(success(formatIdle(findById('idle', req.params.id), req.userId)));
});

app.post('/api/v1/idle', requireAuth, (req, res) => {
  const { title, content, images, price, originalPrice, category, conditionLevel } = req.body;
  const user = getUserById(req.userId);
  const row = insert('idle', {
    userId: req.userId,
    title,
    content: content || '',
    images: images || [],
    price: price || 0,
    originalPrice: originalPrice || null,
    category: category || 'others',
    conditionLevel: conditionLevel || '九成新',
    school: user.school
  });
  res.json(success(formatIdle(row, req.userId)));
});

// 搭子
app.get('/api/v1/buddies', authMiddleware, (req, res) => {
  const { type, keyword } = req.query;
  const { limit, offset } = pagination(req);
  let list = db.buddies.slice();
  if (type) list = list.filter(b => b.type === type);
  if (keyword) {
    const k = keyword.toLowerCase();
    list = list.filter(b => (b.title || '').toLowerCase().includes(k) || (b.content || '').toLowerCase().includes(k));
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = list.length;
  list = list.slice(offset, offset + limit);
  res.json(success({ list: list.map(r => formatBuddy(r, req.userId)), total }));
});

app.post('/api/v1/buddies', requireAuth, (req, res) => {
  const { type, title, content } = req.body;
  const user = getUserById(req.userId);
  const row = insert('buddies', {
    userId: req.userId,
    type: type || 'other',
    title,
    content: content || '',
    school: user.school,
    grade: user.grade
  });
  res.json(success(formatBuddy(row, req.userId)));
});

// 评论
app.get('/api/v1/comments', authMiddleware, (req, res) => {
  const { targetType, targetId } = req.query;
  const { limit, offset } = pagination(req);
  let list = db.comments.filter(c => c.targetType === targetType && c.targetId === parseInt(targetId, 10));
  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  list = list.slice(offset, offset + limit);
  res.json(success({ list: list.map(r => formatComment(r, req.userId)) }));
});

app.post('/api/v1/comments', requireAuth, (req, res) => {
  const { targetType, targetId, content } = req.body || {};
  const table = getTargetTable(targetType);
  if (!table || !targetId) return res.status(400).json(error('无效的评论目标'));
  const row = findById(table, targetId);
  if (!row) return res.status(404).json(error('目标不存在'));

  const comment = insert('comments', {
    userId: req.userId,
    targetType,
    targetId: parseInt(targetId, 10),
    content: content || ''
  });

  const countField = getTargetCountField(targetType);
  if (countField) {
    const current = row[countField] || 0;
    update(table, row.id, { [countField]: current + 1 });
  }
  res.json(success(formatComment(comment, req.userId)));
});

// 点赞
app.post('/api/v1/likes/toggle', requireAuth, (req, res) => {
  const { targetType, targetId } = req.body || {};
  const table = getTargetTable(targetType);
  if (!table || !targetId) return res.status(400).json(error('无效的点赞目标'));

  const id = parseInt(targetId, 10);
  const idx = db.likes.findIndex(l => l.userId === req.userId && l.targetType === targetType && l.targetId === id);
  let liked = false;
  if (idx >= 0) {
    db.likes.splice(idx, 1);
  } else {
    insert('likes', { userId: req.userId, targetType, targetId: id });
    liked = true;
  }

  const row = findById(table, id);
  if (row) {
    update(table, id, { likeCount: Math.max(0, (row.likeCount || 0) + (liked ? 1 : -1)) });
  }
  res.json(success({ liked }));
});

// 收藏
app.post('/api/v1/favorites/toggle', requireAuth, (req, res) => {
  const { targetType, targetId } = req.body;
  const id = parseInt(targetId, 10);
  const idx = db.favorites.findIndex(f => f.userId === req.userId && f.targetType === targetType && f.targetId === id);
  let favorited = false;
  if (idx >= 0) {
    db.favorites.splice(idx, 1);
  } else {
    insert('favorites', { userId: req.userId, targetType, targetId: id });
    favorited = true;
  }
  res.json(success({ favorited }));
});

// 搜索
app.get('/api/v1/search', authMiddleware, (req, res) => {
  const { keyword } = req.query;
  const k = (keyword || '').toLowerCase();
  const posts = db.posts.filter(p => (p.title || '').toLowerCase().includes(k) || (p.content || '').toLowerCase().includes(k)).slice(0, 10).map(r => formatPost(r, req.userId));
  const questions = db.questions.filter(q => (q.title || '').toLowerCase().includes(k) || (q.content || '').toLowerCase().includes(k)).slice(0, 10).map(r => formatQuestion(r, req.userId));
  const idle = db.idle.filter(i => (i.title || '').toLowerCase().includes(k) || (i.content || '').toLowerCase().includes(k)).slice(0, 10).map(r => formatIdle(r, req.userId));
  res.json(success({ posts, questions, idle }));
});

// 举报/反馈
app.post('/api/v1/reports', requireAuth, (req, res) => {
  const { targetType, targetId, reason, content } = req.body;
  insert('reports', { userId: req.userId, targetType, targetId, reason, content: content || '' });
  res.json(success({ success: true }));
});

app.post('/api/v1/feedback', requireAuth, (req, res) => {
  const { type, content, images, contact } = req.body;
  insert('feedback', { userId: req.userId, type: type || 'suggestion', content, images: images || [], contact: contact || '' });
  res.json(success({ success: true }));
});

// 聊天
app.get('/api/v1/chat/contacts', requireAuth, (req, res) => {
  const map = new Map();
  db.messages.filter(m => m.senderId === req.userId || m.receiverId === req.userId).forEach(m => {
    const otherId = m.senderId === req.userId ? m.receiverId : m.senderId;
    const cur = map.get(otherId);
    if (!cur || new Date(m.createdAt) > new Date(cur.createdAt)) {
      map.set(otherId, { otherId, createdAt: m.createdAt, content: m.content });
    }
  });
  const contacts = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => {
    const user = rowToUser(getUserById(c.otherId));
    const unread = db.messages.filter(m => m.senderId === c.otherId && m.receiverId === req.userId && !m.isRead).length;
    return { userId: c.otherId, nickname: user.nickname, avatarUrl: user.avatarUrl, lastMessage: c.content, lastTime: c.createdAt, unreadCount: unread };
  });
  res.json(success({ contacts }));
});

app.get('/api/v1/chat/messages', requireAuth, (req, res) => {
  const { userId } = req.query;
  const otherId = parseInt(userId, 10);
  db.messages.forEach(m => {
    if (m.senderId === otherId && m.receiverId === req.userId) m.isRead = true;
  });
  const messages = db.messages.filter(m =>
    (m.senderId === req.userId && m.receiverId === otherId) ||
    (m.senderId === otherId && m.receiverId === req.userId)
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(success({ messages }));
});

app.post('/api/v1/chat/send', requireAuth, (req, res) => {
  const { receiverId, content, type } = req.body;
  const row = insert('messages', { senderId: req.userId, receiverId: parseInt(receiverId, 10), content, type: type || 'text', isRead: false });
  res.json(success(row));
});

// 通知
app.get('/api/v1/notifications', requireAuth, (req, res) => {
  const { limit, offset } = pagination(req);
  const items = db.notifications
    .filter(n => n.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = items.length;
  res.json(success({ list: items.slice(offset, offset + limit), total, unreadCount: items.filter(n => !n.isRead).length }));
});

app.get('/api/v1/notifications/unread', requireAuth, (req, res) => {
  const count = db.notifications.filter(n => n.userId === req.userId && !n.isRead).length;
  res.json(success({ count }));
});

app.post('/api/v1/notifications/read', requireAuth, (req, res) => {
  const { id } = req.body || {};
  const item = db.notifications.find(n => n.id === parseInt(id, 10) && n.userId === req.userId);
  if (!item) return res.status(404).json(error('通知不存在'));
  item.isRead = true;
  res.json(success({ success: true }));
});

app.post('/api/v1/notifications/read-all', requireAuth, (req, res) => {
  db.notifications.forEach(n => {
    if (n.userId === req.userId) n.isRead = true;
  });
  res.json(success({ success: true }));
});

// 上传
app.post('/api/v1/upload/image', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json(error('上传失败'));
  const url = `/uploads/${req.file.filename}`;
  res.json(success({ url }));
});

// 初始化示例数据
function seedData() {
  if (db.posts.length) return;
  const users = [
    { openid: 'seed_李同学', nickname: '李同学', school: '金乡一中', grade: '高二' },
    { openid: 'seed_王同学', nickname: '王同学', school: '金乡二中', grade: '高一' },
    { openid: 'seed_张同学', nickname: '张同学', school: '金乡一中', grade: '高三' },
    { openid: 'seed_陈同学', nickname: '陈同学', school: '金乡实验中学', grade: '高一' }
  ];
  users.forEach(u => insert('users', u));

  insert('posts', { userId: 1, type: 'gossip', title: '高一食堂今天哪个窗口好吃？', content: '求推荐，刚入学不太熟', school: '金乡一中', grade: '高一' });
  insert('posts', { userId: 2, type: 'book', title: '出高三数学一轮复习资料', content: '几乎全新，带答案解析', school: '金乡二中', grade: '高三' });
  insert('questions', { userId: 1, subject: '数学', title: '函数定义域怎么求？', content: 'log₂(x²-4x+3) 定义域', school: '金乡一中', grade: '高二', reward: 10 });
  insert('idle', { userId: 3, title: '考研英语词汇书', content: '九成新，笔记很少', price: 15, category: 'others', conditionLevel: '九成新', school: '金乡一中' });
  insert('buddies', { userId: 4, type: 'study', title: '周末图书馆自习组队', content: '想找几个人一起刷题', school: '金乡实验中学', grade: '高二' });
}

seedData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
