'use client'

import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // 可以在这里添加错误报告服务
    if (process.env.NODE_ENV === 'production') {
      // 在生产环境中记录错误
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error
  resetError: () => void
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-bg">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-warm-text mb-4">
            哎呀，出现了一些问题
          </h2>
          
          <p className="text-warm-text/70 mb-6 text-sm leading-relaxed">
            不用担心，这只是一个小小的技术故障。我们的工程师已经在修复中了。
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-red-600 font-mono text-sm mb-2">
                开发模式 - 查看错误详情
              </summary>
              <pre className="bg-red-50 p-3 rounded-lg text-xs overflow-auto text-red-800 font-mono">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              重试
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-warm-text/10 hover:bg-warm-text/20 text-warm-text font-medium py-3 px-6 rounded-xl transition-colors duration-200"
            >
              刷新页面
            </button>
          </div>
          
          <p className="mt-6 text-xs text-warm-text/50">
            如果问题持续存在，请联系管理员
          </p>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary

// 导出一个用于包装的 HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={FallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}