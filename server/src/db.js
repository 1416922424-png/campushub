// 内存数据库：快速演示，无需安装原生模块
let nextId = 1;

const db = {
  users: [],
  posts: [],
  questions: [],
  idle: [],
  buddies: [],
  comments: [],
  likes: [],
  favorites: [],
  messages: [],
  notifications: [],
  reports: [],
  feedback: []
};

function insert(table, data) {
  const row = { id: nextId++, createdAt: new Date().toISOString(), ...data };
  db[table].push(row);
  return row;
}

function findById(table, id) {
  return db[table].find(r => r.id === parseInt(id, 10));
}

function update(table, id, patch) {
  const row = findById(table, id);
  if (row) Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  return row;
}

function remove(table, id) {
  const idx = db[table].findIndex(r => r.id === parseInt(id, 10));
  if (idx >= 0) return db[table].splice(idx, 1)[0];
  return null;
}

function getUserById(id) {
  return findById('users', id);
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname || '匿名同学',
    avatarUrl: row.avatarUrl,
    school: row.school,
    grade: row.grade
  };
}

function getCounts(userId) {
  return {
    postCount: db.posts.filter(p => p.userId === userId).length,
    favoriteCount: db.favorites.filter(f => f.userId === userId).length,
    buddyCount: db.buddies.filter(b => b.userId === userId).length
  };
}

module.exports = { db, insert, findById, update, remove, getUserById, rowToUser, getCounts };
