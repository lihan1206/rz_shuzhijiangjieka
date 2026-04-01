import { prisma } from '../config/prisma.js';

const INTENTS = {
  BUY_CARD: 'buy_card',
  RECHARGE: 'recharge',
  QUERY_BALANCE: 'query_balance',
  QUERY_STATUS: 'query_status',
  REPORT_LOSS: 'report_loss',
  PAYMENT_FAILURE: 'payment_failure',
  BULK_PURCHASE: 'bulk_purchase',
  REFUND: 'refund',
  INVOICE: 'invoice',
  FAQ: 'faq',
  UNKNOWN: 'unknown'
};

const CARD_TYPE_KEYWORDS = {
  '1天卡': ['1天', '一天', '单日', '日卡'],
  '3天卡': ['3天', '三天', '三日'],
  '7天卡': ['7天', '七天', '周卡', '一周'],
  '月卡': ['月卡', '30天', '三十天', '一个月'],
  '季卡': ['季卡', '90天', '三个月'],
  '年卡': ['年卡', '365天', '一年']
};

const PAYMENT_KEYWORDS = {
  WECHAT: ['微信', '微信支付', 'weixin', 'wechat'],
  ALIPAY: ['支付宝', 'alipay', '阿里支付'],
  UNIONPAY: ['银联', '云闪付', 'unionpay'],
  CASH: ['现金', '付现']
};

const INTENT_KEYWORDS = {
  [INTENTS.BUY_CARD]: ['买', '购买', '购卡', '办卡', '要一张', '想要卡', '买卡', '办一张'],
  [INTENTS.RECHARGE]: ['续费', '充值', '续卡', '延期', '充值续费'],
  [INTENTS.QUERY_BALANCE]: ['余额', '查询余额', '查余额', '多少钱', '剩多少', '还有多少'],
  [INTENTS.QUERY_STATUS]: ['状态', '激活', '查询状态', '查状态', '是否激活', '卡状态'],
  [INTENTS.REPORT_LOSS]: ['丢失', '丢了', '丢了卡', '挂失', '补办', '丢卡', '找不到卡'],
  [INTENTS.PAYMENT_FAILURE]: ['支付失败', '付款失败', '付不了', '无法支付', '支付不成功', '扣款失败'],
  [INTENTS.BULK_PURCHASE]: ['张', '团购', '批量', '多张', '很多'],
  [INTENTS.REFUND]: ['退款', '退卡', '退货', '退钱', '不要了'],
  [INTENTS.INVOICE]: ['发票', '电子发票', '开票', '要发票', '开发票']
};

function detectIntent(input) {
  const lowerInput = input.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        if (intent === INTENTS.BUY_CARD) {
          const quantityMatch = input.match(/(\d+)\s*张/);
          if (quantityMatch && parseInt(quantityMatch[1]) > 1) {
            return INTENTS.BULK_PURCHASE;
          }
        }
        return intent;
      }
    }
  }
  
  return INTENTS.UNKNOWN;
}

function extractCardType(input) {
  for (const [cardName, keywords] of Object.entries(CARD_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return cardName;
      }
    }
  }
  return null;
}

function extractPaymentMethod(input) {
  const methods = [];
  for (const [method, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        methods.push(method);
        break;
      }
    }
  }
  return methods;
}

function extractQuantity(input) {
  const match = input.match(/(\d+)\s*张/);
  return match ? parseInt(match[1]) : 1;
}

function extractPrice(input) {
  const match = input.match(/(\d+)\s*元/);
  return match ? parseInt(match[1]) : null;
}

function extractCardNo(input) {
  const match = input.match(/[A-Za-z]?\d{6,}/);
  return match ? match[0] : null;
}

async function getCardTypeInfo(cardTypeName) {
  const cardTypes = await prisma.cardType.findMany({
    where: { isActive: true }
  });
  
  for (const ct of cardTypes) {
    if (ct.name === cardTypeName) {
      return ct;
    }
    if (ct.name.includes(cardTypeName) || cardTypeName.includes(ct.name)) {
      return ct;
    }
  }
  
  return null;
}

