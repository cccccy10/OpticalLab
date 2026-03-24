const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const Redis = require('ioredis');
const path = require('path');

const app = express();
const router = express.Router();

// 你的数据库
const redisClient = new Redis("rediss://default:AzmIAAIncDEzNTFkYTE1NzgzODI0ODU1OWRjOGYwNGZlYTUwYjNmNWNhAxMzkzMDQ=@relaxed-sawfly-39304.upstash.io:6379");

// Session
app.use(session({
  store: new (require('connect-redis')(session))({ client: redisClient }),
  secret: "optical-lab-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// -------------------------------
// ✅ 修复 Cannot GET / （关键！）
// -------------------------------
router.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const realPwd = await redisClient.hget('lab_users', username);
    if (realPwd && realPwd === password) {
      req.session.user = username;
      return res.redirect('/OpticalLab/OpticalLab.html');
    }
    res.send('登录失败 <a href="/login.html">返回</a>');
  } catch (e) {
    res.send('服务异常');
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await redisClient.hexists('lab_users', username);
    if (exists) return res.send('用户名已存在 <a href="/register.html">返回</a>');
    await redisClient.hset('lab_users', username, password);
    res.send('注册成功 <a href="/login.html">登录</a>');
  } catch (e) {
    res.send('服务异常');
  }
});

// 实验室页面权限
router.get('/OpticalLab/OpticalLab.html', (req, res, next) => {
  if (!req.session.user) return res.redirect('/login.html');
  next();
});

// 退出
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

app.use('/', router);
module.exports.handler = serverless(app);
