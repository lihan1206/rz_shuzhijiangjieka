import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, HelpCircle, ShoppingCart, CreditCard, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { sendChatMessage } from '../api/services.js';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: '您好！欢迎来到数字讲解卡服务中心。我是您的智能助手，可以帮您办理购卡、查询、续费、退卡等业务。\n\n请问有什么可以帮您的吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 打开对话框时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // 添加用户消息
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage);
      
      // 添加机器人回复
      setMessages(prev => [...prev, {
        type: 'bot',
        content: response.data.response,
        data: response.data,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        content: '抱歉，服务暂时不可用，请稍后再试。',
        isError: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理按键事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 快速回复按钮
  const quickReplies = [
    { label: '购买卡片', icon: <ShoppingCart size={14} />, text: '我想买讲解卡' },
    { label: '查询余额', icon: <CreditCard size={14} />, text: '查询余额' },
    { label: '续费', icon: <RefreshCw size={14} />, text: '如何续费' },
    { label: '发票', icon: <FileText size={14} />, text: '申请发票' },
    { label: '帮助', icon: <HelpCircle size={14} />, text: '帮助' }
  ];

  const handleQuickReply = (text) => {
    setInputValue(text);
    // 使用 setTimeout 确保状态更新后再发送
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      handleSend.call({ inputValue: text }, fakeEvent);
    }, 0);
  };

  // 格式化时间
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chatbot-container">
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button 
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          title="智能客服"
        >
          <MessageCircle size={28} />
          <span className="chatbot-badge">客服</span>
        </button>
      )}

      {/* 对话框 */}
      {isOpen && (
        <div className="chatbot-dialog">
          {/* 头部 */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <MessageCircle size={20} />
              <span>数字讲解卡智能助手</span>
            </div>
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* 消息区域 */}
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.type} ${msg.isError ? 'error' : ''}`}
              >
                <div className="message-avatar">
                  {msg.type === 'bot' ? (
                    <div className="avatar-bot">AI</div>
                  ) : (
                    <div className="avatar-user">我</div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <div className="message-time">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot loading">
                <div className="message-avatar">
                  <div className="avatar-bot">AI</div>
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 快速回复 */}
          <div className="chatbot-quick-replies">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                className="quick-reply-btn"
                onClick={() => {
                  setInputValue(reply.text);
                  setTimeout(() => handleSend(), 0);
                }}
              >
                {reply.icon}
                <span>{reply.label}</span>
              </button>
            ))}
          </div>

          {/* 输入区域 */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题..."
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={inputValue.trim() ? 'active' : ''}
            >
              <Send size={18} />
            </button>
          </div>

          {/* 底部提示 */}
          <div className="chatbot-footer">
            <AlertCircle size={12} />
            <span>支持：购卡、查询、续费、退卡、发票、支付问题</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
