const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// Render에서 제공하는 포트를 사용
const port = process.env.PORT;

require('dotenv').config();

// 환경 변수 확인
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/google/gemma-2-9b-it';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://cvwithaichat-bxh82d1dm-kim-minsungs-projects.vercel.app';

if (!HF_API_KEY) {
  console.error('HF_API_KEY is not set in .env file');
  process.exit(1);
}

if (!CORS_ORIGIN) {
  console.warn('CORS_ORIGIN is not set, using default:', CORS_ORIGIN);
}

// CORS 설정
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
}));

// 요청 속도 제한
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: { error: 'Too many requests, please try again later' },
});
app.use('/ask', limiter);

app.use(express.json());

// 헬스 체크 엔드포인트 (선택 사항)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

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

// 포트가 정의되지 않았을 경우 에러 처리
if (!port) {
  console.error('PORT is not defined by Render');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});