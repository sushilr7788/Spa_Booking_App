import React from 'react';
import { logger } from '../../utils/logger';
import { Button } from 'react-bootstrap';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('UI Rendering Failure', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-light gap-3">
          <h2 className="h4 fw-bold text-dark mb-0">Something went wrong.</h2>
          <p className="text-secondary text-center" style={{ maxWidth: '400px' }}>
            {this.state.error?.toString() || 'An unexpected rendering error occurred.'}
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>Reload Application</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
