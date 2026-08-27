"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      if (this.props.name) scope.setExtra("boundary", this.props.name);
      if (info.componentStack) scope.setExtra("componentStack", info.componentStack);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            <p className="font-semibold">এই অংশে সমস্যা হয়েছে</p>
            <p className="mt-1 text-red-500">অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
