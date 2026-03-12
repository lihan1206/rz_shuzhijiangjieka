import dayjs from 'dayjs';
import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';
import { formatCard, formatCardType, formatTransaction, toNumber } from '../utils/format.js';
import { recordOperation } from '../services/logService.js';

const router = Router();
router.use(authRequired);

const paymentMethods = ['WECHAT', 'ALIPAY', 'UNIONPAY', 'NFC', 'CASH'];
const cardStatuses = ['ACTIVE', 'FROZEN', 'LOST', 'EXPIRED'];
const deviceStatuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE'];
const deviceActions = ['RESTART', 'SYNC', 'UPGRADE'];

const cardTypeCreateSchema = z.object({
  name: z.string().min(2, '卡种名称至少 2 个字符').max(50, '卡种名称不能超过 50 个字符'),
  description: z.string().max(500, '描述过长').optional().or(z.literal('')),
  price: z.coerce.number().positive('价格必须大于 0'),
  validDays: z.coerce.number().int().min(1, '有效期至少 1 天').max(3650, '有效期不能超过 10 年'),
  usageLimit: z
    .union([z.coerce.number().int().positive('次数限制必须大于 0'), z.null()])
    .optional(),
  stock: z.coerce.number().int().min(0, '库存不能为负数'),
  discountInfo: z.string().max(100, '优惠信息不能超过 100 字').optional().or(z.literal('')),
  isActive: z.boolean().optional()
});

const cardStatusUpdateSchema = z.object({
  status: z.enum(cardStatuses, { message: '卡状态不合法' }),
  lossReason: z.string().max(120, '挂失原因过长').optional()
});

const deviceSchema = z.object({
  deviceCode: z.string().min(3, '设备编号至少 3 个字符').max(50, '设备编号过长'),
  name: z.string().min(2, '设备名称至少 2 个字符').max(60, '设备名称过长'),
  location: z.string().min(2, '设备位置至少 2 个字符').max(120, '设备位置过长'),
  status: z.enum(deviceStatuses, { message: '设备状态不合法' }).optional(),
  firmwareVersion: z.string().min(1, '固件版本不能为空').max(50, '固件版本过长').optional()
});

const deviceActionSchema = z.object({
  action: z.enum(deviceActions, { message: '设备动作不支持' }),
  targetVersion: z.string().max(50, '目标版本过长').optional(),
  detail: z.string().max(300, '动作备注过长').optional()
});

function buildDateRange(startDate, endDate) {
  const range = {};

  if (startDate) {
    range.gte = dayjs(startDate).startOf('day').toDate();
  }

  if (endDate) {
    range.lte = dayjs(endDate).endOf('day').toDate();
  }

  return Object.keys(range).length ? range : undefined;
}

function normalizePagination(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safePageSize = Number.isNaN(pageSize) || pageSize < 1 ? 10 : Math.min(pageSize, 100);

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize
  };
}

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: '获取成功',
      data: req.user
    });
  })
);

router.get(
  '/card-types',
  asyncHandler(async (_req, res) => {
    const list = await prisma.cardType.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }]
    });

    res.json({
      success: true,
      message: '获取成功',
      data: list.map(formatCardType)
    });
  })
);

router.post(
  '/card-types',
  validate(cardTypeCreateSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const cardType = await prisma.cardType.create({
      data: {
        ...payload,
        usageLimit: payload.usageLimit ?? null,
        description: payload.description || null,
        discountInfo: payload.discountInfo || null,
        isActive: payload.isActive ?? true
      }
    });

    await recordOperation({
      module: '卡种管理',
      action: '新增卡种',
      operator: req.user.username,
      detail: `卡种名称: ${cardType.name}`
    });

    res.status(201).json({
      success: true,
      message: '新增卡种成功',
      data: formatCardType(cardType)
    });
  })
);

