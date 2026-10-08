import React from 'react';

export class StoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Store rendering failed', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#080C14] text-slate-100 px-6 font-cairo">
          <div role="alert" className="max-w-md text-center space-y-5">
            <h1 className="text-2xl font-bold text-amber-400">تعذّر فتح المتجر</h1>
            <p>حصل خطأ أثناء تحميل الصفحة. جرّب إعادة تحميل المتجر.</p>
            <button
              type="button"
              className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
