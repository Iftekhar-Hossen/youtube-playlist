require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const port = 3000;

async function fetchPlaylistItems(id, nextPageToken = null) {
  const videosArray = [];
  try {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${id}&part=contentDetails&key=${process.env.GOOGLE_API_KEY}&maxResults=50`;
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }
    const response = await axios.get(url);
    const videoIds = response.data.items.map(item => item.contentDetails.videoId);
    const videos = await fetchVideoItems(videoIds);
    videosArray.push(...videos);
    const newPageToken = response.data.nextPageToken;
    if (newPageToken) {
      videosArray.push(...await fetchPlaylistItems(id, newPageToken));
    }
  } catch (error) {
    throw error;
  }
  return videosArray;
}

async function fetchVideoItems(items) {
  try {
    const url = `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${items.join("%2C")}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    return response.data.items;
  } catch (error) {
    throw error;
  }
}

async function fetchPlaylistInfo(id) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&id=${id}&fields=items(id%2Csnippet(title%2Cdescription%2Cthumbnails)%2CcontentDetails)&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    return response.data.items;
  } catch (error) {
    throw error;
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
}
);

app.get("/api/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const items = await fetchPlaylistItems(id);
    const playlistInfo = await fetchPlaylistInfo(id);
    let totalDuration = 0;
    for (let video of items) {
      totalDuration += parseDuration(video.contentDetails.duration);
    }
    const averageDuration = totalDuration / items.length;
    const playbackSpeeds = [2, 1.75, 1.5, 1.25, 1.0, 0.75, 0.5, 0.25];
    const playbackSpeedDurations = {};
    playbackSpeeds.forEach(speed => {
      playbackSpeedDurations[speed] = totalDuration / speed;
    });
    console.log("Total Duration:", formatDuration(totalDuration));
    console.log("Average Duration:", formatDuration(averageDuration));
    console.log("Playback Speeds:");
    for (let speed in playbackSpeedDurations) {
      console.log(`${speed}x: ${formatDuration(playbackSpeedDurations[speed])}`);
    }
    const videoData = {
      playlistInfo: playlistInfo,
      totalDuration: formatDuration(totalDuration),
      averageDuration: formatDuration(averageDuration),
      playbackSpeeds: playbackSpeedDurations
    };
    res.status(200).send(videoData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching playlist items");
  }
});

function parseDuration(durationString) {
  const match = durationString.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(duration) {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  return `${hours}:${minutes}:${seconds}`;
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