router.put(
  '/card-types/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  validate(cardTypeCreateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;

    const cardType = await prisma.cardType.update({
      where: { id },
      data: {
        ...payload,
        usageLimit: payload.usageLimit ?? null,
        description: payload.description || null,
        discountInfo: payload.discountInfo || null,
        isActive: payload.isActive ?? true
      }
    });

    await recordOperation({
      module: '卡种管理',
      action: '编辑卡种',
      operator: req.user.username,
      detail: `卡种名称: ${cardType.name}`
    });

    res.json({
      success: true,
      message: '更新卡种成功',
      data: formatCardType(cardType)
    });
  })
);

router.delete(
  '/card-types/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const cardType = await prisma.cardType.findUnique({ where: { id } });
    if (!cardType) {
      throw new AppError('卡种不存在', 404, 'CARD_TYPE_NOT_FOUND');
    }

    const usedCount = await prisma.card.count({ where: { cardTypeId: id } });

    if (usedCount > 0) {
      const disabled = await prisma.cardType.update({
        where: { id },
        data: { isActive: false }
      });

      await recordOperation({
        module: '卡种管理',
        action: '下架卡种',
        operator: req.user.username,
        detail: `卡种名称: ${cardType.name}`
      });

      res.json({
        success: true,
        message: '卡种已存在历史数据，已自动下架',
        data: formatCardType(disabled)
      });
      return;
    }

    await prisma.cardType.delete({ where: { id } });

    await recordOperation({
      module: '卡种管理',
      action: '删除卡种',
      operator: req.user.username,
      detail: `卡种名称: ${cardType.name}`
    });

    res.json({
      success: true,
      message: '删除卡种成功'
    });
  })
);

router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const dateRange = buildDateRange(req.query.startDate, req.query.endDate);

    const where = {
      createdAt: dateRange,
      cardTypeId: req.query.cardTypeId ? Number(req.query.cardTypeId) : undefined,
      paymentMethod: req.query.paymentMethod || undefined,
      type: req.query.type || undefined
    };

    const [total, list] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          card: {
            select: {
              cardNo: true
            }
          },
          cardType: {
            select: {
              name: true
            }
          },
          device: {
            select: {
              deviceCode: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      })
    ]);

    res.json({
      success: true,
      message: '获取成功',
      data: {
        list: list.map(formatTransaction),
        page,
        pageSize,
        total
      }
    });
  })
);

router.get(
  '/cards',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = normalizePagination(req.query);

    const where = {
      cardNo: req.query.cardNo
        ? {
            contains: String(req.query.cardNo)
          }
        : undefined,
      status: req.query.status || undefined,
      cardTypeId: req.query.cardTypeId ? Number(req.query.cardTypeId) : undefined
    };

    const [total, list] = await Promise.all([
      prisma.card.count({ where }),
      prisma.card.findMany({
        where,
        include: {
          cardType: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      })
    ]);

    res.json({
      success: true,
      message: '获取成功',
      data: {
        list: list.map(formatCard),
        page,
        pageSize,
        total
      }
    });
  })
);

router.patch(
  '/cards/:id/status',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  validate(cardStatusUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status, lossReason } = req.body;

    const card = await prisma.card.update({
      where: { id },
      data: {
        status,
        lossReason: status === 'LOST' ? lossReason || '用户挂失' : null
      }
    });

    await recordOperation({
      module: '用户卡管理',
      action: '更新卡状态',
      operator: req.user.username,
      detail: `卡号: ${card.cardNo}，状态: ${status}`
    });

    res.json({
      success: true,
      message: '卡状态更新成功',
      data: formatCard(card)
    });
  })
);

router.get(
  '/devices',
  asyncHandler(async (_req, res) => {
    const list = await prisma.device.findMany({
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      message: '获取成功',
      data: list
    });
  })
);

router.post(
  '/devices',
  validate(deviceSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const created = await prisma.device.create({
      data: {
        ...payload,
        status: payload.status || 'ONLINE',
        firmwareVersion: payload.firmwareVersion || '1.0.0',
        lastSyncAt: new Date()
      }
    });

    await recordOperation({
      module: '设备管理',
      action: '新增设备',
      operator: req.user.username,
      detail: `设备编号: ${created.deviceCode}`
    });

    res.status(201).json({
      success: true,
      message: '设备新增成功',
      data: created
    });
  })
);

