import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  Typography,
  Avatar,
  Tag,
  message
} from 'antd';
import {
  SendOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  CreditCardOutlined,
  ReconciliationOutlined,
  QuestionCircleOutlined,
  MobileOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

// 卡种配置
const CARD_TYPES = {
  '1天卡': { price: 10, validDays: 1 },
  '3天卡': { price: 20, validDays: 3 },
  '7天卡': { price: 30, validDays: 7 },
  '30天卡': { price: 80, validDays: 30 },
  '年卡': { price: 365, validDays: 365 }
};

// 支付方式
const PAYMENT_METHODS = ['微信', '支付宝', '银联'];

// 意图识别
const recognizeIntent = (input) => {
  const text = input.toLowerCase().trim();
  
  // 购卡相关
  if (text.includes('买') || text.includes('购买') || text.includes('办') || text.includes('多少钱') || text.includes('价格')) {
    if (text.includes('7天') || text.includes('七日')) {
      return { intent: 'buy_card', card_type: '7天卡', price: 30 };
    } else if (text.includes('1天') || text.includes('一日') || text.includes('一天')) {
      return { intent: 'buy_card', card_type: '1天卡', price: 10 };
    } else if (text.includes('3天') || text.includes('三日') || text.includes('三天')) {
      return { intent: 'buy_card', card_type: '3天卡', price: 20 };
    } else if (text.includes('30天') || text.includes('月卡') || text.includes('一个月')) {
      return { intent: 'buy_card', card_type: '30天卡', price: 80 };
    } else if (text.includes('年卡') || text.includes('一年') || text.includes('365天')) {
      return { intent: 'buy_card', card_type: '年卡', price: 365 };
    }
    return { intent: 'buy_card', card_type: null, price: null };
  }
  
  // 续费相关
  if (text.includes('续') || text.includes('充值') || text.includes('续费')) {
    return { intent: 'renew_card' };
  }
  
  // 支付失败
  if (text.includes('失败') || text.includes('不成功') || text.includes('付不了') || text.includes('错误')) {
    return { intent: 'payment_failed' };
  }
  
  // 优惠/批量购买
  if (text.includes('优惠') || text.includes('便宜') || text.includes('折扣') || text.includes('张') || text.includes('多买')) {
    const match = text.match(/(\d+)\s*张/);
    const quantity = match ? parseInt(match[1]) : null;
    return { intent: 'bulk_purchase', quantity };
  }
  
  // 卡丢失/补办
  if (text.includes('丢') || text.includes('掉') || text.includes('补办') || text.includes('挂失')) {
    return { intent: 'card_lost' };
  }
  
  // 余额查询
  if (text.includes('余额') || text.includes('剩多少钱') || text.includes('还有多少钱')) {
    return { intent: 'query_balance' };
  }
  
  // 激活状态
  if (text.includes('激活') || text.includes('状态') || text.includes('有效')) {
    return { intent: 'query_status' };
  }
  
  // 发票
  if (text.includes('发票') || text.includes('报销') || text.includes('票据')) {
    return { intent: 'invoice' };
  }
  
  // 退卡
  if (text.includes('退') || text.includes('退款') || text.includes('退卡')) {
    return { intent: 'refund' };
  }
  
  // 帮助/推荐
  if (text.includes('帮助') || text.includes('推荐') || text.includes('选什么') || text.includes('哪个好')) {
    return { intent: 'need_help' };
  }
  
  // 模糊输入
  if (text === '' || text === '卡' || text === '要卡' || text.includes('想要') || text.includes('需要')) {
    return { intent: 'ambiguous' };
  }
  
  return { intent: 'unknown' };
};

// 生成响应
const generateResponse = (intentResult, input) => {
  const { intent, card_type, price, quantity } = intentResult;
  
  switch (intent) {
    case 'buy_card':
      if (card_type && price) {
        return {
          intent: 'buy_card',
          card_type,
          price,
          payment_method: PAYMENT_METHODS,
          response: `您好，${card_type}${price}元，支持${PAYMENT_METHODS.join('和')}支付。您现在要购买吗？`,
          status: 'success'
        };
      } else {
        return {
          intent: 'buy_card',
          card_type: null,
          price: null,
          payment_method: PAYMENT_METHODS,
          response: '请问您需要购买哪种卡？我们有1天卡(10元)、3天卡(20元)、7天卡(30元)、30天卡(80元)、年卡(365元)可供选择。',
          status: 'need_more_info'
        };
      }
    
    case 'renew_card':
      return {
        intent: 'renew_card',
        response: '您好，续费请输入您的卡号，选择充值金额和支付方式即可完成。支持微信、支付宝和银联支付。',
        status: 'success'
      };
    
    case 'payment_failed':
      return {
        intent: 'payment_failed',
        response: '抱歉支付失败了，请检查网络连接或账户余额。如问题持续，请联系客服：400-123-4567，或尝试更换支付方式重新支付。',
        status: 'success'
      };
    
    case 'bulk_purchase':
      if (quantity && quantity > 100) {
        return {
          intent: 'bulk_purchase',
          response: `抱歉，单次购买上限为100张。如需购买${quantity}张，请分多次购买或联系客服400-123-4567进行企业团购咨询。`,
          status: 'error'
        };
      } else if (quantity && quantity >= 10) {
        return {
          intent: 'bulk_purchase',
          response: `购买${quantity}张可享受9折优惠！需要我为您推荐卡种吗？支持微信、支付宝和银联支付。`,
          status: 'success'
        };
      } else {
        return {
          intent: 'bulk_purchase',
          response: '单次购买10张及以上可享受9折优惠。请问您需要购买多少张？需要推荐卡种吗？',
          status: 'need_more_info'
        };
      }
    
    case 'card_lost':
      return {
        intent: 'card_lost',
        response: '抱歉您的卡丢失了。请联系客服400-123-4567，提供卡号和身份信息进行挂失补办。如记得卡号，也可直接在充值页输入卡号继续使用余额。',
        status: 'success'
      };
    
    case 'query_balance':
      return {
        intent: 'query_balance',
        response: '请在本页"余额与交易查询"区域输入卡号即可查询余额和最近交易记录。',
        status: 'success'
      };
    
    case 'query_status':
      return {
        intent: 'query_status',
        response: '卡片激活状态和剩余有效期可通过卡号查询，请在"余额与交易查询"区域输入卡号查看。支付成功后卡片会自动激活。',
        status: 'success'
      };
    
    case 'invoice':
      return {
        intent: 'invoice',
        response: '购卡和充值后可申请电子发票。请联系客服400-123-4567提供交易单号和邮箱，我们将在3个工作日内发送电子发票至您的邮箱。',
        status: 'success'
      };
    
    case 'refund':
      return {
        intent: 'refund',
        response: '未使用且在有效期内的卡片可申请退款。请联系客服400-123-4567提供卡号办理。已激活使用的卡片按剩余天数比例退款。',
        status: 'success'
      };
    
    case 'need_help':
      return {
        intent: 'need_help',
        response: '需要我为您推荐卡种吗？\n1. 短期旅行推荐：1天卡/3天卡\n2. 一周深度游推荐：7天卡\n3. 本地居民推荐：30天卡/年卡\n请问您有什么需求？',
        status: 'success'
      };
    
    case 'ambiguous':
      return {
        intent: 'ambiguous',
        response: '请问有什么可以帮您？您可以：\n1. 购买讲解卡\n2. 充值续费\n3. 查询余额\n4. 申请发票\n5. 挂失补办',
        status: 'need_more_info'
      };
    
    default:
      return {
        intent: 'unknown',
        response: '抱歉我没理解您的问题。您可以尝试描述得更具体一些，或咨询以下问题：\n1. "买7天卡多少钱"\n2. "怎么充值续费"\n3. "支付失败怎么办"',
        status: 'success'
      };
  }
};

const MessageBubble = ({ message, isUser }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12
    }}>
      {!isUser && (
        <Avatar 
          icon={<CustomerServiceOutlined />} 
          style={{ 
            backgroundColor: '#1890ff',
            marginRight: 8
          }}
        />
      )}
      <div style={{
        maxWidth: '70%',
        padding: '10px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        backgroundColor: isUser ? '#1890ff' : '#f0f2f5',
        color: isUser ? 'white' : 'inherit',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap'
      }}>
        <Typography.Text style={{ color: isUser ? 'white' : 'inherit' }}>
          {message}
        </Typography.Text>
      </div>
      {isUser && (
        <Avatar 
          icon={<UserOutlined />} 
          style={{ 
            backgroundColor: '#52c41a',
            marginLeft: 8
          }}
        />
      )}
    </div>
  );
};

