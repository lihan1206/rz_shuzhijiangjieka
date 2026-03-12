import dayjs from 'dayjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { createCardNo, createOrderNo } from '../utils/generator.js';
import { formatCard, formatCardType, formatTransaction, toNumber } from '../utils/format.js';
import { recordPaymentException } from '../services/logService.js';

const router = Router();

const paymentMethods = ['WECHAT', 'ALIPAY', 'UNIONPAY', 'NFC', 'CASH'];

const purchaseSchema = z.object({
  cardTypeId: z.coerce.number().int().positive('卡种编号不合法'),
  quantity: z.coerce.number().int().min(1, '数量至少为 1').max(20, '单次最多购买 20 张'),
  paymentMethod: z.enum(paymentMethods, { message: '支付方式不支持' }),
  deviceCode: z.string().optional()
});

const rechargeSchema = z.object({
  cardNo: z.string().min(6, '请输入正确的卡号'),
  amount: z.coerce.number().positive('充值金额必须大于 0').max(5000, '单次充值金额过大'),
  paymentMethod: z.enum(paymentMethods, { message: '支付方式不支持' }),
  deviceCode: z.string().optional()
});

const queryCardSchema = z.object({
  cardNo: z.string().min(6, '请输入正确的卡号')
});

router.get(
  '/card-types',
  asyncHandler(async (_req, res) => {
    const cardTypes = await prisma.cardType.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({
      success: true,
      message: '获取成功',
      data: cardTypes.map(formatCardType)
    });
  })
);

router.post(
  '/purchase',
  validate(purchaseSchema),
  asyncHandler(async (req, res) => {
    const { cardTypeId, quantity, paymentMethod, deviceCode } = req.body;
    let orderNo = null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const cardType = await tx.cardType.findUnique({ where: { id: cardTypeId } });
        if (!cardType || !cardType.isActive) {
          throw new AppError('卡种不存在或已下架', 404, 'CARD_TYPE_NOT_FOUND');
        }

        if (cardType.stock < quantity) {
          throw new AppError('库存不足，请减少数量后重试', 400, 'INSUFFICIENT_STOCK');
        }

        const stockUpdated = await tx.cardType.updateMany({
          where: {
            id: cardType.id,
            stock: { gte: quantity }
          },
          data: {
            stock: {
              decrement: quantity
            }
          }
        });

        if (stockUpdated.count === 0) {
          throw new AppError('库存变更失败，请重试', 409, 'STOCK_CONFLICT');
        }

        const device = deviceCode
          ? await tx.device.findUnique({ where: { deviceCode } })
          : await tx.device.findFirst({ orderBy: { id: 'asc' } });

        const cards = [];

        for (let i = 0; i < quantity; i += 1) {
          const cardNo = createCardNo();
          const expiresAt = dayjs().add(cardType.validDays, 'day').toDate();
          orderNo = createOrderNo();

          const card = await tx.card.create({
            data: {
              cardNo,
              cardTypeId: cardType.id,
              remainingUses: cardType.usageLimit,
              expiresAt,
              activatedAt: new Date(),
              status: 'ACTIVE'
            }
          });

          await tx.transaction.create({
            data: {
              orderNo,
              cardId: card.id,
              cardTypeId: cardType.id,
              type: 'PURCHASE',
              amount: cardType.price,
              quantity: 1,
              paymentMethod,
              status: 'SUCCESS',
              deviceId: device?.id,
              remark: '自助机购卡'
            }
          });

          cards.push(formatCard(card));
        }

        return {
          cardType: formatCardType(cardType),
          cards,
          totalAmount: Number(cardType.price) * quantity
        };
      });

      res.json({
        success: true,
        message: '购卡成功，卡片已激活',
        data: result
      });
    } catch (error) {
      await recordPaymentException({
        orderNo,
        paymentMethod,
        errorMessage: error.message,
        context: {
          cardTypeId,
          quantity,
          deviceCode
        }
      });
      throw error;
    }
  })
);

router.post(
  '/recharge',
  validate(rechargeSchema),
  asyncHandler(async (req, res) => {
    const { cardNo, amount, paymentMethod, deviceCode } = req.body;
    let orderNo = null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const card = await tx.card.findUnique({
          where: { cardNo },
          include: { cardType: true }
        });

        if (!card) {
          throw new AppError('卡号不存在，请确认后重试', 404, 'CARD_NOT_FOUND');
        }

        if (card.status !== 'ACTIVE') {
          throw new AppError('当前卡不可充值，请检查卡状态', 400, 'CARD_STATUS_INVALID');
        }

        if (dayjs(card.expiresAt).isBefore(dayjs())) {
          throw new AppError('当前卡已过期，无法充值', 400, 'CARD_EXPIRED');
        }

        const updatedCard = await tx.card.update({
          where: { id: card.id },
          data: {
            balance: {
              increment: amount
            }
          }
        });

        const device = deviceCode
          ? await tx.device.findUnique({ where: { deviceCode } })
          : await tx.device.findFirst({ orderBy: { id: 'asc' } });

        orderNo = createOrderNo();

        const transaction = await tx.transaction.create({
          data: {
            orderNo,
            cardId: card.id,
            cardTypeId: card.cardTypeId,
            type: 'RECHARGE',
            amount,
            quantity: 1,
            paymentMethod,
            status: 'SUCCESS',
            deviceId: device?.id,
            remark: '自助机充值'
          }
        });

        return {
          card: formatCard(updatedCard),
          transaction: formatTransaction(transaction)
        };
      });

      res.json({
        success: true,
        message: '充值成功',
        data: result
      });
    } catch (error) {
      await recordPaymentException({
        orderNo,
        paymentMethod,
        errorMessage: error.message,
        context: {
          cardNo,
          amount,
          deviceCode
        }
      });
      throw error;
    }
  })
);

router.get(
  '/cards/:cardNo/balance',
  validate(queryCardSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { cardNo } = req.params;

    const card = await prisma.card.findUnique({
      where: { cardNo },
      include: {
        cardType: true
      }
    });

    if (!card) {
      throw new AppError('卡号不存在', 404, 'CARD_NOT_FOUND');
    }

    const now = dayjs();
    const remainingDays = Math.max(dayjs(card.expiresAt).diff(now, 'day'), 0);

    res.json({
      success: true,
      message: '查询成功',
      data: {
        ...formatCard(card),
        cardType: formatCardType(card.cardType),
        remainingDays,
        isExpired: dayjs(card.expiresAt).isBefore(now)
      }
    });
  })
);

router.get(
  '/cards/:cardNo/transactions',
  validate(queryCardSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { cardNo } = req.params;
    const limit = Number(req.query.limit || 5);

    const card = await prisma.card.findUnique({ where: { cardNo } });
    if (!card) {
      throw new AppError('卡号不存在', 404, 'CARD_NOT_FOUND');
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        cardId: card.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit > 20 ? 20 : limit
    });

    res.json({
      success: true,
      message: '查询成功',
      data: transactions.map(formatTransaction)
    });
  })
);

router.get(
  '/faq',
  asyncHandler(async (_req, res) => {
    const list = await prisma.faq.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    });

    res.json({
      success: true,
      message: '获取成功',
      data: list
    });
  })
);

router.get('/support', (_req, res) => {
  res.json({
    success: true,
    message: '获取成功',
    data: {
      phone: '400-800-8899',
      qrcodeText: '微信搜索：智慧景区服务号'
    }
  });
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    data: {
      time: new Date().toISOString()
    }
  });
});

export default router;