router.put(
  '/devices/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  validate(deviceSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;

    const updated = await prisma.device.update({
      where: { id },
      data: {
        ...payload,
        status: payload.status || 'ONLINE',
        firmwareVersion: payload.firmwareVersion || '1.0.0'
      }
    });

    await recordOperation({
      module: '设备管理',
      action: '编辑设备',
      operator: req.user.username,
      detail: `设备编号: ${updated.deviceCode}`
    });

    res.json({
      success: true,
      message: '设备更新成功',
      data: updated
    });
  })
);

router.delete(
  '/devices/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new AppError('设备不存在', 404, 'DEVICE_NOT_FOUND');
    }

    const txCount = await prisma.transaction.count({ where: { deviceId: id } });
    if (txCount > 0) {
      throw new AppError('该设备存在交易数据，不可删除', 400, 'DEVICE_HAS_TRANSACTIONS');
    }

    await prisma.device.delete({ where: { id } });

    await recordOperation({
      module: '设备管理',
      action: '删除设备',
      operator: req.user.username,
      detail: `设备编号: ${device.deviceCode}`
    });

    res.json({
      success: true,
      message: '设备删除成功'
    });
  })
);

router.post(
  '/devices/:id/action',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  validate(deviceActionSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { action, targetVersion, detail } = req.body;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new AppError('设备不存在', 404, 'DEVICE_NOT_FOUND');
    }

    let updateData = {};
    let actionDetail = detail || '';

    if (action === 'SYNC') {
      updateData = { lastSyncAt: new Date(), status: 'ONLINE' };
      actionDetail = actionDetail || '执行远程数据同步';
    }

    if (action === 'RESTART') {
      updateData = { status: 'ONLINE' };
      actionDetail = actionDetail || '执行远程重启';
    }

    if (action === 'UPGRADE') {
      if (!targetVersion) {
        throw new AppError('升级动作必须提供目标版本', 400, 'TARGET_VERSION_REQUIRED');
      }
      updateData = {
        firmwareVersion: targetVersion,
        status: 'ONLINE',
        lastSyncAt: new Date()
      };
      actionDetail = actionDetail || `升级至 ${targetVersion}`;
    }

    const [updated] = await prisma.$transaction([
      prisma.device.update({
        where: { id },
        data: updateData
      }),
      prisma.deviceLog.create({
        data: {
          deviceId: id,
          action,
          operator: req.user.username,
          detail: actionDetail
        }
      })
    ]);

    await recordOperation({
      module: '设备管理',
      action: `设备动作:${action}`,
      operator: req.user.username,
      detail: `设备编号: ${device.deviceCode}`
    });

    res.json({
      success: true,
      message: '设备动作执行成功',
      data: updated
    });
  })
);

