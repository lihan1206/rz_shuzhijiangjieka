import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { kioskApi } from '../api/services';
import {
  CARD_STATUS_TEXT,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_TEXT,
  TRANSACTION_TYPE_TEXT
} from '../utils/constants';
import { cardQuerySchema, purchaseSchema, rechargeSchema } from '../utils/validators';

export default function KioskPage() {
  const [cardTypes, setCardTypes] = useState([]);
  const [faqList, setFaqList] = useState([]);
  const [support, setSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseCardType, setPurchaseCardType] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [rechargeLoading, setRechargeLoading] = useState(false);

  const [purchaseForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const [queryForm] = Form.useForm();

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [cardTypeRes, faqRes, supportRes] = await Promise.all([
        kioskApi.fetchCardTypes(),
        kioskApi.fetchFaq(),
        kioskApi.fetchSupport()
      ]);

      setCardTypes(cardTypeRes.data || []);
      setFaqList(faqRes.data || []);
      setSupport(supportRes.data || null);
    } catch (error) {
      Modal.error({
        title: '加载失败',
        content: error.message || '基础数据加载失败，请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const openPurchaseModal = (cardType) => {
    setPurchaseCardType(cardType);
    purchaseForm.setFieldsValue({
      quantity: 1,
      paymentMethod: 'WECHAT',
      deviceCode: ''
    });
    setPurchaseOpen(true);
  };

  const handlePurchase = async () => {
    try {
      const values = await purchaseForm.validateFields();
      const parsed = purchaseSchema.parse(values);

      setPurchaseLoading(true);
      const result = await kioskApi.purchaseCard({
        cardTypeId: purchaseCardType.id,
        quantity: parsed.quantity,
        paymentMethod: parsed.paymentMethod,
        deviceCode: values.deviceCode || undefined
      });

      Modal.success({
        title: '购卡成功',
        content: `已成功购买 ${result.data.cards.length} 张，合计 ¥${result.data.totalAmount.toFixed(2)}`
      });

      setPurchaseOpen(false);
      purchaseForm.resetFields();
      fetchBaseData();
    } catch (error) {
      if (error?.issues) {
        Modal.warning({
          title: '提交失败',
          content: error.issues[0]?.message || '输入不合法'
        });
      } else {
        Modal.error({
          title: '购卡失败',
          content: error.message || '请稍后重试'
        });
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRecharge = async () => {
    try {
      const values = await rechargeForm.validateFields();
      const parsed = rechargeSchema.parse(values);

      setRechargeLoading(true);
      await kioskApi.rechargeCard({
        cardNo: parsed.cardNo,
        amount: parsed.amount,
        paymentMethod: parsed.paymentMethod,
        deviceCode: values.deviceCode || undefined
      });

      Modal.success({
        title: '充值成功',
        content: `卡号 ${parsed.cardNo} 已充值 ¥${Number(parsed.amount).toFixed(2)}`
      });

      rechargeForm.resetFields();
    } catch (error) {
      if (error?.issues) {
        Modal.warning({
          title: '提交失败',
          content: error.issues[0]?.message || '输入不合法'
        });
      } else {
        Modal.error({
          title: '充值失败',
          content: error.message || '请稍后重试'
        });
      }
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleQueryCard = async () => {
    try {
      const values = await queryForm.validateFields();
      const parsed = cardQuerySchema.parse(values);

      setBalanceLoading(true);
      setTxLoading(true);
      const [balanceRes, txRes] = await Promise.all([
        kioskApi.queryBalance(parsed.cardNo),
        kioskApi.fetchTransactions(parsed.cardNo, 5)
      ]);

      setBalanceResult(balanceRes.data);
      setTransactions(txRes.data || []);
    } catch (error) {
      if (error?.issues) {
        Modal.warning({
          title: '查询失败',
          content: error.issues[0]?.message || '输入不合法'
        });
      } else {
        Modal.error({
          title: '查询失败',
          content: error.message || '请稍后重试'
        });
      }
      setBalanceResult(null);
      setTransactions([]);
    } finally {
      setBalanceLoading(false);
      setTxLoading(false);
    }
  };

  return (
    <div className="page-content">
      <Card className="panel-card">
        <Typography.Title level={2} style={{ margin: 0 }}>
          自助购卡服务
        </Typography.Title>
        <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
          支持购卡、充值、余额与交易查询，全程自助办理。
        </Typography.Paragraph>
      </Card>

      <Alert
        banner
        showIcon
        message="温馨提示：支付成功后卡片会自动激活，可在本页即时查询余额与最近交易。"
      />

      <Card title="可售卡种" className="panel-card">
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : cardTypes.length ? (
          <Row gutter={[16, 16]}>
            {cardTypes.map((item) => (
              <Col xs={24} sm={12} lg={8} key={item.id}>
                <Card className="kiosk-card-type" bordered={false}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {item.name}
                    </Typography.Title>
                    <Typography.Text type="secondary">{item.description || '暂无描述'}</Typography.Text>
                    <Statistic prefix="¥" value={item.price} precision={2} />
                    <Space wrap>
                      <Tag color="blue">有效期 {item.validDays} 天</Tag>
                      <Tag color="purple">库存 {item.stock}</Tag>
                      <Tag color="gold">{item.discountInfo || '暂无优惠'}</Tag>
                    </Space>
                    <Button type="primary" block onClick={() => openPurchaseModal(item)}>
                      立即购买
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无可售卡种" />
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="卡片充值" className="panel-card">
            <Form layout="vertical" form={rechargeForm} initialValues={{ paymentMethod: 'WECHAT' }}>
              <Form.Item label="卡号" name="cardNo" rules={[{ required: true, message: '请输入卡号' }]}>
                <Input placeholder="请输入卡号" />
              </Form.Item>
              <Form.Item label="充值金额" name="amount" rules={[{ required: true, message: '请输入充值金额' }]}>
                <InputNumber min={1} max={5000} precision={2} style={{ width: '100%' }} placeholder="请输入金额" />
              </Form.Item>
              <Form.Item
                label="支付方式"
                name="paymentMethod"
                rules={[{ required: true, message: '请选择支付方式' }]}
              >
                <Select options={PAYMENT_METHOD_OPTIONS} />
              </Form.Item>
              <Form.Item label="设备编号（可选）" name="deviceCode">
                <Input placeholder="如 KIOSK-A001" />
              </Form.Item>
              <Button type="primary" loading={rechargeLoading} onClick={handleRecharge}>
                确认充值
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="余额与交易查询" className="panel-card">
            <Form layout="vertical" form={queryForm}>
              <Form.Item label="卡号" name="cardNo" rules={[{ required: true, message: '请输入卡号' }]}>
                <Input placeholder="请输入卡号" />
              </Form.Item>
              <Button type="primary" onClick={handleQueryCard} loading={balanceLoading || txLoading}>
                查询
              </Button>
            </Form>

            {balanceResult ? (
              <div style={{ marginTop: 16 }}>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="卡号">{balanceResult.cardNo}</Descriptions.Item>
                  <Descriptions.Item label="卡种">{balanceResult.cardType?.name}</Descriptions.Item>
                  <Descriptions.Item label="余额">¥{Number(balanceResult.balance).toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="状态">{CARD_STATUS_TEXT[balanceResult.status] || balanceResult.status}</Descriptions.Item>
                  <Descriptions.Item label="剩余天数">{balanceResult.remainingDays} 天</Descriptions.Item>
                </Descriptions>
                <Table
                  style={{ marginTop: 12 }}
                  size="small"
                  loading={txLoading}
                  rowKey="id"
                  pagination={false}
                  dataSource={transactions}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'createdAt',
                      render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
                    },
                    {
                      title: '类型',
                      dataIndex: 'type',
                      render: (value) => TRANSACTION_TYPE_TEXT[value] || value
                    },
                    {
                      title: '金额',
                      dataIndex: 'amount',
                      render: (value) => `¥${Number(value).toFixed(2)}`
                    },
                    {
                      title: '支付方式',
                      dataIndex: 'paymentMethod',
                      render: (value) => PAYMENT_METHOD_TEXT[value] || value
                    }
                  ]}
                />
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="常见问题" className="panel-card">
            <Collapse
              items={faqList.map((item) => ({
                key: item.id,
                label: item.question,
                children: <Typography.Text>{item.answer}</Typography.Text>
              }))}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="客服支持" className="panel-card">
            {support ? (
              <Space direction="vertical" size={12}>
                <Typography.Text>客服电话：{support.phone}</Typography.Text>
                <Typography.Text>{support.qrcodeText}</Typography.Text>
              </Space>
            ) : (
              <Skeleton active paragraph={{ rows: 2 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={purchaseCardType ? `购买 ${purchaseCardType.name}` : '购买讲解卡'}
        open={purchaseOpen}
        onCancel={() => setPurchaseOpen(false)}
        onOk={handlePurchase}
        okText="确认支付"
        cancelText="取消"
        confirmLoading={purchaseLoading}
      >
        <Form layout="vertical" form={purchaseForm}>
          <Form.Item label="购买数量" name="quantity" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="支付方式"
            name="paymentMethod"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select options={PAYMENT_METHOD_OPTIONS} />
          </Form.Item>
          <Form.Item label="设备编号（可选）" name="deviceCode">
            <Input placeholder="如 KIOSK-A001" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
