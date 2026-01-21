const express = require('express');
const router = express.Router();
const tiktok = require('../controller/tiktokController');

// Step 1: Redirect to TikTok login
router.get("/auth", tiktok.getAuthURL);
router.get("/callback", tiktok.exchangeToken);

// router.get("/user", tiktok.requireAuth, tiktok.getUserInfo);
router.get("/user",  tiktok.getUserInfo);
// router.post("/videos", tiktok.requireAuth, tiktok.getTikTokContent);
router.get("/videos",  tiktok.getTikTokContent);
router.post("/refresh", tiktok.refreshTokenRoute);
module.exports = router;
