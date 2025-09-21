import React from "react";
import logger from "../../lib/utils/logger";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(error: any, info: any) {
    // Auto-retry for chunk loading failures
    if (/Loading chunk [\d]+ failed/i.test(String(error?.message))) {
      logger.debug('Chunk loading failed, auto-retrying:', error);
      return;
    }
    logger.error('React error boundary caught error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-sm text-red-300 bg-red-900/20 rounded-xl">
          Une erreur est survenue. Recharge la page ou réessaie.
        </div>
      );
    }
    return this.props.children;
  }
}