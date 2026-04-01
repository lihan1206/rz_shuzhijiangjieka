// 数字讲解卡智能对话服务
// 支持：购买引导、支付、查询、异常处理、发票、续费、退卡等功能

// 卡种配置
const CARD_TYPES = {
  '1天卡': { days: 1, price: 10, name: '1天讲解卡' },
  '3天卡': { days: 3, price: 20, name: '3天讲解卡' },
  '7天卡': { days: 7, price: 30, name: '7天讲解卡' },
  '30天卡': { days: 30, price: 80, name: '30天讲解卡' },
  '年卡': { days: 365, price: 299, name: '年度讲解卡' }
};

// 支付方式
const PAYMENT_METHODS = {
  '微信': ['微信支付', '微信', 'wechat', 'weixin'],
  '支付宝': ['支付宝', 'alipay', 'zhifubao'],
  '银联': ['银联', '银行卡', '云闪付', 'unionpay', 'yinlian']
};

// 意图类型
const INTENTS = {
  BUY_CARD: 'buy_card',
  QUERY_BALANCE: 'query_balance',
  QUERY_STATUS: 'query_status',
  RENEW_CARD: 'renew_card',
  REFUND_CARD: 'refund_card',
  REPLACE_CARD: 'replace_card',
  INVOICE: 'invoice',
  PAYMENT_FAILED: 'payment_failed',
  HELP: 'help',
  GREETING: 'greeting',
  UNKNOWN: 'unknown',
  BULK_BUY: 'bulk_buy'
};

// 批量购买优惠规则
const BULK_DISCOUNTS = [
  { min: 50, max: 99, discount: 0.95, label: '95折' },
  { min: 100, max: 199, discount: 0.90, label: '9折' },
  { min: 200, max: 499, discount: 0.85, label: '85折' },
  { min: 500, max: Infinity, discount: 0.80, label: '8折' }
];

/**
 * 意图识别
 * @param {string} input - 用户输入
 * @returns {string} 意图类型
 */
function recognizeIntent(input) {
  const text = input.toLowerCase();
  
  // 问候 - 优先匹配
  if (/^(你好|您好|在吗|有人吗|hi|hello)$/i.test(text) || /^(你好|您好).{0,5}$/.test(input)) {
    return INTENTS.GREETING;
  }
  
  // 帮助 - 优先匹配
  if (/^帮助$|^help$/.test(text) || /有什么可以帮|需要什么帮助/.test(text)) {
    return INTENTS.HELP;
  }
  
  // 支付失败 - 在购卡之前匹配
  if (/支付失败|付不了|付不.*钱|付款.*失败|支付.*出错|无法支付/.test(text)) {
    return INTENTS.PAYMENT_FAILED;
  }
  
  // 批量购买 - 在普通购买之前匹配
  if (/\d+\s*张|大量|批量|团购|买.*张.*优惠|买.*张.*便宜/.test(text)) {
    return INTENTS.BULK_BUY;
  }
  
  // 续费 - 在购买之前匹配
  if (/续费|延期|延长|续期|续.*卡|之前.*买.*续/.test(text)) {
    return INTENTS.RENEW_CARD;
  }
  
  // 退卡
  if (/退.*卡|退款|退钱|不用.*卡|取消.*卡/.test(text)) {
    return INTENTS.REFUND_CARD;
  }
  
  // 补卡/卡丢失
  if (/丢|补.*卡|挂失|找不|不见|忘|丢失/.test(text)) {
    return INTENTS.REPLACE_CARD;
  }
  
  // 发票
  if (/发票|电子发票|开票|报销/.test(text)) {
    return INTENTS.INVOICE;
  }
  
  // 查询余额
  if (/余额|还剩.*多少|查询.*钱|账户.*多少/.test(text)) {
    return INTENTS.QUERY_BALANCE;
  }
  
  // 查询状态
  if (/状态|激活|有效期|过期|到期|还能用|是否可用/.test(text)) {
    return INTENTS.QUERY_STATUS;
  }
  
  // 购买相关 - 最后匹配
  if (/买|购|订|要.*卡|来.*张|多少钱|价格|费用/.test(text)) {
    return INTENTS.BUY_CARD;
  }
  
  return INTENTS.UNKNOWN;
}

