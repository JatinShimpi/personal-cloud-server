import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI } from '../services/api';
import {
  Cloud, LogOut, Upload, Download, Trash2, File, FileText, FileImage,
  FileVideo, FileAudio, Archive, Code, HardDrive, RefreshCw, Search,
  UploadCloud, X, Loader2, FolderOpen, ScanSearch
} from 'lucide-react';
import toast from 'react-hot-toast';

// File icon mapper
function getFileIcon(contentType, size) {
  if (!contentType) return <File size={size} />;
  if (contentType.startsWith('image/')) return <FileImage size={size} />;
  if (contentType.startsWith('video/')) return <FileVideo size={size} />;
  if (contentType.startsWith('audio/')) return <FileAudio size={size} />;
  if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text'))
    return <FileText size={size} />;
  if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('compress'))
    return <Archive size={size} />;
  if (contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml'))
    return <Code size={size} />;
  return <File size={size} />;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    try {
      const response = await filesAPI.list();
      setFiles(response.data);
    } catch (err) {
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    for (const file of fileList) {
      setUploading(true);
      setUploadProgress(0);
      try {
        await filesAPI.upload(file, (progress) => setUploadProgress(progress));
        toast.success(`Uploaded "${file.name}"`);
      } catch (err) {
        toast.error(`Failed to upload "${file.name}": ${err.response?.data?.error || 'Unknown error'}`);
      }
    }
    setUploading(false);
    setUploadProgress(0);
    fetchFiles();
  };

  const handleDownload = async (id, filename) => {
    setDownloadingId(id);
    try {
      await filesAPI.download(id, filename);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await filesAPI.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success('File deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await filesAPI.scan();
      const count = response.data.newFiles;
      if (count > 0) {
        toast.success(`Found ${count} new file${count > 1 ? 's' : ''}`);
        fetchFiles();
      } else {
        toast('No new files found', { icon: '📂' });
      }
    } catch {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const filteredFiles = files.filter((f) =>
    f.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar glass-card">
        <div className="nav-left">
          <Cloud size={24} className="nav-logo-icon" />
          <span className="nav-title">Personal Cloud</span>
        </div>
        <div className="nav-right">
          <div className="nav-user">
            <div className="nav-avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</div>
            <span className="nav-username">{user?.displayName || user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">
            <LogOut size={16} />
            <span className="hide-mobile">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="stats-bar animate-fade-in-up">
        <div className="stat-card glass-card">
          <FolderOpen size={20} className="stat-icon" />
          <div>
            <div className="stat-value">{files.length}</div>
            <div className="stat-label">Files</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <HardDrive size={20} className="stat-icon" />
          <div>
            <div className="stat-value">{formatSize(totalSize)}</div>
            <div className="stat-label">Used</div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone glass-card animate-fade-in-up ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="upload-progress">
            <Loader2 size={32} className="spin" />
            <p>Uploading... {uploadProgress}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="upload-content">
            <UploadCloud size={40} strokeWidth={1.5} />
            <p className="upload-title">Drop files here or click to upload</p>
            <p className="upload-subtitle">Maximum file size: 100MB</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar animate-fade-in-up">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleScan} disabled={scanning} title="Scan for files on server (symlinked folders)">
          {scanning ? <Loader2 size={16} className="spin" /> : <ScanSearch size={16} />}
          <span className="hide-mobile">{scanning ? 'Scanning...' : 'Scan Server'}</span>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); fetchFiles(); }}>
          <RefreshCw size={16} />
          <span className="hide-mobile">Refresh</span>
        </button>
      </div>

      {/* File List */}
      <div className="file-list animate-fade-in-up">
        {loading ? (
          <div className="empty-state">
            <Loader2 size={40} className="spin" />
            <p>Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state glass-card">
            {searchQuery ? (
              <>
                <Search size={48} strokeWidth={1} />
                <h3>No results found</h3>
                <p>No files match "{searchQuery}"</p>
              </>
            ) : (
              <>
                <UploadCloud size={48} strokeWidth={1} />
                <h3>No files yet</h3>
                <p>Upload your first file to get started</p>
              </>
            )}
          </div>
        ) : (
          <div className="file-grid">
            {filteredFiles.map((file, index) => (
              <div
                key={file.id}
                className="file-card glass-card"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div className="file-icon-wrapper">
                  {getFileIcon(file.contentType, 28)}
                </div>
                <div className="file-info">
                  <h4 className="file-name" title={file.originalName}>
                    {file.originalName}
                  </h4>
                  <div className="file-meta">
                    <span>{formatSize(file.size)}</span>
                    <span className="meta-dot">·</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.originalName); }}
                    disabled={downloadingId === file.id}
                    title="Download"
                  >
                    {downloadingId === file.id
                      ? <Loader2 size={14} className="spin" />
                      : <Download size={14} />}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.originalName); }}
                    disabled={deletingId === file.id}
                    title="Delete"
                  >
                    {deletingId === file.id
                      ? <Loader2 size={14} className="spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dashboard {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          padding-bottom: 60px;
        }

        /* Navbar */
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          margin-bottom: 24px;
          position: sticky;
          top: 12px;
          z-index: 100;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-logo-icon {
          color: var(--accent-primary);
        }

        .nav-title {
          font-size: 1.1rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: white;
        }

        .nav-username {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* Stats */
        .stats-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          flex: 1;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .stat-icon {
          color: var(--accent-primary);
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Upload Zone */
        .upload-zone {
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-normal);
          margin-bottom: 20px;
          border: 2px dashed var(--border-subtle);
          background: transparent;
          box-shadow: none;
        }

        .upload-zone:hover {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.05);
        }

        .upload-zone.drag-active {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.1);
          transform: scale(1.01);
        }

        .upload-zone.uploading {
          cursor: default;
          border-color: var(--accent-primary);
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
        }

        .upload-content svg {
          color: var(--accent-primary);
          opacity: 0.7;
        }

        .upload-title {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .upload-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .upload-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--accent-primary);
        }

        .upload-progress p {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .progress-bar {
          width: 100%;
          max-width: 300px;
          height: 4px;
          background: rgba(99, 102, 241, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-gradient);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-box {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 10px 36px;
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 0.875rem;
          outline: none;
          transition: all var(--transition-normal);
        }

        .search-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
        }

        /* File Grid */
        .file-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .file-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          transition: all var(--transition-normal);
          animation: fadeInUp 0.4s ease both;
        }

        .file-card:hover {
          border-color: var(--border-medium);
          transform: translateX(4px);
        }

        .file-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .meta-dot {
          opacity: 0.5;
        }

        .file-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
          opacity: 0.6;
          transition: opacity var(--transition-fast);
        }

        .file-card:hover .file-actions {
          opacity: 1;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
          gap: 12px;
        }

        .empty-state h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .empty-state p {
          font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .dashboard {
            padding: 12px;
          }

          .navbar {
            top: 8px;
            padding: 10px 14px;
          }

          .nav-username,
          .hide-mobile {
            display: none;
          }

          .stats-bar {
            gap: 8px;
          }

          .stat-card {
            padding: 12px 14px;
          }

          .upload-zone {
            padding: 24px;
          }

          .file-card {
            padding: 10px 12px;
          }

          .file-icon-wrapper {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
