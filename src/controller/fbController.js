const axios = require('axios');
require('dotenv').config()


// Axios instance for Graph API
const fbAxios = axios.create({
    baseURL: 'https://graph.facebook.com/v24.0'
});

// =========================
// LOGIN
// =========================
exports.login = (req, res) => {
    const url =
        `https://www.facebook.com/v24.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
        `&scope=${process.env.SCOPES}&state=123`;

    res.redirect(url);
    
};

// =========================
// CALLBACK
// =========================
exports.callback = async (req, res) => {
    const { code } = req.query;
    console.log(code)
    if (!code) return res.status(400).send('No code');

    try {
        // Short-lived token
        const shortRes = await axios.get(
            `https://graph.facebook.com/v24.0/oauth/access_token`,
            {
                params: {
                    client_id: process.env.FACEBOOK_APP_ID,
                    client_secret: process.env.FACEBOOK_APP_SECRET,
                    redirect_uri: process.env.REDIRECT_URI,
                    code
                }
            }
        );
        const shortToken = shortRes.data.access_token;
        // Long-lived token (~60 days)
        const longRes = await axios.get(
            `https://graph.facebook.com/v24.0/oauth/access_token`,
            {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: process.env.FACEBOOK_APP_ID,
                    client_secret: process.env.FACEBOOK_APP_SECRET,
                    fb_exchange_token: shortToken
                }
            }
        );

        res.cookie('fb_token', longRes.data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: '✅ Facebook connected',
            access_token: longRes.data.access_token
        });

    } catch (err) {
        console.error('err', err);
        res.status(500).send(err, 'Auth failed');
    }
};

// =========================
// AUTH MIDDLEWARE
// =========================
exports.requireAuth = (req, res, next) => {
    const token = req.cookies.fb_token;
    if (!token) return res.redirect('/facebook/login');
    req.fbToken = token;

    next();
};

// =========================
// REFRESH LONG-LIVED TOKEN
// =========================
const refreshLongLivedToken = async (token) => {
    if (!token) throw new Error('No token to refresh');

    const res = await axios.get(
        'https://graph.facebook.com/v24.0/oauth/access_token',
        {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: token
            }
        }
    );

    return res.data.access_token;
};

// =========================
// REFRESH TOKEN ROUTE
// =========================
exports.refreshTokenRoute = async (req, res) => {
    try {
        const oldToken = req.fbToken;

        const newToken = await refreshLongLivedToken(oldToken);

        res.cookie('fb_token', newToken, {
            httpOnly: true,
            maxAge: 60 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: '✅ Token refreshed',
            access_token: newToken
        });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(401).json({
            error: 'Token refresh failed – login again required'
        });
    }
};

// =========================
// GET PAGES
// =========================
exports.getPages = async (req, res) => {
    console.log('fb token',req.cookies)
    try {
        const pages = await fbAxios.get('/me/accounts', {
            params: { access_token: req.fbToken }
        });

        res.json(pages.data);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(400).json({ error: 'Failed to fetch pages' });
    }
};


// =========================
// GET POSTS OF "ISO Certification Nepal"
// =========================

exports.getPageContent = async (req, res) => {
    console.log('token from getpageconten',req.cookies)
    try {
        const pagesRes = await fbAxios.get('/me/accounts', {
            // params: { access_token: "EAAguCjvs33UBQQv1YrW82kVaZB1qkfgLBo39Ui5BbLGQNbqt9ZAb4BcbLCF2gZA7jZCEfOU7ItJn32BsqzcYzfiPlCjr1qAvhi7gF55NNkkNCaNQ7MlNFEoCO8xMZAZCIu2WGbzCIwGbUtCsLRu3whJcrOw3i06ZBHLL5xNehhZClkGs7ZCyUyT4qCzUDQFuc"}
            params: { access_token: req.fbToken }
        });

        const pages = pagesRes.data.data;

        const isoPage = pages.find(page => page.name === 'ISO Certification Nepal');
        if (!isoPage) return res.status(404).json({ error: 'Page not found ' });

        const pageId = isoPage.id;
        const pageToken = isoPage.access_token;

        const feedRes = await fbAxios.get(`/${pageId}/feed`, {
            params: { fields: "message,story,created_time,id,attachments{media,type,url},full_picture",access_token: pageToken }
        });

        res.json({
            page: isoPage.name,
            id: pageId,
            posts: feedRes.data.data
        });

        console.log(`Posts for ${isoPage.name}:`, feedRes.data.data);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(400).json({ error: 'Failed to fetch page content' });
    }
};