/**
 * 提取卡类型
 * @param {string} input - 用户输入
 * @returns {string|null} 卡类型
 */
function extractCardType(input) {
  const text = input.toLowerCase();
  
  // 按优先级顺序匹配（从长到短，避免误匹配）
  if (/30天|三十天|一个月|月度/.test(text)) return '30天卡';
  if (/7天|七天|一周|星期/.test(text)) return '7天卡';
  if (/3天|三天|72小时|72h/.test(text)) return '3天卡';
  if (/1天|一天|24小时|24h/.test(text)) return '1天卡';
  if (/年卡|365天|一年|年度|包年/.test(text)) return '年卡';
  
  return null;
}

/**
 * 提取支付方式
 * @param {string} input - 用户输入
 * @returns {string[]} 支付方式列表
 */
function extractPaymentMethods(input) {
  const text = input.toLowerCase();
  const methods = [];
  
  for (const [method, keywords] of Object.entries(PAYMENT_METHODS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        methods.push(method);
        break;
      }
    }
  }
  
  // 如果没指定，返回所有支付方式
  if (methods.length === 0) {
    return Object.keys(PAYMENT_METHODS);
  }
  
  return [...new Set(methods)];
}

/**
 * 提取数量
 * @param {string} input - 用户输入
 * @returns {number|null} 数量
 */
