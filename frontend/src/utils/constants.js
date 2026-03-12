export const PAYMENT_METHOD_OPTIONS = [
  { label: '微信支付', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银联', value: 'UNIONPAY' },
  { label: 'NFC', value: 'NFC' },
  { label: '现金', value: 'CASH' }
];

export const CARD_STATUS_OPTIONS = [
  { label: '激活', value: 'ACTIVE', color: 'green' },
  { label: '冻结', value: 'FROZEN', color: 'orange' },
  { label: '挂失', value: 'LOST', color: 'red' },
  { label: '过期', value: 'EXPIRED', color: 'default' }
];

export const CARD_STATUS_TEXT = {
  ACTIVE: '激活',
  FROZEN: '冻结',
  LOST: '挂失',
  EXPIRED: '过期'
};

export const DEVICE_STATUS_OPTIONS = [
  { label: '在线', value: 'ONLINE', color: 'green' },
  { label: '离线', value: 'OFFLINE', color: 'red' },
  { label: '维护中', value: 'MAINTENANCE', color: 'orange' }
];

export const TRANSACTION_TYPE_OPTIONS = [
  { label: '购卡', value: 'PURCHASE' },
  { label: '充值', value: 'RECHARGE' },
  { label: '退款', value: 'REFUND' }
];

export const PAYMENT_METHOD_TEXT = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
  UNIONPAY: '银联',
  NFC: 'NFC',
  CASH: '现金'
};

export const TRANSACTION_TYPE_TEXT = {
  PURCHASE: '购卡',
  RECHARGE: '充值',
  REFUND: '退款'
};
