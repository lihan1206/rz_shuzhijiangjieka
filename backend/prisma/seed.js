import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildCardNo(prefix, index) {
  return `${prefix}${dayjs().format('YYMMDD')}${String(index).padStart(6, '0')}`;
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('123456', 10);

  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      displayName: '系统管理员'
    },
    create: {
      username: 'admin',
      passwordHash,
      displayName: '系统管理员'
    }
  });
}

async function seedCardTypes() {
  const cardTypes = [
    {
      name: '单次讲解卡',
      description: '适合临时游客，单次有效。',
      price: '38.00',
      validDays: 1,
      usageLimit: 1,
      stock: 200,
      discountInfo: '新人首购立减 5 元'
    },
    {
      name: '7天无限次卡',
      description: '7 天内不限次数使用。',
      price: '158.00',
      validDays: 7,
      usageLimit: null,
      stock: 120,
      discountInfo: '2 张及以上每张减 10 元'
    },
    {
      name: '景区通票讲解卡',
      description: '覆盖园区全部讲解点位。',
      price: '228.00',
      validDays: 30,
      usageLimit: null,
      stock: 80,
      discountInfo: '节假日 95 折'
    }
  ];

  for (const item of cardTypes) {
    await prisma.cardType.upsert({
      where: { name: item.name },
      update: item,
      create: item
    });
  }
}

async function seedDevices() {
  const devices = [
    {
      deviceCode: 'KIOSK-A001',
      name: '景区东门自助机',
      location: '东门游客中心',
      status: 'ONLINE',
      firmwareVersion: '1.2.1',
      lastSyncAt: new Date()
    },
    {
      deviceCode: 'KIOSK-B002',
      name: '博物馆大厅自助机',
      location: '博物馆一层服务台',
      status: 'ONLINE',
      firmwareVersion: '1.2.1',
      lastSyncAt: new Date()
    }
  ];

  for (const item of devices) {
    await prisma.device.upsert({
      where: { deviceCode: item.deviceCode },
      update: item,
      create: item
    });
  }
}

async function seedFaq() {
  const faqs = [
    {
      question: '讲解卡丢失后怎么办？',
      answer: '请在管理后台将卡状态设为挂失，并联系现场工作人员补办。',
      sort: 1
    },
    {
      question: '充值后多久到账？',
      answer: '充值成功后实时到账，可在余额查询页面立即查看。',
      sort: 2
    },
    {
      question: '如何联系客服？',
      answer: '请拨打 400-800-8899，或扫码关注“智慧景区服务号”在线咨询。',
      sort: 3
    }
  ];

  for (const item of faqs) {
    await prisma.faq.upsert({
      where: { question: item.question },
      update: item,
      create: item
    });
  }
}

async function seedDemoCards() {
  const count = await prisma.card.count();
  if (count > 0) {
    return;
  }

  const cardTypes = await prisma.cardType.findMany({ take: 3, orderBy: { id: 'asc' } });
  const device = await prisma.device.findFirst({ orderBy: { id: 'asc' } });

  let index = 1;
  for (const cardType of cardTypes) {
    for (let i = 0; i < 3; i += 1) {
      const cardNo = buildCardNo('GD', index);
      const activatedAt = dayjs().subtract(i, 'day').toDate();
      const expiresAt = dayjs(activatedAt).add(cardType.validDays, 'day').toDate();
      const amount = Number(cardType.price);

      const card = await prisma.card.create({
        data: {
          cardNo,
          cardTypeId: cardType.id,
          balance: i === 0 ? '50.00' : '0.00',
          remainingUses: cardType.usageLimit,
          activatedAt,
          expiresAt,
          status: 'ACTIVE'
        }
      });

      await prisma.transaction.create({
        data: {
          orderNo: `ORD${dayjs().format('YYMMDDHHmmss')}${String(index).padStart(4, '0')}`,
          cardId: card.id,
          cardTypeId: cardType.id,
          type: 'PURCHASE',
          amount,
          quantity: 1,
          paymentMethod: i % 2 === 0 ? 'WECHAT' : 'ALIPAY',
          status: 'SUCCESS',
          deviceId: device?.id,
          remark: '系统初始化样例交易'
        }
      });

      index += 1;
    }
  }
}

async function main() {
  await seedAdmin();
  await seedCardTypes();
  await seedDevices();
  await seedFaq();
  await seedDemoCards();
}

main()
  .catch(async (error) => {
    process.stderr.write(`${error?.message || 'Seed 执行失败'}\n`);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
