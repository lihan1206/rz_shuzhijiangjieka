import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Steps,
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
  const [purchaseStep, setPurchaseStep] = useState(0);
  const [purchaseResult, setPurchaseResult] = useState(null);
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
    setPurchaseStep(0);
    setPurchaseResult(null);
    purchaseForm.setFieldsValue({
      quantity: 1,
      paymentMethod: 'WECHAT',
      deviceCode: ''
    });
    setPurchaseOpen(true);
  };

  const closePurchaseModal = () => {
    setPurchaseOpen(false);
    setPurchaseStep(0);
    setPurchaseResult(null);
    purchaseForm.resetFields();
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

      setPurchaseResult(result.data);
      setPurchaseStep(2);
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

  const goToConfirmStep = async () => {
    try {
      await purchaseForm.validateFields();
      setPurchaseStep(1);
    } catch (error) {
      // 表单验证失败，不进入下一步
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
        onCancel={closePurchaseModal}
        onOk={purchaseStep === 0 ? goToConfirmStep : handlePurchase}
        okText={purchaseStep === 0 ? '下一步' : '确认支付'}
        cancelText={purchaseStep === 0 ? '取消' : '上一步'}
        confirmLoading={purchaseLoading}
        destroyOnClose
        width={purchaseStep === 2 ? 600 : 520}
        footer={
          purchaseStep === 2
            ? [
                <Button key="close" type="primary" onClick={closePurchaseModal}>
                  完成
                </Button>
              ]
            : [
                <Button key="cancel" onClick={purchaseStep === 0 ? closePurchaseModal : () => setPurchaseStep(0)}>
                  {purchaseStep === 0 ? '取消' : '上一步'}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={purchaseLoading}
                  onClick={purchaseStep === 0 ? goToConfirmStep : handlePurchase}
                >
                  {purchaseStep === 0 ? '下一步' : '确认支付'}
                </Button>
              ]
        }
      >
        <Steps
          current={purchaseStep}
          items={[{ title: '填写信息' }, { title: '确认订单' }, { title: '完成' }]}
          style={{ marginBottom: 24 }}
        />

        {purchaseStep === 0 && (
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
        )}

        {purchaseStep === 1 && purchaseCardType && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="卡种">{purchaseCardType.name}</Descriptions.Item>
                <Descriptions.Item label="单价">¥{purchaseCardType.price.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="有效期">{purchaseCardType.validDays} 天</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="购买数量">
                  <Tag color="blue">{purchaseForm.getFieldValue('quantity')} 张</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="支付方式">
                  {PAYMENT_METHOD_TEXT[purchaseForm.getFieldValue('paymentMethod')]}
                </Descriptions.Item>
                {purchaseForm.getFieldValue('deviceCode') && (
                  <Descriptions.Item label="设备编号">
                    {purchaseForm.getFieldValue('deviceCode')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Divider />

            <div style={{ textAlign: 'right' }}>
              <Typography.Text type="secondary">合计金额：</Typography.Text>
              <Typography.Title level={3} style={{ display: 'inline', marginLeft: 8, color: '#f5222d' }}>
                ¥{(purchaseCardType.price * purchaseForm.getFieldValue('quantity')).toFixed(2)}
              </Typography.Title>
            </div>
          </div>
        )}

        {purchaseStep === 2 && purchaseResult && (
          <Result
            status="success"
            title="购卡成功"
            subTitle={`已成功购买 ${purchaseResult.cards.length} 张讲解卡`}
          >
            <div>
              <Card size="small" title="订单信息" style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="卡种">{purchaseResult.cardType.name}</Descriptions.Item>
                  <Descriptions.Item label="购买数量">{purchaseResult.cards.length} 张</Descriptions.Item>
                  <Descriptions.Item label="合计金额">
                    <Typography.Text type="danger" strong>
                      ¥{purchaseResult.totalAmount.toFixed(2)}
                    </Typography.Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card
                size="small"
                title={`卡号列表（共 ${purchaseResult.cards.length} 张）`}
                style={{ marginBottom: 16 }}
              >
                <List
                  size="small"
                  dataSource={purchaseResult.cards}
                  renderItem={(card, index) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Space>
                          <Tag color="blue">{index + 1}</Tag>
                          <Typography.Text copyable strong>
                            {card.cardNo}
                          </Typography.Text>
                        </Space>
                        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 28 }}>
                          有效期至：{dayjs(card.expiresAt).format('YYYY-MM-DD HH:mm')}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                  style={{ maxHeight: 240, overflow: 'auto' }}
                />
              </Card>

              <Alert
                message="温馨提示"
                description="请妥善保管您的卡号，卡片已自动激活，可立即使用。"
                type="info"
                showIcon
              />
            </div>
          </Result>
        )}
      </Modal>
    </div>
  );
}
