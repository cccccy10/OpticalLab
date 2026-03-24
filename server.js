// 1. 引入工具包
const express = require('express');
const session = require('express-session');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session);
const path = require('path');

// 2. 连接你的Upstash云数据库（把引号里的内容换成你自己的连接字符串！）
const redisClient = new Redis("rediss://default:AZmIAAIncDEzNTFkYTE1NzgzODI0ODU1OWRjOGYwNGZlYTUwYjNmNnAxMzkzMDQ@relaxed-sawfly-39304.upstash.io:6379");

// 数据库连接状态提示
redisClient.on('connect', () => {
  console.log('✅ 成功连接到 Upstash 云数据库！');
});
redisClient.on('error', (err) => {
  console.error('❌ 数据库连接失败：', err);
});

// 3. 创建服务器
const app = express();
const PORT = 3000;

// 4. 配置Session
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'optical-lab-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 3600000 }
}));

app.use(express.urlencoded({ extended: true }));

// 5. 注册功能：处理用户注册请求
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  // 检查用户名是否已经被注册
  const isUserExist = await redisClient.hexists('lab_users', username);
  if (isUserExist) {
    return res.send('用户名已被注册！<a href="/register.html">返回重试</a>');
  }
  // 把用户名和密码存入云数据库
  await redisClient.hset('lab_users', username, password);
  res.send('注册成功！<a href="/login.html">去登录</a>');
});

// 6. 登录功能：处理用户登录请求
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // 从云数据库里查询用户的密码
  const savedPassword = await redisClient.hget('lab_users', username);
  // 检查账号密码是否正确
  if (savedPassword && savedPassword === password) {
    req.session.isLoggedIn = true;
    req.session.username = username; // 记录当前登录的用户名
    res.redirect('/虚拟光学实验室/opticalLab.html');
  } else {
    res.send('账号或密码错误！<a href="/login.html">返回重试</a>');
  }
});

// 7. 页面守卫：未登录禁止进入实验室
app.get('/虚拟光学实验室/opticalLab.html', (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login.html');
  }
});

// 8. 退出登录功能
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// 9. 开放public文件夹的网页和资源
app.use(express.static(path.join(__dirname, 'public')));

// 10. 启动服务器
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ 服务器启动失败：', err);
    return;
  }
  console.log('✅ 服务器运行成功！请访问：http://localhost:3000/login.html');
});