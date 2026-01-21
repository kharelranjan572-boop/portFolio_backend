// youtubeApi.js
const axios = require("axios");

// Your API key and channel ID
const API_KEY = "AIzaSyABgMgvkQEMIaetgJG1WcN-_h7Umw3joCw";
const CHANNEL_ID = "UCwCw93zvbrk64DDjf8m3YaQ";
// Function to get latest videos from the channel
exports.getChannelVideos = async (req, res, next) => {
    const uploadsPlaylistId = CHANNEL_ID.replace(/^UC/, 'UU');
    try {
        const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
            params: {
                part: "snippet,contentDetails",
                maxResults: 1,
                playlistId: uploadsPlaylistId,
                key: API_KEY,
            },
        });

        res.json(response.data) // array of videos
    } catch (error) {
        console.error("YouTube API Error:", error.message);
        throw error;
    }
}
// .contentDetails.videoId
// "https://www.googleapis.com/youtube/v3/videos",
//       {
//         params: {
//           part: "snippet,contentDetails,statistics,player",
//           id: videoIds.join(","),
//           key: API_KEY,
//         },
//       }

