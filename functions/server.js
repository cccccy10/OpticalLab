const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const Redis = require('ioredis');
const path = require('path');

const app = express();
const router = express.Router();

// 你的云数据库连接（保持你自己的连接字符串不变）
const redisClient = new Redis("rediss://default:你自己的连接字符串");

// Session 配置
app.use(session({
  store: new (require('connect-redis')(session))({ client: redisClient }),
  secret: 'optical-lab-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7*24*3600000 }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// 登录路由
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const pwd = await redisClient.hget('lab_users', username);
  if (pwd && pwd === password) {
    req.session.isLoggedIn = true;
    return res.redirect('/optical-lab/opticalLab.html');
  }
  res.send('账号或密码错误 <a href="/login.html">返回</a>');
});

// 注册路由
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const exists = await redisClient.hexists('lab_users', username);
  if (exists) return res.send('用户名已存在 <a href="/register.html">返回</a>');
  await redisClient.hset('lab_users', username, password);
  res.send('注册成功 <a href="/login.html">去登录</a>');
});

// ✅ 修复后的路由守卫（标准 Express 写法）
router.use('/optical-lab/:path*', (req, res, next) => {
  if (req.session.isLoggedIn) return next();
  res.redirect('/login.html');
});

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

app.use('/', router);
module.exports.handler = serverless(app);
