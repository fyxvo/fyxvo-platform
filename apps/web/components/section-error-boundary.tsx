"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

interface State {
  readonly hasError: boolean;
  readonly digest?: string;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[SectionErrorBoundary]", error, info);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-6 text-center">
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              This section could not be displayed.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 text-xs text-[var(--fyxvo-text-muted)] underline hover:text-[var(--fyxvo-text)]"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
