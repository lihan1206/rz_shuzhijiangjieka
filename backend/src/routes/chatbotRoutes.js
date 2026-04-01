import express from 'express';
import { processUserInput } from '../services/chatbotService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @route POST /api/chatbot/message
 * @desc 处理用户消息，返回智能对话响应
 * @access Public
 */
router.post('/message', asyncHandler(async (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: '请提供有效的消息内容'
    });
  }
  
  console.log('Received message:', message);
  const response = processUserInput(message);
  console.log('Response:', response);
  
  res.json({
    success: true,
    data: response
  });
}));

/**
 * @route GET /api/chatbot/card-types
 * @desc 获取所有可用的卡种信息
 * @access Public
 */
router.get('/card-types', asyncHandler(async (req, res) => {
  const { CARD_TYPES } = await import('../services/chatbotService.js');
  
  res.json({
    success: true,
    data: CARD_TYPES
  });
}));

/**
 * @route GET /api/chatbot/payment-methods
 * @desc 获取所有支持的支付方式
 * @access Public
 */
router.get('/payment-methods', asyncHandler(async (req, res) => {
  const { PAYMENT_METHODS } = await import('../services/chatbotService.js');
  
  res.json({
    success: true,
    data: Object.keys(PAYMENT_METHODS)
  });
}));

/**
 * @route POST /api/chatbot/bulk-calculate
 * @desc 计算批量购买优惠
 * @access Public
 */
router.post('/bulk-calculate', asyncHandler(async (req, res) => {
  const { cardType, quantity } = req.body;
  const { calculateBulkDiscount, CARD_TYPES } = await import('../services/chatbotService.js');
  
  if (!cardType || !CARD_TYPES[cardType]) {
    return res.status(400).json({
      success: false,
      error: '无效的卡类型'
    });
  }
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      error: '数量必须大于0'
    });
  }
  
  const card = CARD_TYPES[cardType];
  const discount = calculateBulkDiscount(quantity, card.price);
  
  res.json({
    success: true,
    data: {
      card_type: cardType,
      quantity: quantity,
      unit_price: card.price,
      ...discount
    }
  });
}));

export default router;
