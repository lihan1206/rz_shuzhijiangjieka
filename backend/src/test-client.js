import http from 'http';

const testCases = [
  '我想买一张7天讲解卡，多少钱？支持微信支付吗？',
  '我之前买过卡，现在想续费，怎么操作？',
  '支付失败了，怎么办？',
  '我要买100张，能优惠吗？',
  '我卡丢了，能补办吗？'
];

function sendRequest(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message });
    
    const options = {
      hostname: 'localhost',
      port: 8010,
      path: '/api/chatbot/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('========== API 测试开始 ==========\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`测试: "${testCase}"`);
      const result = await sendRequest(testCase);
      console.log('意图:', result.data.intent);
      console.log('响应:', result.data.response.substring(0, 80) + '...');
      console.log('状态:', result.data.status);
      console.log('---\n');
    } catch (error) {
      console.error('请求失败:', error.message);
    }
  }
}

runTests();
