import { useState } from 'react';
import { Badge, Button, Input, message, Modal, Spin, Typography } from 'antd';
import { CustomerServiceOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { kioskApi } from '../api/services';

const { Text } = Typography;

export default function ChatDialog() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '您好！我是智能客服助手，可以帮您：\n• 购买讲解卡\n• 查询余额和状态\n• 续费充值\n• 挂失补办\n• 开具发票\n\n请问有什么可以帮您？'
    }
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await kioskApi.dialog(userMessage);
      const data = res.data;
      
      let responseContent = data.response || '抱歉，我暂时无法处理您的请求。';
      
      if (data.available_cards && data.available_cards.length > 0) {
        responseContent += '\n\n可选卡种：';
        data.available_cards.forEach(card => {
          responseContent += `\n• ${card.name}: ${card.price}元/${card.validDays}天 (库存: ${card.stock})`;
        });
      }
      
      if (data.suggestions && data.suggestions.length > 0) {
        responseContent += '\n\n您可以尝试：';
        data.suggestions.forEach((s, i) => {
          responseContent += `\n${i + 1}. ${s}`;
        });
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseContent,
        data 
      }]);
    } catch (error) {
      message.error('对话服务暂时不可用，请稍后再试');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，服务暂时不可用。请稍后再试或联系客服：400-800-8899' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { text: '购买讲解卡', message: '我想购买讲解卡' },
    { text: '查询余额', message: '我想查询卡余额' },
    { text: '续费充值', message: '我想续费充值' },
    { text: '卡丢了怎么办', message: '我的卡丢了怎么办' },
    { text: '支付失败', message: '支付失败了怎么办' },
    { text: '开发票', message: '我要开发票' }
  ];

  const handleQuickAction = (msg) => {
    setInput(msg);
  };

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={
          <Badge dot={messages.length === 1}>
            <CustomerServiceOutlined style={{ fontSize: 24 }} />
          </Badge>
        }
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          zIndex: 1000
        }}
      />

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={420}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CustomerServiceOutlined />
            <span>智能客服</span>
          </div>
        }
        closeIcon={<CloseOutlined />}
        styles={{
          body: { 
            height: 500, 
            display: 'flex', 
            flexDirection: 'column',
            padding: '12px 16px'
          }
        }}
      >
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto',
            marginBottom: 12,
            padding: '8px 0'
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 14,
                  lineHeight: 1.6
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: '#f5f5f5'
                }}
              >
                <Spin size="small" />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickActions.map((action, i) => (
              <Button
                key={i}
                size="small"
                onClick={() => handleQuickAction(action.message)}
                style={{ 
                  borderRadius: 16, 
                  fontSize: 12,
                  padding: '2px 10px'
                }}
              >
                {action.text}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您的问题..."
            disabled={loading}
            style={{ borderRadius: 20 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!input.trim()}
            style={{ borderRadius: 20 }}
          >
            发送
          </Button>
        </div>
      </Modal>
    </>
  );
}
