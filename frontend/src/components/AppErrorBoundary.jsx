import React from 'react';
import { Button, Card, Typography } from 'antd';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrap">
          <Card className="error-boundary-card">
            <Typography.Title level={3}>页面加载失败</Typography.Title>
            <Typography.Paragraph>
              系统发生异常，建议刷新页面重试。如多次失败，请联系管理员。
            </Typography.Paragraph>
            <Button type="primary" onClick={this.handleRetry}>
              重新加载
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
