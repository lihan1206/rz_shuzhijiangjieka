// 对话服务测试
import chatbotService from './chatbotService.js';
const { processUserInput, calculateBulkDiscount, validateQuantity } = chatbotService;

// 测试用例
const testCases = [
  // 购买相关
  {
    input: '我想买一张7天讲解卡，多少钱？支持微信支付吗？',
    expected: {
      intent: 'buy_card',
      card_type: '7天卡',
      price: 30,
      payment_method: ['微信']
    }
  },
  {
    input: '我之前买过卡，现在想续费，怎么操作？',
    expected: {
      intent: 'renew_card'
    }
  },
  {
    input: '支付失败了，怎么办？',
    expected: {
      intent: 'payment_failed'
    }
  },
  {
    input: '我要买100张，能优惠吗？',
    expected: {
      intent: 'bulk_buy',
      quantity: 100
    }
  },
  {
    input: '我卡丢了，能补办吗？',
    expected: {
      intent: 'replace_card'
    }
  },
  {
    input: '查询余额',
    expected: {
      intent: 'query_balance'
    }
  },
  {
    input: '我要开发票',
    expected: {
      intent: 'invoice'
    }
  },
  {
    input: '你好',
    expected: {
      intent: 'greeting'
    }
  },
  {
    input: '帮助',
    expected: {
      intent: 'help'
    }
  },
  {
    input: '我想要卡',
    expected: {
      intent: 'buy_card',
      status: 'clarification_needed'
    }
  }
];

// 运行测试
function runTests() {
  console.log('========== 对话服务测试开始 ==========\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const result = processUserInput(testCase.input);
    let testPassed = true;
    let errors = [];
    
    // 验证意图
    if (testCase.expected.intent && result.intent !== testCase.expected.intent) {
      testPassed = false;
      errors.push(`意图不匹配: 期望 ${testCase.expected.intent}, 实际 ${result.intent}`);
    }
    
    // 验证卡类型
    if (testCase.expected.card_type && result.card_type !== testCase.expected.card_type) {
      testPassed = false;
      errors.push(`卡类型不匹配: 期望 ${testCase.expected.card_type}, 实际 ${result.card_type}`);
    }
    
    // 验证价格
    if (testCase.expected.price && result.price !== testCase.expected.price) {
      testPassed = false;
      errors.push(`价格不匹配: 期望 ${testCase.expected.price}, 实际 ${result.price}`);
    }
    
    // 验证数量
    if (testCase.expected.quantity && result.quantity !== testCase.expected.quantity) {
      testPassed = false;
      errors.push(`数量不匹配: 期望 ${testCase.expected.quantity}, 实际 ${result.quantity}`);
    }
    
    // 验证状态
    if (testCase.expected.status && result.status !== testCase.expected.status) {
      testPassed = false;
      errors.push(`状态不匹配: 期望 ${testCase.expected.status}, 实际 ${result.status}`);
    }
    
    // 输出结果
    console.log(`测试: "${testCase.input}"`);
    console.log(`结果: ${testPassed ? '✅ 通过' : '❌ 失败'}`);
    if (!testPassed) {
      console.log(`错误: ${errors.join(', ')}`);
      failed++;
    } else {
      passed++;
    }
    console.log(`响应: ${result.response.substring(0, 100)}...`);
    console.log('---\n');
  }
  
  console.log('========== 测试汇总 ==========');
  console.log(`总计: ${testCases.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log('==============================');
  
  return { passed, failed, total: testCases.length };
}

// 批量购买测试
function testBulkDiscount() {
  console.log('\n========== 批量购买优惠测试 ==========\n');
  
  const testCases = [
    { quantity: 30, expectedDiscount: false },
    { quantity: 50, expectedDiscount: true, expectedLabel: '95折' },
    { quantity: 100, expectedDiscount: true, expectedLabel: '9折' },
    { quantity: 200, expectedDiscount: true, expectedLabel: '85折' },
    { quantity: 500, expectedDiscount: true, expectedLabel: '8折' }
  ];
  
  const unitPrice = 30; // 7天卡价格
  
  for (const test of testCases) {
    const result = calculateBulkDiscount(test.quantity, unitPrice);
    const passed = result.applicable === test.expectedDiscount && 
                   (!test.expectedLabel || result.label === test.expectedLabel);
    
    console.log(`数量: ${test.quantity}张`);
    console.log(`优惠: ${result.applicable ? result.label : '无优惠'}`);
    console.log(`原价: ¥${result.originalTotal}`);
    console.log(`实付: ¥${result.discountedTotal}`);
    console.log(`节省: ¥${result.savings || 0}`);
    console.log(`结果: ${passed ? '✅' : '❌'}`);
    console.log('---');
  }
}

// 验证数量测试
function testValidateQuantity() {
  console.log('\n========== 数量验证测试 ==========\n');
  
  const testCases = [
    { quantity: 0, expectedValid: false },
    { quantity: -5, expectedValid: false },
    { quantity: 50, expectedValid: true },
    { quantity: 1000, expectedValid: true },
    { quantity: 1001, expectedValid: false }
  ];
  
  for (const test of testCases) {
    const result = validateQuantity(test.quantity);
    const passed = result.valid === test.expectedValid;
    
    console.log(`数量: ${test.quantity}`);
    console.log(`验证: ${result.valid ? '有效' : '无效'}`);
    console.log(`消息: ${result.message || '无'}`);
    console.log(`结果: ${passed ? '✅' : '❌'}`);
    console.log('---');
  }
}

// 运行所有测试
runTests();
testBulkDiscount();
testValidateQuantity();

export { runTests, testBulkDiscount, testValidateQuantity };
