const axios = require("axios");

async function getRegeneratedContent(prompt) {
  try {
    const response = await axios.post("http://127.0.0.1:5000/generate", { prompt });
    return response.data.result;
  } catch (err) {
    console.error("Flask API error:", err.message);
    throw new Error("Content generation failed");
  }
}

module.exports = { getRegeneratedContent };
