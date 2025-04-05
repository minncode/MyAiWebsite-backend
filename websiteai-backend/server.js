const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 5000;

require('dotenv').config();
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/google/gemma-2-9b-it';
app.use(cors({
    origin: 'https://cvwithaichat-bxh82d1dm-kim-minsungs-projects.vercel.app', // 배포된 프론트엔드 URL
    methods: ['GET', 'POST'],
  }));
app.use(express.json());

app.post('/ask', async (req, res) => {
  const userInput = req.body.message;

  if (!userInput) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const prompt = `
    Respond to users' questions in a clean, structured format.
    - Your answers should be concise and clear.
    - If you use lists, separate each item with a line break and number it.
    - Avoid unnecessary repetition and provide specific advice that reflects the user's context.
    ${userInput}
  `;

  try {
    const response = await axios.post(
      HF_MODEL_URL,
      { inputs: prompt, parameters: { max_length: 500, temperature: 0.7 } },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const generatedText = response.data[0]?.generated_text;

    if (generatedText) {
      const cleanText = generatedText.replace(prompt, '').trim();
      res.json({ role: 'assistant', content: cleanText || generatedText });
    } else {
      res.status(500).json({ error: 'Invalid response from Hugging Face API' });
    }
  } catch (error) {
    console.error('Hugging Face API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error communicating with Hugging Face API', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
