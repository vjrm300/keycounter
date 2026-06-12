import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; retryCount: number; }

const MAX_RETRIES = 3;

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[KeyCounter] 渲染错误:", error, errorInfo);
  }

  handleRetry = () => {
    const next = this.state.retryCount + 1;
    if (next >= MAX_RETRIES) { window.location.reload(); return; }
    this.setState({ hasError: false, error: null, retryCount: next });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <div className="text-4xl mb-3">😵</div>
          <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>渲染出错</h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>{this.state.error?.message || "未知错误"}</p>
          <button onClick={this.handleRetry} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>{this.state.retryCount >= MAX_RETRIES - 1 ? "重新加载" : "重试"}</button>
        </div>
      );
    }
    return this.props.children;
  }
}