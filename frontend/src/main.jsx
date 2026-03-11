import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './styles/variables.css'
import './styles/base.css'
import './styles/components/buttons.css'
import './styles/components/cards.css'
import './styles/components/forms.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
                <Toaster position="top-right" theme="dark" richColors />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
