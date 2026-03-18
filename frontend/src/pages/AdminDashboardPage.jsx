import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, Server, Plus } from 'pixelarticons/react';
import { toast } from 'sonner';
import '../styles/pages/AdminDashboard.css';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newUserForm, setNewUserForm] = useState({ email: '', password: '', displayName: '', storageQuota: 5368709120 }); // 5GB
    
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await adminAPI.getUsers();
            setUsers(res.data);
        } catch (err) {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
        if (!emailRegex.test(newUserForm.email)) {
            toast.error("Please enter a valid email address format");
            return;
        }

        try {
            await adminAPI.createUser(newUserForm);
            toast.success("User created successfully");
            setNewUserForm({ email: '', password: '', displayName: '', storageQuota: 5368709120 });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data || "Failed to create user");
        }
    };

    const handleUpdateQuota = async (id, newQuota) => {
        try {
            await adminAPI.updateQuota(id, newQuota);
            toast.success("Quota updated successfully");
            fetchUsers();
        } catch (err) {
            toast.error("Failed to update quota");
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return <div>Loading Admin Dashboard...</div>;

    return (
        <div className="admin-dashboard container glass-card animate-fade-in-up">
            <header className="admin-header">
                <div className="admin-title">
                    <Server style={{ width: 24, height: 24 }} />
                    <h1>System Administration</h1>
                </div>
                <div className="admin-stats">
                    Total Users: {users.length}
                </div>
            </header>

            <div className="admin-grid">
                <div className="admin-card create-user-card">
                    <h2><Plus style={{ width: 18, height: 18 }} /> Create User</h2>
                    <form onSubmit={handleCreateUser} className="admin-form">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input required type="text" className="form-input" value={newUserForm.displayName} onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input required type="email" className="form-input" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input required type="password" className="form-input" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Storage Limit (MB)</label>
                            <input required type="number" className="form-input" value={newUserForm.storageQuota / 1048576} onChange={e => setNewUserForm({...newUserForm, storageQuota: e.target.value * 1048576})} />
                        </div>
                        <button type="submit" className="btn btn-primary"><Plus style={{ width: 16, height: 16 }} /> Create</button>
                    </form>
                </div>

                <div className="admin-card user-list-card">
                    <h2><Users style={{ width: 18, height: 18 }} /> Managed Users</h2>
                    <div className="user-table-wrapper">
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Usage</th>
                                    <th>Quota (MB)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.displayName}</td>
                                        <td>{u.email}</td>
                                        <td>{u.role}</td>
                                        <td>{formatBytes(u.usedStorage)} / {formatBytes(u.storageQuota)}</td>
                                        <td>
                                            <input 
                                                type="number" 
                                                className="form-input short-input" 
                                                defaultValue={u.storageQuota / 1048576}
                                                onBlur={(e) => {
                                                    if(e.target.value * 1048576 !== u.storageQuota) {
                                                        handleUpdateQuota(u.id, e.target.value * 1048576);
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>
                                            {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Managed'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
