import express from 'express';
import { processUserInput } from './services/chatbotService.js';

const app = express();
app.use(express.json());

// 添加日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

app.post('/api/chatbot/message', (req, res) => {
  console.log('Request body:', req.body);
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    console.log('Invalid message:', message);
    return res.status(400).json({
      success: false,
      error: '请提供有效的消息内容'
    });
  }
  
  console.log('Processing message:', message);
  const response = processUserInput(message);
  console.log('Response:', response);
  
  res.json({
    success: true,
    data: response
  });
});

app.listen(8009, () => {
  console.log('Test server running on port 8009');
});
