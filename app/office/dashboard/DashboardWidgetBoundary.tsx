"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type DashboardWidgetBoundaryProps = {
  widgetName: string;
  children: ReactNode;
};

type DashboardWidgetBoundaryState = {
  hasError: boolean;
};

export default class DashboardWidgetBoundary extends Component<DashboardWidgetBoundaryProps, DashboardWidgetBoundaryState> {
  state: DashboardWidgetBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DashboardWidgetBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Prevent full dashboard collapse when a single widget fails.
  }

  render() {
    if (this.state.hasError) {
      return (
        <section style={styles.wrap}>
          <strong style={styles.title}>{this.props.widgetName}</strong>
          <p style={styles.message}>This widget could not be loaded right now. Other dashboard sections remain available.</p>
        </section>
      );
    }

    return this.props.children;
  }
}

const styles = {
  wrap: {
    borderRadius: 14,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    padding: "12px 14px",
    display: "grid",
    gap: 6,
  },
  title: {
    color: "#991b1b",
    fontSize: "13px",
    fontWeight: 800,
  },
  message: {
    margin: 0,
    color: "#7f1d1d",
    fontSize: "13px",
  },
} as const;
