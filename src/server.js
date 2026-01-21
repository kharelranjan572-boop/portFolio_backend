const express = require("express")
require("dotenv").config({ path: './src/.env' })
const connectDB = require('./config/db');
const cors = require('cors')
const CookieParser = require('cookie-parser')
const UserRouter = require('./router/userRouter')
const path = require('path');
const app = express()
const PORT = process.env.PORT || 5000;
const session = require("express-session");

app.use(express.json({ limit: '50mb' }));
app.use(CookieParser());
const allowedOrigins = [
  "http://localhost:3000",
  "https://stridulous-uniformless-annemarie.ngrok-free.dev"
];
app.use(cors({
  origin: true,
  credentials: true
}));
// app.use(cors({
//   origin: (origin, cb) => {
//     if (!origin) return cb(null, true);
//     if (allowedOrigins.includes(origin)) return cb(null, true);
//     return cb(new Error("Not allowed by CORS"));
//   },
//   credentials: true,
// }));

app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
}));
// Connect DB
connectDB();
app.set("trust proxy", 1);

app.use(session({
  name: "tiktok.sid",
  secret: process.env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 15
  }
}));


app.use('/', UserRouter)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/facebook', require('./router/fbRouter'))
app.use('/tiktok', require('./router/tiktokRouter'))
app.use('/youtube', require('./router/ytRouter'))

console.log(process.env.PORT)

// Start server
app.listen(PORT, () => {
  // console.log(`Server running on http://localhost:${PORT}`);
});
// module.exports=app;
