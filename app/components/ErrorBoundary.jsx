"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: () => this.handleReset(),
        });
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            gap: "16px",
            color: "var(--navy)",
            fontFamily: "var(--font-body)",
          }}
        >
          <p style={{ fontSize: "0.95rem", color: "var(--muted)" }}>
            {"A apărut o eroare neașteptată."}
          </p>
          <button
            onClick={() => this.handleReset()}
            style={{
              padding: "8px 20px",
              backgroundColor: "var(--rose)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {"Încearcă din nou"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}