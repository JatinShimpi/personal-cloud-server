import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: 'rgba(30, 30, 46, 0.95)',
                            color: '#cdd6f4',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            backdropFilter: 'blur(12px)',
                            fontFamily: "'Inter', sans-serif",
                        },
                        success: {
                            iconTheme: { primary: '#a6e3a1', secondary: '#1e1e2e' },
                        },
                        error: {
                            iconTheme: { primary: '#f38ba8', secondary: '#1e1e2e' },
                        },
                    }}
                />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
