const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const Redis = require('ioredis');
const path = require('path');

const app = express();
const router = express.Router();

// 替换成你自己的 Upstash 连接字符串
const redisClient = new Redis("rediss://default:你的数据库连接字符串");

// Session 配置
app.use(session({
  store: new (require('connect-redis')(session))({ client: redisClient }),
  secret: "optical-lab-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// 登录：跳转到你的 OpticalLab.html
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

// 实验室页面鉴权（精确匹配你的文件名）
router.get('/OpticalLab/OpticalLab.html', (req, res, next) => {
  if (!req.session.user) return res.redirect('/login.html');
  next();
});

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

app.use('/', router);
module.exports.handler = serverless(app);