import client from './client';

export const authApi = {
  login: (payload) => client.post('/auth/login', payload)
};

export const kioskApi = {
  fetchCardTypes: () => client.get('/kiosk/card-types'),
  purchaseCard: (payload) => client.post('/kiosk/purchase', payload),
  rechargeCard: (payload) => client.post('/kiosk/recharge', payload),
  queryBalance: (cardNo) => client.get(`/kiosk/cards/${cardNo}/balance`),
  fetchTransactions: (cardNo, limit = 5) => client.get(`/kiosk/cards/${cardNo}/transactions?limit=${limit}`),
  fetchFaq: () => client.get('/kiosk/faq'),
  fetchSupport: () => client.get('/kiosk/support')
};

export const adminApi = {
  me: () => client.get('/admin/me'),
  fetchCardTypes: () => client.get('/admin/card-types'),
  createCardType: (payload) => client.post('/admin/card-types', payload),
  updateCardType: (id, payload) => client.put(`/admin/card-types/${id}`, payload),
  deleteCardType: (id) => client.delete(`/admin/card-types/${id}`),
  fetchTransactions: (params) => client.get('/admin/transactions', { params }),
  fetchCards: (params) => client.get('/admin/cards', { params }),
  updateCardStatus: (id, payload) => client.patch(`/admin/cards/${id}/status`, payload),
  fetchDevices: () => client.get('/admin/devices'),
  createDevice: (payload) => client.post('/admin/devices', payload),
  updateDevice: (id, payload) => client.put(`/admin/devices/${id}`, payload),
  deleteDevice: (id) => client.delete(`/admin/devices/${id}`),
  deviceAction: (id, payload) => client.post(`/admin/devices/${id}/action`, payload),
  fetchOverviewStats: (params) => client.get('/admin/stats/overview', { params }),
  fetchPaymentStats: (params) => client.get('/admin/stats/payment-ratio', { params }),
  fetchUserBehaviorStats: (params) => client.get('/admin/stats/user-behavior', { params }),
  fetchLogs: (params) => client.get('/admin/logs', { params })
};

// 智能客服对话API
export const sendChatMessage = (message) => client.post('/chatbot/message', { message });
export const fetchChatbotCardTypes = () => client.get('/chatbot/card-types');
export const fetchChatbotPaymentMethods = () => client.get('/chatbot/payment-methods');
export const calculateBulkDiscount = (cardType, quantity) => 
  client.post('/chatbot/bulk-calculate', { cardType, quantity });
