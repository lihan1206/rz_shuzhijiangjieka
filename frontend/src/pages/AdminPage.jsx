import { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Col,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Switch,
  Skeleton
} from 'antd';
import dayjs from 'dayjs';
import { authApi, adminApi } from '../api/services';
import {
  CARD_STATUS_OPTIONS,
  DEVICE_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_TEXT,
  TRANSACTION_TYPE_OPTIONS,
  TRANSACTION_TYPE_TEXT
} from '../utils/constants';
import { cardTypeSchema, deviceSchema, loginSchema } from '../utils/validators';

const { RangePicker } = DatePicker;

function toDateRangeValue(range) {
  if (!range || range.length !== 2 || !range[0] || !range[1]) {
    return {};
  }

  return {
    startDate: range[0].format('YYYY-MM-DD'),
    endDate: range[1].format('YYYY-MM-DD')
  };
}

function LoginPanel({ onLoginSuccess }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const values = await form.validateFields();
      const parsed = loginSchema.parse(values);

      setLoading(true);
      const result = await authApi.login(parsed);
      localStorage.setItem('admin_token', result.data.token);
      localStorage.setItem('admin_user', JSON.stringify(result.data.user));
      message.success('登录成功');
      onLoginSuccess(result.data.user);
    } catch (error) {
      if (error?.issues) {
        message.warning(error.issues[0]?.message || '输入不合法');
      } else {
        message.error(error.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="panel-card admin-login-card">
      <Typography.Title level={3}>管理端登录</Typography.Title>
      <Typography.Paragraph type="secondary">
        默认测试账号：`admin` / `123456`
      </Typography.Paragraph>
      <Form form={form} layout="vertical" initialValues={{ username: 'admin', password: '123456' }}>
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        <Button type="primary" loading={loading} onClick={handleLogin} block>
          登录管理后台
        </Button>
      </Form>
    </Card>
  );
}

function CardTypeTab({ cardTypes, onRefresh }) {
  const { message, modal } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, stock: 0, validDays: 1, price: 1 });
    setOpen(true);
  };

  const openEdit = (record) => {
    setCurrent(record);
    form.setFieldsValue({
      ...record,
      usageLimit: record.usageLimit ?? null
    });
    setOpen(true);
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: '确认删除卡种？',
      content: `将删除或下架卡种「${record.name}」，此操作会影响前台售卖。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminApi.deleteCardType(record.id);
          message.success('删除操作已完成');
          onRefresh();
        } catch (error) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const parsed = cardTypeSchema.parse({
        ...values,
        usageLimit: values.usageLimit || null
      });

      setLoading(true);
      if (current) {
        await adminApi.updateCardType(current.id, parsed);
        message.success('卡种更新成功');
      } else {
        await adminApi.createCardType(parsed);
        message.success('卡种新增成功');
      }
      setOpen(false);
      onRefresh();
    } catch (error) {
      if (error?.issues) {
        message.warning(error.issues[0]?.message || '输入不合法');
      } else {
        message.error(error.message || '保存失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="panel-card" title="卡种管理" extra={<Button onClick={openCreate}>新增卡种</Button>}>
      <Table
        rowKey="id"
        dataSource={cardTypes}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '卡种名称', dataIndex: 'name' },
          { title: '价格', dataIndex: 'price', render: (value) => `¥${Number(value).toFixed(2)}` },
          { title: '有效期(天)', dataIndex: 'validDays' },
          { title: '次数限制', dataIndex: 'usageLimit', render: (value) => (value ? `${value} 次` : '不限次') },
          { title: '库存', dataIndex: 'stock' },
          {
            title: '状态',
            dataIndex: 'isActive',
            render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? '上架' : '下架'}</Tag>
          },
          { title: '优惠信息', dataIndex: 'discountInfo', ellipsis: true },
          {
            title: '操作',
            key: 'action',
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
                <Button type="link" danger onClick={() => handleDelete(record)}>
                  删除
                </Button>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={current ? '编辑卡种' : '新增卡种'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="卡种名称" name="name" rules={[{ required: true, message: '请输入卡种名称' }]}>
            <Input placeholder="请输入卡种名称" />
          </Form.Item>
          <Form.Item label="价格" name="price" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="有效期（天）" name="validDays" rules={[{ required: true, message: '请输入有效期' }]}>
            <InputNumber min={1} max={3650} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="使用次数限制（留空表示不限次）" name="usageLimit">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="不限次可留空" />
          </Form.Item>
          <Form.Item label="库存" name="stock" rules={[{ required: true, message: '请输入库存' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="优惠信息" name="discountInfo">
            <Input placeholder="例如：节假日 95 折" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入卡种描述" />
          </Form.Item>
          <Form.Item label="是否上架" name="isActive" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function TransactionTab({ cardTypes }) {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    paymentMethod: undefined,
    type: undefined,
    cardTypeId: undefined,
    range: undefined
  });

  const fetchData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page: nextFilters.page,
        pageSize: nextFilters.pageSize,
        paymentMethod: nextFilters.paymentMethod || undefined,
        type: nextFilters.type || undefined,
        cardTypeId: nextFilters.cardTypeId || undefined,
        ...toDateRangeValue(nextFilters.range)
      };

      const result = await adminApi.fetchTransactions(params);
      setList(result.data.list || []);
      setPagination({
        current: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total
      });
    } catch (error) {
      message.error(error.message || '交易数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card className="panel-card" title="交易管理">
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} lg={8}>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="支付方式"
            options={PAYMENT_METHOD_OPTIONS}
            value={filters.paymentMethod}
            onChange={(value) => setFilters((prev) => ({ ...prev, paymentMethod: value }))}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="交易类型"
            options={TRANSACTION_TYPE_OPTIONS}
            value={filters.type}
            onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="卡种筛选"
            options={cardTypes.map((item) => ({ label: item.name, value: item.id }))}
            value={filters.cardTypeId}
            onChange={(value) => setFilters((prev) => ({ ...prev, cardTypeId: value }))}
          />
        </Col>
        <Col xs={24} sm={16} lg={12}>
          <RangePicker
            style={{ width: '100%' }}
            value={filters.range}
            onChange={(value) => setFilters((prev) => ({ ...prev, range: value }))}
          />
        </Col>
        <Col xs={24} sm={8} lg={12}>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const next = { ...filters, page: 1 };
                setFilters(next);
                fetchData(next);
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                const reset = { page: 1, pageSize: 10 };
                setFilters(reset);
                fetchData(reset);
              }}
            >
              重置
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (current, pageSize) => {
            const next = { ...filters, page: current, pageSize };
            setFilters(next);
            fetchData(next);
          }
        }}
        columns={[
          { title: '订单号', dataIndex: 'orderNo', width: 200 },
          { title: '卡号', dataIndex: ['card', 'cardNo'], width: 180, render: (value) => value || '-' },
          { title: '卡种', dataIndex: ['cardType', 'name'], width: 140, render: (value) => value || '-' },
          {
            title: '交易类型',
            dataIndex: 'type',
            width: 100,
            render: (value) => TRANSACTION_TYPE_TEXT[value] || value
          },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 100,
            render: (value) => `¥${Number(value).toFixed(2)}`
          },
          {
            title: '支付方式',
            dataIndex: 'paymentMethod',
            width: 100,
            render: (value) => PAYMENT_METHOD_TEXT[value] || value
          },
          {
            title: '设备',
            dataIndex: ['device', 'name'],
            width: 140,
            render: (value, record) => (value ? `${value}(${record.device?.deviceCode})` : '-')
          },
          {
            title: '时间',
            dataIndex: 'createdAt',
            width: 170,
            render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
          }
        ]}
        scroll={{ x: 1280 }}
      />
    </Card>
  );
}

function CardTab({ cardTypes }) {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [filters, setFilters] = useState({ page: 1, pageSize: 10, cardNo: '', status: undefined, cardTypeId: undefined });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const result = await adminApi.fetchCards({
        page: nextFilters.page,
        pageSize: nextFilters.pageSize,
        cardNo: nextFilters.cardNo || undefined,
        status: nextFilters.status || undefined,
        cardTypeId: nextFilters.cardTypeId || undefined
      });

      setList(result.data.list || []);
      setPagination({
        current: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total
      });
    } catch (error) {
      message.error(error.message || '卡片数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (record, status) => {
    try {
      await adminApi.updateCardStatus(record.id, {
        status,
        lossReason: status === 'LOST' ? '后台人工挂失' : undefined
      });
      message.success('状态更新成功');
      fetchData();
    } catch (error) {
      message.error(error.message || '状态更新失败');
    }
  };

  return (
    <Card className="panel-card" title="用户卡管理">
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} lg={8}>
          <Input
            placeholder="按卡号搜索"
            value={filters.cardNo}
            onChange={(event) => setFilters((prev) => ({ ...prev, cardNo: event.target.value }))}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="卡状态筛选"
            options={CARD_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="卡种筛选"
            options={cardTypes.map((item) => ({ label: item.name, value: item.id }))}
            value={filters.cardTypeId}
            onChange={(value) => setFilters((prev) => ({ ...prev, cardTypeId: value }))}
          />
        </Col>
        <Col xs={24}>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const next = { ...filters, page: 1 };
                setFilters(next);
                fetchData(next);
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                const reset = { page: 1, pageSize: 10, cardNo: '', status: undefined, cardTypeId: undefined };
                setFilters(reset);
                fetchData(reset);
              }}
            >
              重置
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (current, pageSize) => {
            const next = { ...filters, page: current, pageSize };
            setFilters(next);
            fetchData(next);
          }
        }}
        columns={[
          { title: '卡号', dataIndex: 'cardNo', width: 230 },
          { title: '卡种', dataIndex: ['cardType', 'name'], width: 160, render: (value) => value || '-' },
          {
            title: '余额',
            dataIndex: 'balance',
            width: 100,
            render: (value) => `¥${Number(value).toFixed(2)}`
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (value) => {
              const item = CARD_STATUS_OPTIONS.find((status) => status.value === value);
              return <Tag color={item?.color || 'default'}>{item?.label || value}</Tag>;
            }
          },
          {
            title: '到期时间',
            dataIndex: 'expiresAt',
            width: 160,
            render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm')
          },
          {
            title: '操作',
            key: 'action',
            width: 220,
            render: (_, record) => (
              <Select
                style={{ width: 180 }}
                value={record.status}
                options={CARD_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
                onChange={(value) => updateStatus(record, value)}
              />
            )
          }
        ]}
        scroll={{ x: 1080 }}
      />
    </Card>
  );
}

function DeviceTab() {
  const { message, modal } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await adminApi.fetchDevices();
      setList(result.data || []);
    } catch (error) {
      message.error(error.message || '设备数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ONLINE', firmwareVersion: '1.0.0' });
    setOpen(true);
  };

  const openEdit = (record) => {
    setCurrent(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: '确认删除设备？',
      content: `设备「${record.name}」删除后将无法继续在系统中分配交易。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminApi.deleteDevice(record.id);
          message.success('设备删除成功');
          fetchData();
        } catch (error) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const parsed = deviceSchema.parse(values);
      setSubmitLoading(true);

      if (current) {
        await adminApi.updateDevice(current.id, parsed);
        message.success('设备更新成功');
      } else {
        await adminApi.createDevice(parsed);
        message.success('设备新增成功');
      }

      setOpen(false);
      fetchData();
    } catch (error) {
      if (error?.issues) {
        message.warning(error.issues[0]?.message || '输入不合法');
      } else {
        message.error(error.message || '保存失败');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const runAction = async (record, action) => {
    try {
      let payload = { action };
      if (action === 'UPGRADE') {
        const parts = String(record.firmwareVersion || '1.0.0')
          .split('.')
          .map((item) => Number(item));
        const targetVersion = `${parts[0] || 1}.${parts[1] || 0}.${(parts[2] || 0) + 1}`;
        payload = {
          ...payload,
          targetVersion,
          detail: `前端触发升级到 ${targetVersion}`
        };
      }

      await adminApi.deviceAction(record.id, payload);
      message.success('设备动作执行成功');
      fetchData();
    } catch (error) {
      message.error(error.message || '执行失败');
    }
  };

  return (
    <Card className="panel-card" title="设备管理" extra={<Button onClick={openCreate}>新增设备</Button>}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '设备编号', dataIndex: 'deviceCode', width: 160 },
          { title: '设备名称', dataIndex: 'name', width: 180 },
          { title: '位置', dataIndex: 'location', width: 180 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (value) => {
              const status = DEVICE_STATUS_OPTIONS.find((item) => item.value === value);
              return <Tag color={status?.color || 'default'}>{status?.label || value}</Tag>;
            }
          },
          { title: '固件版本', dataIndex: 'firmwareVersion', width: 110 },
          {
            title: '上次同步',
            dataIndex: 'lastSyncAt',
            width: 160,
            render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-')
          },
          {
            title: '交易次数',
            dataIndex: ['_count', 'transactions'],
            width: 100,
            render: (value) => value || 0
          },
          {
            title: '操作',
            key: 'action',
            width: 300,
            render: (_, record) => (
              <Space wrap>
                <Button size="small" type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
                <Button size="small" type="link" onClick={() => runAction(record, 'SYNC')}>
                  同步
                </Button>
                <Button size="small" type="link" onClick={() => runAction(record, 'RESTART')}>
                  重启
                </Button>
                <Button size="small" type="link" onClick={() => runAction(record, 'UPGRADE')}>
                  升级
                </Button>
                <Button size="small" type="link" danger onClick={() => handleDelete(record)}>
                  删除
                </Button>
              </Space>
            )
          }
        ]}
        scroll={{ x: 1400 }}
      />

      <Modal
        title={current ? '编辑设备' : '新增设备'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitLoading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="设备编号" name="deviceCode" rules={[{ required: true, message: '请输入设备编号' }]}>
            <Input placeholder="如 KIOSK-C003" />
          </Form.Item>
          <Form.Item label="设备名称" name="name" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item label="设备位置" name="location" rules={[{ required: true, message: '请输入设备位置' }]}>
            <Input placeholder="请输入设备位置" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={DEVICE_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))} />
          </Form.Item>
          <Form.Item label="固件版本" name="firmwareVersion">
            <Input placeholder="如 1.2.1" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function StatsTab() {
  const { message } = AntdApp.useApp();
  const [range, setRange] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [paymentStats, setPaymentStats] = useState([]);
  const [behavior, setBehavior] = useState(null);

  const fetchData = async (nextRange = range) => {
    setLoading(true);
    try {
      const params = toDateRangeValue(nextRange);
      const [overviewRes, paymentRes, behaviorRes] = await Promise.all([
        adminApi.fetchOverviewStats(params),
        adminApi.fetchPaymentStats(params),
        adminApi.fetchUserBehaviorStats(params)
      ]);

      setOverview(overviewRes.data);
      setPaymentStats(paymentRes.data || []);
      setBehavior(behaviorRes.data);
    } catch (error) {
      message.error(error.message || '统计数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !overview) {
    return (
      <Card className="panel-card" title="运营统计">
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  return (
    <Card className="panel-card" title="运营统计">
      <Space style={{ marginBottom: 16 }}>
        <RangePicker value={range} onChange={setRange} />
        <Button type="primary" loading={loading} onClick={() => fetchData(range)}>
          刷新统计
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="购卡销售额" value={overview?.totalSalesAmount || 0} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="充值金额" value={overview?.totalRechargeAmount || 0} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="售出卡总量" value={overview?.soldCards || 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="激活卡数量" value={overview?.activeCards || 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="交易总笔数" value={overview?.transactionCount || 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card bordered={false} className="stats-card">
            <Statistic title="购卡订单" value={overview?.purchaseOrderCount || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <Card title="支付方式占比" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {paymentStats.map((item) => (
                <div key={item.paymentMethod}>
                  <div className="progress-label-row">
                    <Typography.Text>{PAYMENT_METHOD_TEXT[item.paymentMethod] || item.paymentMethod}</Typography.Text>
                    <Typography.Text>
                      {item.count} 笔 / {item.ratio}%
                    </Typography.Text>
                  </div>
                  <Progress percent={item.ratio} showInfo={false} strokeColor="#1a8cff" />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="购卡高峰时段" size="small">
            <Typography.Paragraph>
              高峰时段：<Tag color="blue">{behavior?.peakHour?.hour || '暂无'}</Tag> 数量：{behavior?.peakHour?.count || 0}
            </Typography.Paragraph>
            <Table
              size="small"
              rowKey="hour"
              pagination={false}
              dataSource={behavior?.hourly || []}
              columns={[
                { title: '时段', dataIndex: 'hour' },
                { title: '购卡数量', dataIndex: 'count' }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="周维度购卡行为" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="weekday"
          pagination={false}
          dataSource={behavior?.weekly || []}
          columns={[
            { title: '星期', dataIndex: 'weekday' },
            { title: '购卡数量', dataIndex: 'count' }
          ]}
        />
      </Card>
    </Card>
  );
}

function LogTab() {
  const { message } = AntdApp.useApp();
  const [type, setType] = useState('operation');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const fetchData = async (nextType = type) => {
    setLoading(true);
    try {
      const result = await adminApi.fetchLogs({ type: nextType, limit: 100 });
      setData(result.data || []);
    } catch (error) {
      message.error(error.message || '日志加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('operation');
  }, []);

  const columns = useMemo(() => {
    if (type === 'operation') {
      return [
        { title: '模块', dataIndex: 'module' },
        { title: '动作', dataIndex: 'action' },
        { title: '操作人', dataIndex: 'operator' },
        { title: '详情', dataIndex: 'detail' },
        { title: '时间', dataIndex: 'createdAt', render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss') }
      ];
    }

    if (type === 'payment') {
      return [
        { title: '订单号', dataIndex: 'orderNo', render: (value) => value || '-' },
        {
          title: '支付方式',
          dataIndex: 'paymentMethod',
          render: (value) => (value ? PAYMENT_METHOD_TEXT[value] || value : '-')
        },
        { title: '异常信息', dataIndex: 'errorMessage' },
        {
          title: '时间',
          dataIndex: 'createdAt',
          render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
        }
      ];
    }

    return [
      { title: '设备', dataIndex: ['device', 'name'], render: (value) => value || '-' },
      { title: '设备编号', dataIndex: ['device', 'deviceCode'], render: (value) => value || '-' },
      { title: '动作', dataIndex: 'action' },
      { title: '操作人', dataIndex: 'operator' },
      { title: '详情', dataIndex: 'detail' },
      { title: '时间', dataIndex: 'createdAt', render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss') }
    ];
  }, [type]);

  return (
    <Card className="panel-card" title="系统日志">
      <Space style={{ marginBottom: 12 }}>
        <Select
          value={type}
          style={{ width: 180 }}
          options={[
            { label: '系统操作日志', value: 'operation' },
            { label: '支付异常日志', value: 'payment' },
            { label: '设备通信日志', value: 'device' }
          ]}
          onChange={(value) => {
            setType(value);
            fetchData(value);
          }}
        />
        <Button loading={loading} onClick={() => fetchData(type)}>
          刷新
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={columns}
        scroll={{ x: 980 }}
      />
    </Card>
  );
}

export default function AdminPage() {
  const { message } = AntdApp.useApp();
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('admin_user');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  });

  const [cardTypes, setCardTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const hasToken = Boolean(localStorage.getItem('admin_token'));

  const loadCardTypes = async () => {
    setLoading(true);
    try {
      const result = await adminApi.fetchCardTypes();
      setCardTypes(result.data || []);
    } catch (error) {
      message.error(error.message || '卡种数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    adminApi
      .me()
      .then((res) => {
        setUser(res.data);
        loadCardTypes();
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setUser(null);
      });
  }, [hasToken]);

  if (!hasToken || !user) {
    return <LoginPanel onLoginSuccess={(nextUser) => setUser(nextUser)} />;
  }

  return (
    <div className="page-content">
      <Card className="panel-card">
        <Row justify="space-between" align="middle" gutter={[8, 8]}>
          <Col>
            <Typography.Title level={3} style={{ margin: 0 }}>
              管理后台
            </Typography.Title>
            <Typography.Text type="secondary">当前登录：{user.displayName}</Typography.Text>
          </Col>
          <Col>
            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: '确认退出登录？',
                  content: '退出后将返回登录页。',
                  okText: '确认退出',
                  cancelText: '取消',
                  onOk: () => {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_user');
                    setUser(null);
                    setCardTypes([]);
                    message.success('已退出登录');
                  }
                });
              }}
            >
              退出登录
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs
        className="panel-card tabs-card"
        items={[
          {
            key: 'cardType',
            label: '卡种管理',
            children: loading ? <Skeleton active paragraph={{ rows: 8 }} /> : <CardTypeTab cardTypes={cardTypes} onRefresh={loadCardTypes} />
          },
          {
            key: 'transaction',
            label: '交易管理',
            children: <TransactionTab cardTypes={cardTypes} />
          },
          {
            key: 'cards',
            label: '用户卡管理',
            children: <CardTab cardTypes={cardTypes} />
          },
          {
            key: 'device',
            label: '设备管理',
            children: <DeviceTab />
          },
          {
            key: 'stats',
            label: '运营统计',
            children: <StatsTab />
          },
          {
            key: 'logs',
            label: '日志管理',
            children: <LogTab />
          }
        ]}
      />
    </div>
  );
}