function extractQuantity(input) {
  const matches = input.match(/(\d+)\s*张/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
  
  // 中文数字
  const chineseNumbers = {
    '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '百': 100, '千': 1000
  };
  
  for (const [cn, num] of Object.entries(chineseNumbers)) {
    if (input.includes(cn + '张')) {
      return num;
    }
  }
  
  return null;
}

/**
 * 计算批量优惠
 * @param {number} quantity - 数量
 * @param {number} unitPrice - 单价
 * @returns {object} 优惠信息
 */
function calculateBulkDiscount(quantity, unitPrice) {
  if (quantity < 50) {
    return {
      applicable: false,
      originalTotal: quantity * unitPrice,
      discountedTotal: quantity * unitPrice,
      discount: 1,
      label: '无优惠'
    };
  }
  
  const rule = BULK_DISCOUNTS.find(r => quantity >= r.min && quantity <= r.max);
  if (!rule) {
    return {
      applicable: false,
      originalTotal: quantity * unitPrice,
      discountedTotal: quantity * unitPrice,
      discount: 1,
      label: '无优惠'
    };
  }
  
  const originalTotal = quantity * unitPrice;
  const discountedTotal = Math.round(originalTotal * rule.discount);
  
  return {
    applicable: true,
    originalTotal,
    discountedTotal,
    discount: rule.discount,
    label: rule.label,
    savings: originalTotal - discountedTotal
  };
}

/**
 * 验证购买数量
 * @param {number} quantity - 数量
 * @returns {object} 验证结果
 */
function validateQuantity(quantity) {
  if (quantity <= 0) {
    return { valid: false, message: '购买数量必须大于0' };
  }
  if (quantity > 1000) {
    return { valid: false, message: '单次购买不能超过1000张，如需更多请联系客服' };
  }
  return { valid: true };
}

/**
 * 生成购买响应
 * @param {string} cardType - 卡类型
 * @param {string[]} paymentMethods - 支付方式
 * @param {number|null} quantity - 数量
 * @returns {object} 响应对象
 */
function generateBuyResponse(cardType, paymentMethods, quantity = null, intent = INTENTS.BUY_CARD) {
  const card = CARD_TYPES[cardType];
  
  // 批量购买但没有指定卡类型
  if (intent === INTENTS.BULK_BUY && !card) {
    return {
      intent: INTENTS.BULK_BUY,
      card_type: null,
      quantity: quantity,
      price: null,
      payment_method: Object.keys(PAYMENT_METHODS),
      response: `您要购买${quantity}张卡。我们提供以下讲解卡：\n1天卡（10元）\n3天卡（20元）\n7天卡（30元）\n30天卡（80元）\n年卡（299元）\n\n50张以上享95折，100张以上享9折，200张以上享85折，500张以上享8折。\n\n请问您需要哪种卡？`,
      status: 'clarification_needed',
      available_cards: Object.keys(CARD_TYPES),
      bulk_discounts: BULK_DISCOUNTS
    };
  }
  
  // 普通购买但没有指定卡类型
  if (!card) {
    return {
      intent: INTENTS.BUY_CARD,
      card_type: null,
      price: null,
      payment_method: Object.keys(PAYMENT_METHODS),
      response: '您好！我们提供以下讲解卡：\n1天卡（10元）\n3天卡（20元）\n7天卡（30元）\n30天卡（80元）\n年卡（299元）\n\n请问您需要哪种卡？',
      status: 'clarification_needed',
      available_cards: Object.keys(CARD_TYPES)
    };
  }
  
  // 批量购买处理
  if (quantity && quantity > 1) {
    const validation = validateQuantity(quantity);
    if (!validation.valid) {
      return {
        intent: INTENTS.BULK_BUY,
        card_type: cardType,
        quantity: quantity,
        price: card.price,
        payment_method: paymentMethods,
        response: validation.message + '。请问您需要购买多少张？',
        status: 'error'
      };
    }
    
    const discount = calculateBulkDiscount(quantity, card.price);
    
    if (discount.applicable) {
      return {
        intent: INTENTS.BULK_BUY,
        card_type: cardType,
        quantity: quantity,
        unit_price: card.price,
        original_total: discount.originalTotal,
        discounted_total: discount.discountedTotal,
        discount_label: discount.label,
        savings: discount.savings,
        payment_method: paymentMethods,
        response: `您好！购买${quantity}张${card.name}，原价${discount.originalTotal}元，享受${discount.label}优惠，实付${discount.discountedTotal}元，节省${discount.savings}元。支持${paymentMethods.join('、')}支付。您现在要购买吗？`,
        status: 'success'
      };
    } else {
      const total = quantity * card.price;
      return {
        intent: INTENTS.BULK_BUY,
        card_type: cardType,
        quantity: quantity,
        unit_price: card.price,
        total: total,
        payment_method: paymentMethods,
        response: `您好！${quantity}张${card.name}共${total}元（单价${card.price}元/张）。购买50张以上可享受批量优惠哦！支持${paymentMethods.join('、')}支付。您现在要购买吗？`,
        status: 'success'
      };
    }
  }
  
  return {
    intent: INTENTS.BUY_CARD,
    card_type: cardType,
    price: card.price,
    payment_method: paymentMethods,
    response: `您好，${card.name}${card.price}元，支持${paymentMethods.join('、')}支付。您现在要购买吗？`,
    status: 'success'
  };
}

/**
 * 生成续费响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateRenewResponse(input) {
  return {
    intent: INTENTS.RENEW_CARD,
    response: '您好！续费非常简单：\n1. 登录您的账户\n2. 进入"我的卡片"页面\n3. 选择需要续费的卡片\n4. 点击"立即续费"\n5. 选择续费时长并完成支付\n\n或者您可以直接告诉我需要续费哪种卡，我可以帮您快速办理。',
    status: 'success',
    available_cards: Object.keys(CARD_TYPES),
    card_prices: Object.fromEntries(
      Object.entries(CARD_TYPES).map(([k, v]) => [k, v.price])
    )
  };
}

/**
 * 生成退卡响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateRefundResponse(input) {
  return {
    intent: INTENTS.REFUND_CARD,
    response: '您好！关于退卡/退款：\n\n【可退情况】\n• 未激活的卡片：全额退款\n• 激活后7天内：按比例退款\n• 卡片质量问题：全额退款\n\n【退款流程】\n1. 提交退卡申请\n2. 客服审核（1-2个工作日）\n3. 退款原路返回\n\n【注意事项】\n• 已过期卡片不支持退款\n• 批量购买退卡需扣除手续费\n\n如需办理，请提供您的卡号或订单号。',
    status: 'success',
    refund_policy: {
      unused: '全额退款',
      within_7days: '按比例退款',
      after_7days: '不可退款',
      processing_time: '1-2个工作日'
    }
  };
}

/**
 * 生成补卡响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateReplaceResponse(input) {
  return {
    intent: INTENTS.REPLACE_CARD,
    response: '您好！卡丢失可以补办，请放心：\n\n【补办方式】\n1. 在线补办：登录账户→卡片管理→申请补卡\n2. 电话补办：拨打客服热线 400-xxx-xxxx\n3. 现场补办：携带身份证到服务台\n\n【补办费用】\n• 普通补办：10元工本费\n• VIP用户：免费补办\n\n【原卡处理】\n• 原卡立即挂失失效\n• 余额自动转移到新卡\n• 有效期保持不变\n\n请问您需要立即办理吗？',
    status: 'success',
    replace_options: ['在线补办', '电话补办', '现场补办'],
    fee: 10
  };
}

/**
 * 生成发票响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateInvoiceResponse(input) {
  return {
    intent: INTENTS.INVOICE,
    response: '您好！电子发票申请指南：\n\n【申请方式】\n1. 登录账户→订单管理→申请发票\n2. 或提供订单号，我帮您申请\n\n【发票类型】\n• 增值税普通发票（电子）\n• 增值税专用发票\n\n【开票信息】\n• 个人：姓名、手机号\n• 企业：企业名称、税号\n\n【时效】\n• 电子发票：24小时内发送至邮箱\n• 专用发票：3-5个工作日邮寄\n\n请提供您的订单号或手机号，我可以帮您查询并申请。',
    status: 'success',
    invoice_types: ['增值税普通发票', '增值税专用发票'],
    processing_time: '24小时内'
  };
}

/**
 * 生成支付失败响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generatePaymentFailedResponse(input) {
  return {
    intent: INTENTS.PAYMENT_FAILED,
    response: '很抱歉支付遇到问题，以下是常见解决方法：\n\n【微信/支付宝支付失败】\n1. 检查网络连接是否正常\n2. 确认账户余额充足\n3. 尝试重新扫码支付\n4. 更换支付方式重试\n\n【银行卡支付失败】\n1. 确认银行卡已开通网银\n2. 检查支付限额\n3. 联系银行确认交易状态\n\n【其他解决方案】\n• 清除浏览器缓存后重试\n• 更换设备或浏览器\n• 联系客服协助处理\n\n如果问题仍未解决，请提供错误提示信息，我会帮您进一步排查。',
    status: 'success',
    troubleshooting: [
      '检查网络连接',
      '确认账户余额',
      '更换支付方式',
      '联系客服协助'
    ],
    support_contact: '400-xxx-xxxx'
  };
}

/**
 * 生成查询余额响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateBalanceResponse(input) {
  return {
    intent: INTENTS.QUERY_BALANCE,
    response: '您好！查询余额请提供以下信息之一：\n1. 卡号\n2. 注册手机号\n3. 订单号\n\n或者您可以：\n• 登录账户自助查询\n• 拨打客服热线查询\n\n请提供您的查询信息，我立即为您查询。',
    status: 'clarification_needed',
    query_methods: ['卡号', '手机号', '订单号']
  };
}

/**
 * 生成查询状态响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateStatusResponse(input) {
  return {
    intent: INTENTS.QUERY_STATUS,
    response: '您好！查询卡片激活状态请提供：\n1. 卡号\n2. 注册手机号\n\n或者您可以：\n• 登录账户查看"我的卡片"\n• 在设备上刷卡查看状态\n\n请提供您的卡号或手机号，我帮您查询激活状态和有效期。',
    status: 'clarification_needed',
    query_methods: ['卡号', '手机号']
  };
}

/**
 * 生成帮助响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateHelpResponse(input) {
  return {
    intent: INTENTS.HELP,
    response: '您好！我是数字讲解卡智能助手，可以帮您：\n\n【购买相关】\n• 了解卡种和价格\n• 引导支付（微信/支付宝/银联）\n• 批量购买优惠咨询\n\n【查询服务】\n• 查询余额和有效期\n• 查询激活状态\n\n【售后服务】\n• 续费延期\n• 退卡退款\n• 卡丢失补办\n• 电子发票申请\n\n【异常处理】\n• 支付失败解决\n• 使用问题排查\n\n请问您需要什么帮助？可以直接告诉我您的问题。',
    status: 'success',
    available_services: [
      '购买讲解卡',
      '查询余额',
      '查询状态',
      '续费',
      '退卡',
      '补办',
      '发票',
      '支付问题'
    ]
  };
}

/**
 * 生成问候响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateGreetingResponse(input) {
  return {
    intent: INTENTS.GREETING,
    response: '您好！欢迎来到数字讲解卡服务中心。我是您的智能助手，可以帮您办理购卡、查询、续费、退卡等业务。\n\n请问有什么可以帮您的吗？\n• 了解讲解卡价格\n• 购买讲解卡\n• 查询卡片信息\n• 其他服务',
    status: 'success'
  };
}

/**
 * 生成未知意图响应
 * @param {string} input - 用户输入
 * @returns {object} 响应对象
 */
function generateUnknownResponse(input) {
  return {
    intent: INTENTS.UNKNOWN,
    response: '抱歉，我不太理解您的意思。我是数字讲解卡智能助手，可以帮您：\n\n1. 购买讲解卡（1天/3天/7天/30天/年卡）\n2. 查询余额和有效期\n3. 办理续费、退卡、补卡\n4. 申请电子发票\n5. 解决支付问题\n\n请告诉我您具体需要什么帮助？或者输入"帮助"查看详细服务列表。',
    status: 'clarification_needed',
    suggestions: ['购买卡片', '查询余额', '续费', '帮助']
  };
}

/**
 * 主处理函数 - 处理用户输入并返回结构化响应
 * @param {string} userInput - 用户输入
 * @returns {object} 结构化响应对象
 */
export function processUserInput(userInput) {
  if (!userInput || userInput.trim() === '') {
    return {
      intent: INTENTS.UNKNOWN,
      response: '您好，请输入您的问题或需求。输入"帮助"可查看服务列表。',
      status: 'clarification_needed'
    };
  }
  
  const intent = recognizeIntent(userInput);
  
  switch (intent) {
    case INTENTS.BUY_CARD: {
      const cardType = extractCardType(userInput);
      const paymentMethods = extractPaymentMethods(userInput);
      const quantity = extractQuantity(userInput);
      return generateBuyResponse(cardType, paymentMethods, quantity, INTENTS.BUY_CARD);
    }
    
    case INTENTS.BULK_BUY: {
      const cardType = extractCardType(userInput);
      const paymentMethods = extractPaymentMethods(userInput);
      const quantity = extractQuantity(userInput);
      return generateBuyResponse(cardType, paymentMethods, quantity, INTENTS.BULK_BUY);
    }
    
    case INTENTS.RENEW_CARD:
      return generateRenewResponse(userInput);
    
    case INTENTS.REFUND_CARD:
      return generateRefundResponse(userInput);
    
    case INTENTS.REPLACE_CARD:
      return generateReplaceResponse(userInput);
    
    case INTENTS.INVOICE:
      return generateInvoiceResponse(userInput);
    
    case INTENTS.PAYMENT_FAILED:
      return generatePaymentFailedResponse(userInput);
    
    case INTENTS.QUERY_BALANCE:
      return generateBalanceResponse(userInput);
    
    case INTENTS.QUERY_STATUS:
      return generateStatusResponse(userInput);
    
    case INTENTS.HELP:
      return generateHelpResponse(userInput);
    
    case INTENTS.GREETING:
      return generateGreetingResponse(userInput);
    
    default:
      return generateUnknownResponse(userInput);
  }
}

// 导出模块
export default {
  processUserInput,
  recognizeIntent,
  extractCardType,
  extractPaymentMethods,
  extractQuantity,
  calculateBulkDiscount,
  validateQuantity,
  CARD_TYPES,
  PAYMENT_METHODS,
  INTENTS,
  BULK_DISCOUNTS
};
