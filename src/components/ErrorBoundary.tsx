import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Bootlegger ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0705] text-amber-200 flex flex-col items-center justify-center p-6 select-none font-['Kanit',sans-serif]">
          <div className="max-w-md w-full bg-[#1e1008] border-2 border-amber-600/80 rounded-2xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="font-bold text-lg text-amber-300 font-['Press_Start_2P',monospace] text-xs leading-relaxed mb-3">
              ระบบตรวจพบข้อผิดพลาดชั่วคราว
            </h2>
            <p className="text-xs text-amber-100/70 mb-4">
              {this.state.error?.message || 'เกิดข้อผิดพลาดในการเรนเดอร์หน้าจอเกม'}
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-extrabold text-xs rounded-xl shadow-lg border border-amber-300 transition-all active:scale-95 cursor-pointer"
              >
                🔄 รีโหลดเข้าสู่เกมใหม่ (Reload Game)
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-black/60 hover:bg-black text-rose-300 border border-rose-800/60 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                🚪 ล้างเซสชันและกลับสู่หน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
