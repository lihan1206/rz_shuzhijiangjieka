import { prisma } from '../config/prisma.js';

export async function recordOperation({ module, action, operator, detail }) {
  await prisma.operationLog.create({
    data: {
      module,
      action,
      operator,
      detail
    }
  });
}

export async function recordPaymentException({ orderNo, paymentMethod, errorMessage, context }) {
  await prisma.paymentExceptionLog.create({
    data: {
      orderNo,
      paymentMethod,
      errorMessage,
      context
    }
  });
}
