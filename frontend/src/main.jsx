import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import 'antd/dist/reset.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
