import { useState } from 'react';
import { Card, Segmented, Typography } from 'antd';
import KioskPage from './pages/KioskPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [mode, setMode] = useState('kiosk');

  return (
    <main className="app-shell">
      <section className="hero-wrap">
        <Typography.Title className="hero-title">数智讲解卡自助机销售系统</Typography.Title>
        <Typography.Paragraph className="hero-subtitle">
          覆盖购卡、充值、查询、库存管理、设备运维与运营统计的一体化平台
        </Typography.Paragraph>
        <Segmented
          size="large"
          options={[
            { label: '自助机端', value: 'kiosk' },
            { label: '管理端', value: 'admin' }
          ]}
          value={mode}
          onChange={setMode}
        />
      </section>

      <Card className="content-card" bordered={false}>
        {mode === 'kiosk' ? <KioskPage /> : <AdminPage />}
      </Card>
    </main>
  );
}
