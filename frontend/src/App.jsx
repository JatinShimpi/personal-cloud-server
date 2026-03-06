import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route
                path="/register"
                element={user ? <Navigate to="/" replace /> : <RegisterPage />}
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
