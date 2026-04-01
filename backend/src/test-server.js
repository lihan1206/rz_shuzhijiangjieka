import express from 'express';
import { processUserInput } from './services/chatbotService.js';

const app = express();
app.use(express.json());

app.post('/api/chatbot/message', (req, res) => {
  console.log('Received body:', req.body);
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    console.log('Invalid message:', message);
    return res.status(400).json({
      success: false,
      error: '请提供有效的消息内容'
    });
  }
  
  const response = processUserInput(message);
  console.log('Sending response:', response.intent);
  
  res.json({
    success: true,
    data: response
  });
});

app.listen(8010, () => {
  console.log('Test server running on port 8010');
});
