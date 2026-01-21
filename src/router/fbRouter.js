const express = require('express');
const fb = require('../controller/fbController');
const router = express.Router();

router.get('/login', fb.login);
router.get('/callback', fb.callback);

router.get('/pages', fb.requireAuth, fb.getPages);
router.get('/refresh-token', fb.requireAuth, fb.refreshTokenRoute);

// router.get('/page-content', fb.requireAuth, fb.getPageContent);
router.get('/page-content', fb.getPageContent);

module.exports = router;
