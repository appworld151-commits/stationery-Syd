import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './i18n'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

// Shows the error on screen instead of a blank white page.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

// BASE_URL is '/stationery-Syd/' in production (from vite.config.ts base) and '/' in dev.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter basename={basename}><App /></BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
