import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { FullPageTaskView } from './components/FullPageTaskView.jsx'
import DesignReviewPage from './components/DesignReviewPage.jsx'
import { ClientActivation } from './pages/ClientActivation.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/task/:taskId" element={<DesignReviewPage />} />
                <Route path="/activate/:token" element={<ClientActivation />} />
              </Routes>
            </ToastProvider>
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
