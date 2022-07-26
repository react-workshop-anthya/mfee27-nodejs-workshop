const express = require('express');
// 初始化dotenv
require('dotenv').config();
const app = express();
const port = process.env.SERVER_PORT || 3001; //防呆

const path = require('path');

// 預設都是全部開放(*)
const cors = require('cors');
// app.use(cors());
const corOptions = {
  // 讓 cookie 可以跨網域存取 須把 credentials 設為 true 並且在 origin 指定自家的前端是誰
  credentials: true,
  // origin:['網址1','網址2',...其他網址]
  origin: ['http://localhost:3000'], //指定只允許自己家的同源網站
};
app.use(cors(corOptions));

// 啟用 session;
const expressSession = require('express-session');
// 把 session 存在硬碟中
var FileStore = require('session-file-store')(expressSession);
app.use(
  expressSession({
    // 檔案夾會放在專案之外 -> 防止 nodemon 一直重新啟動
    // -> 一把資料寫入 session 專案會被直接停掉重啟 -> response 送不回去
    store: new FileStore({ path: path.join(__dirname, '..', 'sessions') }),
    secret: process.env.SESSION_SECRET,
    // 如果 session 沒有改變 要不要重新儲存?
    resave: false,
    // 還沒初始化的 要不要存?
    saveUninitialized: false,
  })
);

// db refactor
// stock API refactor 之後 會被丟進 stock.js 內 但為免未來其他功能需要用到同樣套件 這裡先保留
const mysql = require('mysql2');
const pool = require('./utilis/db');

// 如果要讓 express 認得 json
// 要加上這個中間件(少數 express 內建)
app.use(express.json());

// 設定視圖引擎 使用 pug (可自由替換喜歡的套件)
// 記得先npm i pug裝好
app.set('view engine', 'pug');
// // 告訴 express 視圖在哪裡 -> views 指定為 views檔案夾
app.set('views', 'views');

let pugRouter = require('./routers/pug');
// 引用時路徑會被合併
app.use(pugRouter);
// 設置靜態檔案

// express.static => 讓靜態檔案可以有網址
// http://localhost:3001/uploads/member-1662189848502.png
app.use(express.static(path.join(__dirname, 'public')));

// 測試 server side render
app.get('/ssr', (req, res, next) => {
  // views/index.pug
  // 可以設定要給的資料 傳進index.pug
  res.render('index', {
    stocks: ['台積電', '長榮', '聯發科'],
  });
});

// 一般的middleware
app.use((req, res, next) => {
  console.log('這是第 1 個中間件');
  let now = new Date();
  console.log(`有人來訪問 at ${now}`);
  next();
  // res.send('ABC'); //如果在這裡就send 請求會在這裡就結束 不會連到首頁
});

// app.use((req, res, next) => {
//   console.log('這是第 2 個中間件');
//   // next();
//   // 如果中間件沒有結束，也沒有呼叫next()或做其他處理 fetch會卡在這裡 直到逾時
// });

// app.[method]
// method: get, post, delete, put, patch......
// 指定網址 -> 路由中間件
app.get('/', (req, res, next) => {
  // 連到首頁 如果成功 回傳 Hello Express
  res.send('Hello Express');
  console.log('這是首頁');
});

// 路由中間件
app.get('/test', (req, res, next) => {
  console.log('這裡是test');
  res.send('Hello Test');
});

// Stock API refactor
let stockRouter = require('./routers/stock');
// 引用時路徑會被合併
app.use('/api/1.0/stocks', stockRouter);

// auth router 註冊驗證
// TODO: 引用時加上prefix
let authRouter = require('./routers/auth');
app.use(authRouter);

// 引用 member
let memberRouter = require('./routers/member');
// 使用prefix
app.use('/api/1.0/member', memberRouter);

app.use((req, res, next) => {
  // 但因為首頁 response 有指定網址: '/' 所以如果網址下的是其他網址 這裡會被執行到 e.g. localhost:3001/test (不存在的網址)
  // 如果前面完全沒有符合的網址 (404) 才會進來這裡
  // 利用這個特殊順序，可以把這個位置當成 404 使用(可以客製頁面)
  console.log('若找到網址 response已執行 這裡不會被執行到');
  console.log('在所有路由中間件下面');
  res.status(404).send('Not Found !!! @@');
  // res.send('ABC'); //如果在這裡就send 請求會在這裡就結束 不會連到首頁
});

// 錯誤處理中間件：放在所有中間件後面(比404還後面)
// 有四個參數
// 捕捉上面所有中間件的 exception (除 await sync 之外的)
// 可想成所有中間件的 catch
app.use((err, req, res, next) => {
  console.error('來自四個參數的錯誤處理中間件', err);
  console.error('path:', req.path);
  res.status(500).json({ message: '請洽系統管理員' });
});

// magic number -> 突然跑出一個數字不知道是什麼
// app.listen(3001, () => {
//   console.log('server start at 3001');
// });

// 把port變成變數 方便管理 減少bug
app.listen(port, () => {
  console.log(`server start at ${port}`);
});
