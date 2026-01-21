const express = require('express');
const router = express.Router();
const YouTube = require('../controller/ytController');

// Step 1: Redirect to TikTok login
router.get("/videos", YouTube.getChannelVideos);

module.exports = router;