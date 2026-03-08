import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
};

// Files API
export const filesAPI = {
    list: (folderId, isPublic) => api.get('/files', { params: { folderId, isPublic } }),
    upload: (file, folderId, isPublic, overwrite, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/files/upload', formData, {
            params: { folderId, isPublic, overwrite },
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });
    },
    download: async (id, filename, isPublic) => {
        const response = await api.get(`/files/${id}/download`, {
            params: { isPublic },
            responseType: 'blob',
        });
        // Trigger browser download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
    delete: (id, isPublic) => api.delete(`/files/${id}`, { params: { isPublic } }),
    scan: () => api.post('/files/scan'),
};

export const foldersAPI = {
    list: (parentId, isPublic) => api.get('/folders', { params: { parentId, isPublic } }),
    create: (name, parentId, isPublic) => api.post('/folders', { name, parentId, isPublic }),
    delete: (id, isPublic) => api.delete(`/folders/${id}`, { params: { isPublic } })
};

export const systemAPI = {
    getStorageStats: () => api.get('/system/storage')
};

export default api;