async function handleBuyCard(input) {
  const cardTypeName = extractCardType(input);
  const paymentMethods = extractPaymentMethod(input);
  const quantity = extractQuantity(input);
  
  if (!cardTypeName) {
    const cardTypes = await prisma.cardType.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { price: 'asc' }
    });
    
    if (cardTypes.length === 0) {
      return {
        intent: INTENTS.BUY_CARD,
        status: 'error',
        response: '抱歉，目前暂无可用卡种，请稍后再试或联系客服。',
        available_cards: []
      };
    }
    
    const cardList = cardTypes.map(ct => `${ct.name}(${ct.price}元/${ct.validDays}天)`).join('、');
    return {
      intent: INTENTS.BUY_CARD,
      status: 'need_info',
      response: `请问您需要哪种讲解卡？目前可选：${cardList}。您也可以告诉我您的需求，我来为您推荐。`,
      available_cards: cardTypes.map(ct => ({
        name: ct.name,
        price: Number(ct.price),
        validDays: ct.validDays,
        stock: ct.stock
      }))
    };
  }
  
  const cardType = await getCardTypeInfo(cardTypeName);
  
  if (!cardType) {
    return {
      intent: INTENTS.BUY_CARD,
      card_type: cardTypeName,
      status: 'error',
      response: `抱歉，未找到"${cardTypeName}"。请确认卡种名称，或输入"推荐"让我为您介绍。`
    };
  }
  
  if (cardType.stock < quantity) {
    return {
      intent: INTENTS.BUY_CARD,
      card_type: cardType.name,
      price: Number(cardType.price),
      status: 'error',
      response: `抱歉，${cardType.name}库存不足，当前仅剩${cardType.stock}张。请减少购买数量或选择其他卡种。`,
      stock: cardType.stock
    };
  }
  
  const totalAmount = Number(cardType.price) * quantity;
  const paymentText = paymentMethods.length > 0 
    ? paymentMethods.map(m => PAYMENT_KEYWORDS[m]?.[0] || m).join('、')
    : '微信、支付宝、银联';
  
  return {
    intent: INTENTS.BUY_CARD,
    card_type: cardType.name,
    price: Number(cardType.price),
    quantity,
    total_amount: totalAmount,
    payment_method: paymentMethods.length > 0 ? paymentMethods : ['WECHAT', 'ALIPAY', 'UNIONPAY'],
    valid_days: cardType.validDays,
    response: `您好，${cardType.name}${cardType.price}元/张，有效期${cardType.validDays}天。${quantity > 1 ? `购买${quantity}张共${totalAmount}元。` : ''}支持${paymentText}支付。您现在要购买吗？`,
    status: 'success'
  };
}

async function handleRecharge(input) {
  const cardNo = extractCardNo(input);
  const paymentMethods = extractPaymentMethod(input);
  
  if (!cardNo) {
    return {
      intent: INTENTS.RECHARGE,
      status: 'need_info',
      response: '请提供您要续费的卡号，我帮您查询续费信息。卡号通常为6位以上数字。'
    };
  }
  
  const card = await prisma.card.findUnique({
    where: { cardNo },
    include: { cardType: true }
  });
  
  if (!card) {
    return {
      intent: INTENTS.RECHARGE,
      card_no: cardNo,
      status: 'error',
      response: `未找到卡号 ${cardNo}，请确认卡号是否正确。如需帮助，请联系客服。`
    };
  }
  
  if (card.status === 'LOST') {
    return {
      intent: INTENTS.RECHARGE,
      card_no: cardNo,
      status: 'error',
      response: `该卡已挂失，无法续费。如需补办新卡，请携带有效证件到服务台办理。`
    };
  }
  
  if (card.status === 'FROZEN') {
    return {
      intent: INTENTS.RECHARGE,
      card_no: cardNo,
      status: 'error',
      response: `该卡已被冻结，请联系客服了解详情。`
    };
  }
  
  const paymentText = paymentMethods.length > 0 
    ? paymentMethods.map(m => PAYMENT_KEYWORDS[m]?.[0] || m).join('、')
    : '微信、支付宝、银联';
  
  return {
    intent: INTENTS.RECHARGE,
    card_no: cardNo,
    card_type: card.cardType.name,
    balance: Number(card.balance),
    expires_at: card.expiresAt,
    status: 'success',
    response: `您的${card.cardType.name}当前余额${card.balance}元，有效期至${new Date(card.expiresAt).toLocaleDateString()}。支持${paymentText}充值续费。请问您要充值多少？`
  };
}

