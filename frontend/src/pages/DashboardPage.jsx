import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI, foldersAPI, systemAPI } from '../services/api';
import {
  Cloud, Logout as LogOut, Upload, Download, Delete as Trash2, File, FileText, Image as FileImage,
  Video as FileVideo, AudioWaveform as FileAudio, Archive, BracketsAngle as Code, Server as HardDrive, Reload as RefreshCw, Search,
  Cloud as UploadCloud, Cancel as X, Loader as Loader2, Folder as FolderOpen, ScanBarcode as ScanSearch,
  Users
} from 'pixelarticons/react';
import { toast } from 'sonner';

// File icon mapper
function getFileIcon(contentType, size) {
  if (!contentType) return <File style={{ width: size, height: size }} />;
  if (contentType.startsWith('image/')) return <FileImage style={{ width: size, height: size }} />;
  if (contentType.startsWith('video/')) return <FileVideo style={{ width: size, height: size }} />;
  if (contentType.startsWith('audio/')) return <FileAudio style={{ width: size, height: size }} />;
  if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text'))
    return <FileText style={{ width: size, height: size }} />;
  if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('compress'))
    return <Archive style={{ width: size, height: size }} />;
  if (contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml'))
    return <Code style={{ width: size, height: size }} />;
  return <File style={{ width: size, height: size }} />;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
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
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [conflictPrompt, setConflictPrompt] = useState(null);

  // Navigation State
  const [isPublic, setIsPublic] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  // Folder Creation State
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes, statsRes] = await Promise.all([
        filesAPI.list(currentFolderId, isPublic),
        foldersAPI.list(currentFolderId, isPublic),
        systemAPI.getStorageStats()
      ]);
      setFiles(filesRes.data);
      setFolders(foldersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, isPublic]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (fileList, overwrite = false, customFile = null) => {
    if ((!fileList || fileList.length === 0) && !customFile) return;

    const filesToUpload = customFile ? [customFile] : Array.from(fileList);

    for (const file of filesToUpload) {
      setUploading(true);
      setUploadProgress(0);
      try {
        await filesAPI.upload(file, currentFolderId, isPublic, overwrite, (progress) => setUploadProgress(progress));
        toast.success(`Uploaded "${file.name}"`);
      } catch (err) {
        if (err.response?.status === 409) {
          // File conflict, halt and show prompt
          setUploading(false);
          setConflictPrompt({
            file: file,
            originalName: file.name
          });
          return; // Stop queue for now
        } else {
          toast.error(`Failed to upload "${file.name}": ${err.response?.data?.error || 'Unknown error'}`);
        }
      }
    }
    setUploading(false);
    setUploadProgress(0);
    fetchData();
  };

  const handleResolveConflict = (resolution) => {
    const { file, originalName } = conflictPrompt;
    setConflictPrompt(null);

    if (resolution === 'replace') {
      handleUpload(null, true, file);
    } else if (resolution === 'keep_both') {
      // Rename file by appending (1) to the base name
      const dotIndex = originalName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
      const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : '';

      const newName = `${baseName} (1)${ext}`;
      const renamedFile = new File([file], newName, { type: file.type });

      handleUpload(null, false, renamedFile);
    }
  };

  const handleScanDirectory = async () => {
    setScanning(true);
    try {
      const res = await filesAPI.scan();
      if (res.data.newFiles > 0) {
        toast.success(`Server sync complete. Found ${res.data.newFiles} new files.`);
        fetchData();
      } else {
        toast.info('Server sync complete. No new files found.');
      }
    } catch (err) {
      toast.error('Failed to sync server directories');
    } finally {
      setScanning(false);
    }
  };

  const handleDownload = async (id, filename) => {
    setDownloadingId(id);
    try {
      await filesAPI.download(id, filename, isPublic);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteFile = async (id, filename) => {
    if (!confirm(`Delete file "${filename}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await filesAPI.delete(id, isPublic);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success('File deleted');
      // Refresh stats
      systemAPI.getStorageStats().then(res => setStats(res.data));
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await foldersAPI.create(newFolderName, currentFolderId, isPublic);
      toast.success('Folder created');
      setNewFolderName('');
      setCreatingFolder(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (id, name) => {
    if (!confirm(`Delete folder "${name}"? Only empty folders can be safely deleted or API will handle cascade.`)) return;
    try {
      await foldersAPI.delete(id, isPublic);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      toast.success('Folder deleted');
    } catch {
      toast.error('Delete failed. Ensure folder is empty.');
    }
  };

  const navigateToFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setCurrentFolderId(newPath[newPath.length - 1].id);
      setFolderPath(newPath);
    }
  };

  const switchTab = (toPublic) => {
    setIsPublic(toPublic);
    setCurrentFolderId(null);
    setFolderPath([]);
    setSearchQuery('');
  };

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

  const filteredFiles = files.filter((f) => f.originalName.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalItemCount = files.length + folders.length;

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar glass-card">
        <div className="nav-left">
          <Cloud style={{ width: 24, height: 24 }} className="nav-logo-icon" />
          <span className="nav-title">Skyvault</span>
        </div>
        <div className="nav-right">
          <div className="nav-user">
            <div className="nav-avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</div>
            <span className="nav-username">{user?.displayName || user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">
            <LogOut style={{ width: 16, height: 16 }} />
            <span className="hide-mobile">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="tabs animate-fade-in-up">
        <button className={`tab-btn ${!isPublic ? 'active' : ''}`} onClick={() => switchTab(false)}>
          <HardDrive style={{ width: 16, height: 16 }} /> My Storage
        </button>
        <button className={`tab-btn ${isPublic ? 'active' : ''}`} onClick={() => switchTab(true)}>
          <Users style={{ width: 16, height: 16 }} /> Public Shared
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar animate-fade-in-up">
        <div className="stat-card glass-card">
          <HardDrive style={{ width: 20, height: 20 }} className="stat-icon" />
          <div>
            <div className="stat-value">{stats ? formatSize(stats.usedSpace) : '...'}</div>
            <div className="stat-label">Server Used / {stats ? formatSize(stats.totalSpace) : '...'}</div>
          </div>
        </div>
        {!isPublic && (
          <div className="stat-card glass-card">
            <FolderOpen style={{ width: 20, height: 20 }} className="stat-icon" />
            <div>
              <div className="stat-value">{stats ? formatSize(stats.userUsage) : '...'}</div>
              <div className="stat-label">My Data Usage</div>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumbs & Actions */}
      <div className="breadcrumb-row animate-fade-in-up">
        <div className="breadcrumbs">
          <span className="crumb" onClick={() => navigateToBreadcrumb(-1)}>
            {isPublic ? 'Public Root' : 'My Root'}
          </span>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="crumb-separator">/</span>
              <span className="crumb" onClick={() => navigateToBreadcrumb(index)}>
                {folder.name}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleScanDirectory} disabled={scanning} title="Sync files from server PC">
            {scanning ? <Loader2 style={{ width: 16, height: 16 }} className="spin" /> : <HardDrive style={{ width: 16, height: 16 }} />}
            <span className="hide-mobile">Sync Server</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setCreatingFolder(!creatingFolder)}>
            {creatingFolder ? 'Cancel' : 'New Folder'}
          </button>
        </div>
      </div>

      {creatingFolder && (
        <form className="new-folder-form animate-fade-in-up glass-card" onSubmit={handleCreateFolder}>
          <input
            autoFocus
            type="text"
            placeholder="Folder Name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary btn-sm">Create</button>
        </form>
      )}

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
            <Loader2 style={{ width: 32, height: 32 }} className="spin" />
            <p>Uploading... {uploadProgress}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="upload-content">
            <UploadCloud style={{ width: 40, height: 40 }} />
            <p className="upload-title">Drop files into {folderPath.length ? folderPath[folderPath.length - 1].name : (isPublic ? 'Public Root' : 'My Root')}</p>
            <p className="upload-subtitle">Maximum file size: 100MB</p>
          </div>
        )}
      </div>

      {conflictPrompt && (
        <div className="modal-backdrop animate-fade-in-up">
          <div className="modal-content glass-card">
            <h3>File Already Exists</h3>
            <p>A file named <strong>{conflictPrompt.originalName}</strong> already exists in this folder.</p>
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={() => handleResolveConflict('replace')}>Replace File</button>
              <button className="btn btn-ghost" onClick={() => handleResolveConflict('keep_both')} style={{ border: '1px solid var(--border-medium)' }}>Keep Both</button>
              <button className="btn btn-danger" onClick={() => setConflictPrompt(null)} style={{ marginLeft: 'auto' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar animate-fade-in-up">
        <div className="search-box">
          <Search style={{ width: 16, height: 16 }} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search files & folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}>
          <RefreshCw style={{ width: 16, height: 16 }} />
          <span className="hide-mobile">Refresh</span>
        </button>
      </div>

      {/* Item List */}
      <div className="file-list animate-fade-in-up">
        {loading ? (
          <div className="empty-state">
            <Loader2 style={{ width: 40, height: 40 }} className="spin" />
            <p>Loading items...</p>
          </div>
        ) : (filteredFiles.length === 0 && filteredFolders.length === 0) ? (
          <div className="empty-state glass-card">
            {searchQuery ? (
              <>
                <Search style={{ width: 48, height: 48 }} />
                <h3>No results found</h3>
              </>
            ) : (
              <>
                <FolderOpen style={{ width: 48, height: 48 }} />
                <h3>This folder is empty</h3>
              </>
            )}
          </div>
        ) : (
          <div className="file-grid">
            {/* Render Folders First */}
            {filteredFolders.map((folder, index) => (
              <div
                key={`folder-${folder.id}`}
                className="file-card glass-card folder-card"
                style={{ animationDelay: `${index * 0.04}s`, cursor: 'pointer' }}
                onClick={() => navigateToFolder(folder)}
              >
                <div className="file-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                  <FolderOpen style={{ width: 28, height: 28 }} />
                </div>
                <div className="file-info">
                  <h4 className="file-name" title={folder.name}>
                    {folder.name}
                  </h4>
                  <div className="file-meta">
                    <span>Folder</span>
                    <span className="meta-dot">·</span>
                    <span>{formatDate(folder.createdAt)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                    title="Delete Folder"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}

            {/* Render Files */}
            {filteredFiles.map((file, index) => (
              <div
                key={`file-${file.id}`}
                className="file-card glass-card"
                style={{ animationDelay: `${(index + filteredFolders.length) * 0.04}s` }}
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
                      ? <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                      : <Download style={{ width: 14, height: 14 }} />}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.originalName); }}
                    disabled={deletingId === file.id}
                    title="Delete"
                  >
                    {deletingId === file.id
                      ? <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                      : <Trash2 style={{ width: 14, height: 14 }} />}
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

        .nav-left { display: flex; align-items: center; gap: 10px; }
        .nav-logo-icon { color: var(--accent-primary); }
        .nav-title {
          font-size: 1.1rem; font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-user { display: flex; align-items: center; gap: 8px; }
        .nav-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--accent-gradient); display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; color: white;
        }
        .nav-username { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }

        .tabs {
          display: flex; gap: 8px; margin-bottom: 20px;
        }
        .tab-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
          background: var(--bg-glass); cursor: pointer; color: var(--text-muted);
          font-family: inherit; font-size: 0.9rem; font-weight: 600;
          transition: all var(--transition-normal); backdrop-filter: blur(8px);
        }
        .tab-btn:hover { background: rgba(255, 255, 255, 0.05); }
        .tab-btn.active {
          background: rgba(99, 102, 241, 0.1); border-color: var(--accent-primary); color: var(--accent-primary);
        }

        .stats-bar { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-card {
          flex: 1; padding: 16px 20px; display: flex; align-items: center; gap: 14px;
        }
        .stat-icon { color: var(--accent-primary); }
        .stat-value { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
        .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        .breadcrumb-row {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
        }
        .breadcrumbs {
          display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 600;
          overflow-x: auto; white-space: nowrap; flex: 1; padding-right: 12px;
        }
        .crumb { cursor: pointer; color: var(--text-muted); transition: color var(--transition-fast); }
        .crumb:hover { color: var(--accent-primary); }
        .breadcrumbs .crumb:last-child { color: var(--text-primary); cursor: default; }
        .crumb-separator { color: var(--border-medium); font-size: 0.9rem; }

        .new-folder-form {
          display: flex; gap: 8px; padding: 12px; margin-bottom: 16px; align-items: center; border-radius: var(--radius-sm);
        }

        .upload-zone {
          padding: 40px; text-align: center; cursor: pointer; transition: all var(--transition-normal);
          margin-bottom: 20px; border: 2px dashed var(--border-subtle); background: transparent; box-shadow: none;
        }
        .upload-zone:hover, .upload-zone.drag-active {
          border-color: var(--accent-primary); background: rgba(99, 102, 241, 0.05);
        }
        .upload-zone.uploading { cursor: default; border-color: var(--accent-primary); }
        .upload-content { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-muted); }
        .upload-content svg { color: var(--accent-primary); opacity: 0.7; }
        .upload-title { font-size: 0.95rem; font-weight: 500; color: var(--text-secondary); }
        .upload-subtitle { font-size: 0.8rem; color: var(--text-muted); }

        .upload-progress { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--accent-primary); }
        .upload-progress p { font-size: 0.9rem; font-weight: 500; }
        .spin { animation: spin 1s linear infinite; }
        .progress-bar { width: 100%; max-width: 300px; height: 4px; background: rgba(99, 102, 241, 0.15); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent-gradient); border-radius: 2px; transition: width 0.3s ease; }

        .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .search-box { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input {
          width: 100%; padding: 10px 36px; background: var(--bg-glass); backdrop-filter: blur(12px);
          border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-primary);
          font-family: inherit; font-size: 0.875rem; outline: none; transition: all var(--transition-normal);
        }
        .search-input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; }

        .file-grid { display: flex; flex-direction: column; gap: 8px; }
        .file-card {
          display: flex; align-items: center; gap: 14px; padding: 14px 18px; transition: all var(--transition-normal); animation: fadeInUp 0.4s ease both;
        }
        .file-card:hover { border-color: var(--border-medium); transform: translateX(4px); }
        .folder-card:hover { background: rgba(99, 102, 241, 0.03); }
        
        .file-icon-wrapper {
          display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;
          border-radius: var(--radius-sm); background: rgba(99, 102, 241, 0.1); color: var(--accent-primary); flex-shrink: 0;
        }
        .file-info { flex: 1; min-width: 0; }
        .file-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-meta { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .meta-dot { opacity: 0.5; }
        .file-actions { display: flex; gap: 6px; flex-shrink: 0; opacity: 0.6; transition: opacity var(--transition-fast); }
        .file-card:hover .file-actions { opacity: 1; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); gap: 12px;
        }
        .empty-state h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin: 0; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .dashboard { padding: 12px; }
          .navbar { top: 8px; padding: 10px 14px; }
          .nav-username, .hide-mobile { display: none; }
          .stats-bar { gap: 8px; }
          .stat-card { padding: 12px 14px; }
          .upload-zone { padding: 24px; }
          .file-card { padding: 10px 12px; }
          .file-icon-wrapper { width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
}
