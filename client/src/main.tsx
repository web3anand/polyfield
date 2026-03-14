import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, background: "#0c0c0c", color: "#fff", fontFamily: "monospace", minHeight: "100vh" }}>
          <h2 style={{ color: "#f87171" }}>Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#fca5a5", fontSize: 13 }}>{(this.state.error as Error).message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", color: "#6b7280", fontSize: 11 }}>{(this.state.error as Error).stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