async function handleQueryBalance(input) {
  const cardNo = extractCardNo(input);
  
  if (!cardNo) {
    return {
      intent: INTENTS.QUERY_BALANCE,
      status: 'need_info',
      response: '请提供您的卡号，我帮您查询余额。'
    };
  }
  
  const card = await prisma.card.findUnique({
    where: { cardNo },
    include: { cardType: true }
  });
  
  if (!card) {
    return {
      intent: INTENTS.QUERY_BALANCE,
      card_no: cardNo,
      status: 'error',
      response: `未找到卡号 ${cardNo}，请确认卡号是否正确。`
    };
  }
  
  const statusText = {
    ACTIVE: '正常使用',
    FROZEN: '已冻结',
    LOST: '已挂失',
    EXPIRED: '已过期'
  }[card.status] || card.status;
  
  return {
    intent: INTENTS.QUERY_BALANCE,
    card_no: cardNo,
    card_type: card.cardType.name,
    balance: Number(card.balance),
    status: 'success',
    card_status: card.status,
    card_status_text: statusText,
    expires_at: card.expiresAt,
    response: `您的${card.cardType.name}余额为${card.balance}元，状态：${statusText}，有效期至${new Date(card.expiresAt).toLocaleDateString()}。`
  };
}

async function handleReportLoss(input) {
  const cardNo = extractCardNo(input);
  
  if (!cardNo) {
    return {
      intent: INTENTS.REPORT_LOSS,
      status: 'need_info',
      response: '请提供您丢失的卡号，我帮您办理挂失。如不记得卡号，请携带购票凭证到服务台办理。'
    };
  }
  
  const card = await prisma.card.findUnique({
    where: { cardNo },
    include: { cardType: true }
  });
  
  if (!card) {
    return {
      intent: INTENTS.REPORT_LOSS,
      card_no: cardNo,
      status: 'error',
      response: `未找到卡号 ${cardNo}，请确认卡号是否正确。`
    };
  }
  
  if (card.status === 'LOST') {
    return {
      intent: INTENTS.REPORT_LOSS,
      card_no: cardNo,
      status: 'error',
      response: `该卡已挂失。如需补办新卡，请携带有效证件到服务台办理。`
    };
  }
  
  return {
    intent: INTENTS.REPORT_LOSS,
    card_no: cardNo,
    card_type: card.cardType.name,
    balance: Number(card.balance),
    status: 'need_confirm',
    response: `确认挂失卡号 ${cardNo} 吗？该卡余额${card.balance}元。挂失后可到服务台补办新卡，余额将转移到新卡。请回复"确认挂失"完成操作。`
  };
}

function handlePaymentFailure(input) {
  const paymentMethods = extractPaymentMethod(input);
  
  const suggestions = [
    '1. 请检查网络连接是否正常',
    '2. 确认支付账户余额充足',
    '3. 尝试更换支付方式',
    '4. 如多次失败，请联系客服或到服务台现金支付'
  ];
  
  const paymentText = paymentMethods.length > 0 
    ? `针对${paymentMethods.map(m => PAYMENT_KEYWORDS[m]?.[0] || m).join('、')}支付失败`
    : '';
  
  return {
    intent: INTENTS.PAYMENT_FAILURE,
    payment_method: paymentMethods,
    status: 'success',
    response: `${paymentText}，建议您：\n${suggestions.join('\n')}\n\n如问题仍未解决，可拨打客服热线或在服务台寻求帮助。`,
    suggestions
  };
}

