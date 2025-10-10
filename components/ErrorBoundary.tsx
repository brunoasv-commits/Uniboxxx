import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Reverted state initialization to use a constructor. The class property syntax,
  // while modern, can sometimes cause type inference issues in certain build environments,
  // leading to properties like `this.props` not being recognized correctly. The constructor
  // explicitly calls `super(props)`, ensuring the component's props are correctly initialized.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: String(err?.message ?? err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', err, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-700 bg-red-900/30 text-red-200">
          <div className="font-semibold">Ops! Algo deu errado.</div>
          <div className="text-sm opacity-80 mt-1">{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
