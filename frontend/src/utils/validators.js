import { z } from 'zod';

const PAYMENT_METHODS = ['WECHAT', 'ALIPAY', 'UNIONPAY', 'NFC', 'CASH'] as const;

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码')
});

export const purchaseSchema = z.object({
  quantity: z.coerce.number().int().min(1, '数量至少为 1').max(20, '单次最多 20 张'),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: '请选择有效的支付方式' }),
  deviceCode: z.string().min(3, '设备编号至少 3 位').max(50, '设备编号过长').optional().or(z.literal(''))
});

export const rechargeSchema = z.object({
  cardNo: z.string().min(6, '请输入正确卡号'),
  amount: z.coerce.number().positive('充值金额必须大于 0').max(5000, '单次充值金额过大'),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: '请选择有效的支付方式' }),
  deviceCode: z.string().min(3, '设备编号至少 3 位').max(50, '设备编号过长').optional().or(z.literal(''))
});

export const cardQuerySchema = z.object({
  cardNo: z.string().min(6, '请输入正确卡号')
});

export const cardTypeSchema = z.object({
  name: z.string().min(2, '卡种名称至少 2 个字').max(50, '卡种名称过长'),
  description: z.string().max(500, '描述不能超过 500 字').optional(),
  price: z.coerce.number().positive('价格必须大于 0'),
  validDays: z.coerce.number().int().min(1, '有效期至少 1 天').max(3650, '有效期不能超过 10 年'),
  usageLimit: z.union([z.coerce.number().int().positive('次数限制必须大于 0'), z.null()]).optional(),
  stock: z.coerce.number().int().min(0, '库存不能为负数'),
  discountInfo: z.string().max(100, '优惠信息不能超过 100 字').optional(),
  isActive: z.boolean().optional()
});

export const deviceSchema = z.object({
  deviceCode: z.string().min(3, '设备编号至少 3 位').max(50, '设备编号过长'),
  name: z.string().min(2, '设备名称至少 2 个字').max(60, '设备名称过长'),
  location: z.string().min(2, '设备位置至少 2 个字').max(120, '设备位置过长'),
  status: z.string().optional(),
  firmwareVersion: z.string().optional()
});