async function handleBulkPurchase(input) {
  const quantity = extractQuantity(input);
  const cardTypeName = extractCardType(input);
  
  if (quantity > 100) {
    return {
      intent: INTENTS.BULK_PURCHASE,
      quantity,
      status: 'error',
      response: '抱歉，单次购买上限为100张。如需更多，请分批购买或联系客服进行团购。'
    };
  }
  
  if (quantity >= 10) {
    const cardTypes = await prisma.cardType.findMany({
      where: { isActive: true, stock: { gte: quantity } }
    });
    
    if (cardTypes.length === 0) {
      return {
        intent: INTENTS.BULK_PURCHASE,
        quantity,
        status: 'error',
        response: `抱歉，当前库存不足以满足${quantity}张的购买需求。请联系客服了解团购方案。`
      };
    }
    
    const discountInfo = quantity >= 50 ? '可享受团购优惠价，请联系客服' : 
                         quantity >= 20 ? '可享受95折优惠' : '';
    
    return {
      intent: INTENTS.BULK_PURCHASE,
      quantity,
      card_type: cardTypeName,
      status: 'success',
      discount_info: discountInfo,
      response: `购买${quantity}张讲解卡${discountInfo ? '，' + discountInfo : ''}。请选择卡种后继续购买，或联系客服400-XXX-XXXX获取团购专属服务。`
    };
  }
  
  return handleBuyCard(input);
}

function handleRefund(input) {
  const cardNo = extractCardNo(input);
  
  if (!cardNo) {
    return {
      intent: INTENTS.REFUND,
      status: 'need_info',
      response: '请提供您要退卡的卡号。退卡需满足：1. 卡内余额未使用完可退余额；2. 需携带原卡及购票凭证到服务台办理。'
    };
  }
  
  return {
    intent: INTENTS.REFUND,
    card_no: cardNo,
    status: 'success',
    response: `卡号 ${cardNo} 退卡申请已记录。请携带原卡及购票凭证到服务台办理退卡，余额将在3-5个工作日内退回。`
  };
}

function handleInvoice(input) {
  return {
    intent: INTENTS.INVOICE,
    status: 'success',
    response: '电子发票服务：\n1. 购卡成功后，可在"我的订单"中申请电子发票\n2. 发票将在1-3个工作日内发送至您的邮箱\n3. 如需纸质发票，请到服务台办理\n4. 发票问题请致电：400-XXX-XXXX'
  };
}

async function handleFaq() {
  const faqs = await prisma.faq.findMany({
    take: 5,
    orderBy: { sort: 'asc' }
  });
  
  if (faqs.length === 0) {
    return {
      intent: INTENTS.FAQ,
      status: 'success',
      response: '常见问题：\n1. 如何购卡？\n2. 如何续费？\n3. 卡丢了怎么办？\n4. 支付失败怎么办？\n5. 如何开发票？\n\n请告诉我您想了解的问题编号或直接描述您的问题。'
    };
  }
  
  const faqList = faqs.map((f, i) => `${i + 1}. ${f.question}`).join('\n');
  
  return {
    intent: INTENTS.FAQ,
    status: 'success',
    faqs: faqs.map(f => ({ question: f.question, answer: f.answer })),
    response: `常见问题：\n${faqList}\n\n请告诉我您想了解的问题编号或直接描述您的问题。`
  };
}

function handleUnknown(input) {
  const suggestions = [
    '购买讲解卡',
    '查询余额',
    '续费充值',
    '挂失补办',
    '开发票'
  ];
  
  return {
    intent: INTENTS.UNKNOWN,
    status: 'need_info',
    suggestions,
    response: `抱歉，我不太理解您的意思。您可以尝试以下操作：\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n或直接描述您的需求，我会尽力帮助您。`
  };
}

export async function processUserInput(input) {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return {
      intent: INTENTS.UNKNOWN,
      status: 'error',
      response: '请输入您的问题或需求，我会尽力帮助您。'
    };
  }
  
  const intent = detectIntent(trimmedInput);
  
  switch (intent) {
    case INTENTS.BUY_CARD:
      return handleBuyCard(trimmedInput);
    case INTENTS.RECHARGE:
      return handleRecharge(trimmedInput);
    case INTENTS.QUERY_BALANCE:
    case INTENTS.QUERY_STATUS:
      return handleQueryBalance(trimmedInput);
    case INTENTS.REPORT_LOSS:
      return handleReportLoss(trimmedInput);
    case INTENTS.PAYMENT_FAILURE:
      return handlePaymentFailure(trimmedInput);
    case INTENTS.BULK_PURCHASE:
      return handleBulkPurchase(trimmedInput);
    case INTENTS.REFUND:
      return handleRefund(trimmedInput);
    case INTENTS.INVOICE:
      return handleInvoice(trimmedInput);
    case INTENTS.FAQ:
      return handleFaq();
    default:
      return handleUnknown(trimmedInput);
  }
}

export { INTENTS };