const QuickReplyButton = ({ text, icon, onClick }) => (
  <Button 
    size="small" 
    icon={icon}
    onClick={() => onClick(text)}
    style={{ borderRadius: 16 }}
  >
    {text}
  </Button>
);

export default function CustomerService() {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: '您好！我是智能客服小助手，有什么可以帮您的？', 
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleQuickReply = (text) => {
    setInputText(text);
  };
  
  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      message.warning('请输入您的问题');
      return;
    }
    
    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);
    
    // 模拟处理延迟
    setTimeout(() => {
      // 识别意图并生成响应
      const intentResult = recognizeIntent(currentInput);
      const response = generateResponse(intentResult, currentInput);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        data: response
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      
      // 输出JSON到控制台（用于调试）
      console.log('客服响应:', JSON.stringify(response, null, 2));
    }, 800);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const quickReplies = [
    { text: '买7天卡多少钱', icon: <CreditCardOutlined /> },
    { text: '怎么续费充值', icon: <ReconciliationOutlined /> },
    { text: '支付失败怎么办', icon: <ExclamationCircleOutlined /> },
    { text: '卡丢了能补办吗', icon: <MobileOutlined /> },
    { text: '需要帮助推荐', icon: <QuestionCircleOutlined /> }
  ];
  
  return (
    <Card 
      title={
        <Space>
          <CustomerServiceOutlined style={{ color: '#1890ff' }} />
          <span>智能客服</span>
          <Tag color="green">在线</Tag>
        </Space>
      }
      className="panel-card"
    >
      <div style={{ 
        height: 400, 
        overflowY: 'auto', 
        padding: '0 8px',
        marginBottom: 16,
        backgroundColor: '#fafafa',
        borderRadius: 8,
        paddingTop: 12
      }}>
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg.text} 
            isUser={msg.isUser} 
          />
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <Avatar 
              icon={<CustomerServiceOutlined />} 
              style={{ backgroundColor: '#1890ff', marginRight: 8 }}
            />
            <div style={{ 
              padding: '10px 16px', 
              backgroundColor: '#f0f2f5',
              borderRadius: '18px 18px 18px 4px'
            }}>
              <Typography.Text type="secondary">正在输入...</Typography.Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          快捷问题：
        </Typography.Text>
        <Space wrap size={[6, 8]} style={{ marginTop: 4, marginLeft: 8 }}>
          {quickReplies.map((item) => (
            <QuickReplyButton
              key={item.text}
              text={item.text}
              icon={item.icon}
              onClick={handleQuickReply}
            />
          ))}
        </Space>
      </div>
      
      <div style={{ display: 'flex', gap: 8 }}>
        <TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="请输入您的问题..."
          rows={2}
          style={{ flex: 1, resize: 'none' }}
          maxLength={200}
          showCount
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          style={{ height: 'auto', minWidth: 80 }}
          loading={isTyping}
        >
          发送
        </Button>
      </div>
      
      <div style={{ 
        marginTop: 12, 
        paddingTop: 12, 
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          支持：购卡咨询 | 支付问题 | 续费充值 | 发票退卡
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          客服热线：400-123-4567
        </Typography.Text>
      </div>
    </Card>
  );
}
