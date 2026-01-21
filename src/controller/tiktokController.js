const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

/* ===========================
   Utility functions (PKCE)
=========================== */
function generateCodeVerifier(length = 64) {
    return crypto.randomBytes(length).toString("base64url");
}

function generateCodeChallenge(codeVerifier) {
    return crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
}

/* ===========================
   TikTok Config
=========================== */
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;
const SCOPES = "user.info.basic,video.list";

;

/* ===========================
   Temp store (use DB/Redis in prod)
=========================== */
const codeVerifierS = {};

/* ===========================
   1️⃣ Generate TikTok OAuth URL
=========================== */
exports.getAuthURL = (req, res) => {
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        const state = crypto.randomBytes(8).toString("hex");
        codeVerifierS[state] = codeVerifier;

        const oauthUrl =
            `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${CLIENT_KEY}` +
            `&scope=user.info.basic,user.info.profile,user.info.stats,video.list,video.stats` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${state}` +
            `&code_challenge=${codeChallenge}` +
            `&code_challenge_method=S256`;

        res.redirect(oauthUrl);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate TikTok OAuth URL" });
    }
};

/* ===========================
   2️⃣ Exchange code for access token
=========================== */
exports.exchangeToken = async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state)
        return res.status(400).json({ error: "Missing code or state" });

    const codeVerifier = codeVerifierS[state];
    if (!codeVerifier)
        return res.status(400).json({ error: "Invalid or expired state" });

    try {
        const response = await axios.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: CLIENT_KEY,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier,
            }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Cache-Control": "no-cache",
                },
            }
        );

        delete codeVerifierS[state];

        res.cookie("tiktok_token", response.data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000, // 24h
        });

        res.json({
            message: "✅ TikTok connected",
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            open_id: response.data.open_id,
            expires_in: response.data.expires_in,
        });
    } catch (err) {
        console.error("TikTok exchange error:", err.response?.data || err.message);
        res
            .status(err.response?.status || 500)
            .json(err.response?.data || { error: err.message });
    }
};

/* ===========================
   Auth Middleware
=========================== */
exports.requireAuth = (req, res, next) => {
    const token = req.cookies?.tiktok_token;
    if (!token) return res.status(401).json({ error: "TikTok not authenticated" });

    req.tiktokToken = token;
    next();
};

/* ===========================
   Refresh Access Token
=========================== */
exports.refreshTokenRoute = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token)
            return res.status(400).json({ error: "Missing refresh token" });

        const refreshRes = await axios.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: CLIENT_KEY,
                client_secret: CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token,
            }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        res.cookie("tiktok_token", refreshRes.data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({
            message: "✅ TikTok token refreshed",
            access_token: refreshRes.data.access_token,
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(401).json({ error: "Token refresh failed" });
    }
};

/* ===========================
   Get User Info
=========================== */
exports.getUserInfo = async (req, res) => {
    const token = "act.dNZe8ZhMfGHW6x78VwA1JHSVQ2puR0EDuYmRPFXwY2H8SAxcYA1FPkOskSmc!5689.va"
    try {
        const response = await axios.get(
            "https://open.tiktokapis.com/v2/user/info/",
            {
                headers: {
                    // Authorization: `Bearer ${req.tiktokToken}`,
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                params: {
                    fields: "open_id,display_name,nickname,avatar_url"
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res
            .status(error.response?.status || 500)
            .json(error.response?.data || { error: error.message });
    }
};

/* ===========================
   Get TikTok Content (Videos)
=========================== */
exports.getTikTokContent = async (req, res) => {
    const token = "act.dNZe8ZhMfGHW6x78VwA1JHSVQ2puR0EDuYmRPFXwY2H8SAxcYA1FPkOskSmc!5689.va";
    const openId = "-000gVPF8vz2_goE0R9S02VYrWM54fR8bjBy";
    try {
        const { cursor = 0, max_count = 10 } = req.body || {};

        const response = await axios.post(
            "https://open.tiktokapis.com/v2/video/list/",
            {
                cursor,
                max_count,
            },
            {
                headers: {
                    // Authorization: `Bearer ${req.tiktokToken}`,
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                params: {
                    open_id: openId,
                    fields: "video_id,desc,create_time,play_url,cover_url,stats"
                }
            }
        );

        res.json({
            videos: response.data.data.videos,
            cursor: response.data.data.cursor,
            has_more: response.data.data.has_more,
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(400).json({ error: "Failed to fetch TikTok content", err: err.message });
    }
};
