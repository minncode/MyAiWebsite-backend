const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT;

require('dotenv').config();

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/google/gemma-2-9b-it';

// 허용할 도메인 목록
const allowedOrigins = [
  'https://cvwithaichat-app.vercel.app',
  'https://cvwithaichat-6ml9jo5on-kim-minsungs-projects.vercel.app',
  'http://localhost:3000', // 로컬 테스트용
];

if (!HF_API_KEY) {
  console.error('HF_API_KEY is not set in .env file');
  process.exit(1);
}

// 동적 CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      console.warn(`CORS policy blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/ask', limiter);

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.post('/ask', async (req, res) => {
  const userInput = req.body.message;

  if (!userInput) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const prompt = `
You are a helpful AI assistant. Answer the user's question below clearly and concisely.

Guidelines:
1. Keep responses brief and to the point.
2. Use numbered lists with line breaks for multiple points.
3. Avoid repetition.
4. Make responses context-aware and practical.

User: ${userInput}
Assistant:
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
    console.error('Hugging Face API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(500).json({
      error: 'Error communicating with Hugging Face API',
      details: error.response?.data?.error || error.message,
    });
  }
});

if (!port) {
  console.error('PORT is not defined by Render');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});