router.get(
  '/stats/overview',
  asyncHandler(async (req, res) => {
    const dateRange = buildDateRange(req.query.startDate, req.query.endDate);

    const commonWhere = {
      createdAt: dateRange,
      status: 'SUCCESS'
    };

    const [purchaseSummary, rechargeSummary, soldCards, activeCards, transactionCount, cardTypeSales] =
      await Promise.all([
        prisma.transaction.aggregate({
          where: {
            ...commonWhere,
            type: 'PURCHASE'
          },
          _sum: {
            amount: true,
            quantity: true
          },
          _count: {
            id: true
          }
        }),
        prisma.transaction.aggregate({
          where: {
            ...commonWhere,
            type: 'RECHARGE'
          },
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        }),
        prisma.card.count({}),
        prisma.card.count({ where: { status: 'ACTIVE' } }),
        prisma.transaction.count({ where: commonWhere }),
        prisma.transaction.groupBy({
          by: ['cardTypeId'],
          where: {
            ...commonWhere,
            type: 'PURCHASE',
            cardTypeId: {
              not: null
            }
          },
          _sum: {
            quantity: true
          }
        })
      ]);

    const cardTypeIds = cardTypeSales
      .map((item) => item.cardTypeId)
      .filter((id) => id !== null);

    const cardTypes = await prisma.cardType.findMany({
      where: {
        id: {
          in: cardTypeIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    const cardTypeNameMap = new Map(cardTypes.map((item) => [item.id, item.name]));

    const topCardTypes = cardTypeSales
      .map((item) => ({
        cardTypeId: item.cardTypeId,
        cardTypeName: cardTypeNameMap.get(item.cardTypeId) || '未知卡种',
        quantity: item._sum.quantity || 0
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      success: true,
      message: '获取成功',
      data: {
        totalSalesAmount: toNumber(purchaseSummary._sum.amount) || 0,
        totalRechargeAmount: toNumber(rechargeSummary._sum.amount) || 0,
        soldCards,
        activeCards,
        transactionCount,
        purchaseOrderCount: purchaseSummary._count.id || 0,
        rechargeOrderCount: rechargeSummary._count.id || 0,
        topCardTypes
      }
    });
  })
);

router.get(
  '/stats/payment-ratio',
  asyncHandler(async (req, res) => {
    const dateRange = buildDateRange(req.query.startDate, req.query.endDate);

    const rows = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: dateRange,
        status: 'SUCCESS'
      },
      _sum: {
        amount: true
      },
      _count: {
        paymentMethod: true
      }
    });

    const total = rows.reduce((sum, item) => sum + (item._count.paymentMethod || 0), 0);

    res.json({
      success: true,
      message: '获取成功',
      data: rows.map((item) => ({
        paymentMethod: item.paymentMethod,
        amount: toNumber(item._sum.amount) || 0,
        count: item._count.paymentMethod || 0,
        ratio: total ? Number((((item._count.paymentMethod || 0) / total) * 100).toFixed(2)) : 0
      }))
    });
  })
);

router.get(
  '/stats/user-behavior',
  asyncHandler(async (req, res) => {
    const dateRange = buildDateRange(req.query.startDate, req.query.endDate);

    const purchases = await prisma.transaction.findMany({
      where: {
        createdAt: dateRange,
        status: 'SUCCESS',
        type: 'PURCHASE'
      },
      select: {
        createdAt: true,
        quantity: true
      }
    });

    const hourMap = new Map();
    const weekdayMap = new Map([
      ['周一', 0],
      ['周二', 0],
      ['周三', 0],
      ['周四', 0],
      ['周五', 0],
      ['周六', 0],
      ['周日', 0]
    ]);

    purchases.forEach((item) => {
      const date = dayjs(item.createdAt);
      const hourKey = `${String(date.hour()).padStart(2, '0')}:00`;
      const quantity = item.quantity || 1;

      hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + quantity);

      const weekdayIndex = date.day();
      const weekdayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][weekdayIndex];
      weekdayMap.set(weekdayName, (weekdayMap.get(weekdayName) || 0) + quantity);
    });

    const hourly = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const weekly = Array.from(weekdayMap.entries()).map(([weekday, count]) => ({
      weekday,
      count
    }));

    const peakHour = hourly.sort((a, b) => b.count - a.count)[0] || { hour: '暂无', count: 0 };

    res.json({
      success: true,
      message: '获取成功',
      data: {
        totalPurchaseCount: purchases.reduce((sum, item) => sum + (item.quantity || 0), 0),
        peakHour,
        hourly,
        weekly
      }
    });
  })
);

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const type = String(req.query.type || 'operation');
    const limit = Math.min(Number(req.query.limit || 50), 200);

    if (type === 'operation') {
      const data = await prisma.operationLog.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      res.json({ success: true, message: '获取成功', data });
      return;
    }

    if (type === 'payment') {
      const data = await prisma.paymentExceptionLog.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      res.json({ success: true, message: '获取成功', data });
      return;
    }

    if (type === 'device') {
      const data = await prisma.deviceLog.findMany({
        include: {
          device: {
            select: {
              deviceCode: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      res.json({ success: true, message: '获取成功', data });
      return;
    }

    throw new AppError('日志类型不支持', 400, 'INVALID_LOG_TYPE');
  })
);

export default router;
