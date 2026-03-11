import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI, foldersAPI, systemAPI } from '../services/api';
import {
  Cloud, Logout as LogOut, Upload, Download, Delete as Trash2, File, FileText, Image as FileImage,
  Video as FileVideo, AudioWaveform as FileAudio, Archive, BracketsAngle as Code, Server as HardDrive, Reload as RefreshCw, Search,
  Cloud as UploadCloud, Cancel as X, Loader as Loader2, Folder as FolderOpen, ScanBarcode as ScanSearch,
  Users
} from 'pixelarticons/react';
import { toast } from 'sonner';
import '../styles/pages/DashboardPage.css';

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

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState('date'); // date, name, size
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [filterType, setFilterType] = useState('all');

  // View Mode & Settings
  const [viewMode, setViewMode] = useState('large'); // details, large, extra_large
  const [showThumbnails, setShowThumbnails] = useState(() => localStorage.getItem('skyvault_thumbnails') !== 'false');

  const handleToggleThumbnails = (e) => {
    const val = e.target.checked;
    setShowThumbnails(val);
    localStorage.setItem('skyvault_thumbnails', val);
  };

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
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" exceeds the 10GB limit.`);
        continue;
      }
      if (stats && file.size > stats.freeSpace) {
        toast.error(`Not enough free space on server to upload "${file.name}".`);
        continue;
      }

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

  const getMediaUrl = (id) => {
    const token = localStorage.getItem('token');
    return `/api/files/${id}/download?isPublic=${isPublic}&token=${token}`;
  };

  // --- Dynamic Filtering Options ---
  const availableTypes = useMemo(() => {
    const types = new Set(['all']);
    files.forEach(f => {
      if (!f.contentType) return;
      if (f.contentType.startsWith('image/')) types.add('image');
      else if (f.contentType.startsWith('video/')) types.add('video');
      else if (f.contentType.startsWith('audio/')) types.add('audio');
      else if (f.contentType.includes('pdf') || f.contentType.includes('document') || f.contentType.includes('text')) types.add('document');
      else if (f.contentType.includes('zip') || f.contentType.includes('compress') || f.contentType.includes('tar')) types.add('archive');
      else if (f.contentType.includes('json') || f.contentType.includes('javascript') || f.contentType.includes('xml')) types.add('code');
    });
    return Array.from(types);
  }, [files]);

  // Reset filter if switching generic folders to ensure consistency
  useEffect(() => {
    setFilterType('all');
  }, [currentFolderId, isPublic]);

  // --- Processing Data (Filter -> Search -> Sort) ---
  let processedFiles = files.filter((f) => f.originalName.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (filterType !== 'all') {
    processedFiles = processedFiles.filter(f => {
       if (!f.contentType) return false;
       if (filterType === 'image') return f.contentType.startsWith('image/');
       if (filterType === 'video') return f.contentType.startsWith('video/');
       if (filterType === 'audio') return f.contentType.startsWith('audio/');
       if (filterType === 'document') return f.contentType.includes('pdf') || f.contentType.includes('document') || f.contentType.includes('text');
       if (filterType === 'archive') return f.contentType.includes('zip') || f.contentType.includes('compress') || f.contentType.includes('tar');
       if (filterType === 'code') return f.contentType.includes('json') || f.contentType.includes('javascript') || f.contentType.includes('xml');
       return false;
    });
  }

  processedFiles.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.originalName.localeCompare(b.originalName);
    else if (sortBy === 'size') cmp = a.size - b.size;
    else if (sortBy === 'date') cmp = new Date(a.uploadedAt) - new Date(b.uploadedAt);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  let processedFolders = folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  if (filterType === 'all') {
     processedFolders.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortBy === 'date') cmp = new Date(a.createdAt) - new Date(b.createdAt);
        return sortOrder === 'asc' ? cmp : -cmp;
     });
  } else {
     // If user is searching specifically for a file type, don't show folders directly
     processedFolders = [];
  }

  const totalItemCount = processedFiles.length + processedFolders.length;

  return (
    <div className="dashboard-container">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
           <Cloud className="brand-icon" />
           <span className="brand-title">Skyvault</span>
           <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}><X style={{ width: 24, height: 24 }}/></button>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${!isPublic ? 'active' : ''}`} onClick={() => { switchTab(false); setIsSidebarOpen(false); }}>
            <HardDrive style={{ width: 18, height: 18 }} /> My Storage
          </button>
          <button className={`nav-item ${isPublic ? 'active' : ''}`} onClick={() => { switchTab(true); setIsSidebarOpen(false); }}>
            <Users style={{ width: 18, height: 18 }} /> Public Shared
          </button>
          
          <div style={{ flex: 1 }}></div>

          <button className="nav-item" onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          {/* Storage Gauge */}
          {stats && (
            <div className="storage-widget">
              <div className="storage-label">
                <span>Storage</span>
                <span>{formatSize(stats.usedSpace)} / {formatSize(stats.totalSpace)}</span>
              </div>
              <div className="storage-track">
                <div 
                   className="storage-fill" 
                   style={{ width: `${Math.min(100, (stats.usedSpace / stats.totalSpace) * 100)}%` }} 
                />
              </div>
              {!isPublic && (
                <div className="storage-user-usage">
                   My Data: {formatSize(stats.userUsage)}
                </div>
              )}
            </div>
          )}
          
          <div className="user-profile">
            <div className="avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user?.displayName || 'User'}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button className="btn-logout" onClick={logout} title="Sign Out">
               <LogOut style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header glass-card">
           <div className="header-left">
             <button className="mobile-menu-btn" onClick={toggleSidebar}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" /></svg>
             </button>
             <div className="search-box">
               <Search className="search-icon" style={{ width: 16, height: 16 }} />
               <input 
                 type="text" 
                 placeholder="Search files & folders..." 
                 className="search-input"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
               {searchQuery && (
                 <button className="search-clear" onClick={() => setSearchQuery('')}>
                   <X style={{ width: 14, height: 14 }} />
                 </button>
               )}
             </div>
           </div>
           
            <div className="header-right">
              <div className="view-mode-toggles hide-mobile">
                 <button className={`btn-icon ${viewMode === 'details' ? 'active' : ''}`} onClick={() => setViewMode('details')} title="Details View">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
                 </button>
                 <button className={`btn-icon ${viewMode === 'large' ? 'active' : ''}`} onClick={() => setViewMode('large')} title="Large Icons">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect></svg>
                 </button>
                 <button className={`btn-icon ${viewMode === 'extra_large' ? 'active' : ''}`} onClick={() => setViewMode('extra_large')} title="Extra Large Icons">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                 </button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleScanDirectory} disabled={scanning} title="Sync files from server PC">
               {scanning ? <Loader2 style={{ width: 16, height: 16 }} className="spin" /> : <RefreshCw style={{ width: 16, height: 16 }} />}
               <span className="hide-mobile">Sync Server</span>
             </button>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="main-scroll-area">
          <div className="content-toolbar">
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

            {/* Sorting and Filtering Controls */}
            <div className="toolbar-controls">
              <div className="control-group hide-mobile">
                <span className="control-label">Type:</span>
                <select className="sort-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Files' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="control-group">
                <span className="control-label hide-mobile">Sort:</span>
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Date Uploaded</option>
                  <option value="name">File Name</option>
                  <option value="size">File Size</option>
                </select>
                <select className="sort-select" style={{ marginLeft: '4px' }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">{sortBy === 'name' ? 'Z-A' : 'Desc'}</option>
                  <option value="asc">{sortBy === 'name' ? 'A-Z' : 'Asc'}</option>
                </select>
              </div>
            </div>

            <div className="toolbar-actions">
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Limit: 10GB</span>
               <button className="btn btn-primary" onClick={() => setCreatingFolder(!creatingFolder)}>
                 {creatingFolder ? 'Cancel' : 'New Folder'}
               </button>
               <button className="btn btn-ghost empty-btn" onClick={() => !uploading && fileInputRef.current?.click()} style={{ border: '1px solid var(--border-color)' }}>
                 <UploadCloud style={{ width: 16, height: 16 }} />
                 <span className="hide-mobile">Upload File</span>
               </button>
               <input
                 ref={fileInputRef}
                 type="file"
                 multiple
                 onChange={(e) => handleUpload(e.target.files)}
                 style={{ display: 'none' }}
               />
            </div>
          </div>

          {creatingFolder && (
            <form className="new-folder-form glass-card animate-fade-in-up" onSubmit={handleCreateFolder}>
              <FolderOpen style={{ width: 22, height: 22, color: 'var(--accent-primary)' }} />
              <input
                autoFocus
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="new-folder-input"
              />
              <button type="submit" className="btn btn-primary btn-sm">Create Folder</button>
            </form>
          )}

          {uploading && (
             <div className="upload-progress-banner glass-card animate-fade-in-up">
                <div className="upload-progress-info">
                   <Loader2 style={{ width: 20, height: 20 }} className="spin" />
                   <span>Uploading files... {uploadProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
             </div>
          )}

          <div
            className={`file-grid-container ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
             {dragActive && (
               <div className="dropzone-overlay">
                 <UploadCloud className="empty-icon" />
                 <h3>Drop files to upload</h3>
               </div>
             )}

             {loading ? (
                <div className="empty-state">
                  <Loader2 style={{ width: 48, height: 48 }} className="spin" />
                  <p>Loading your files...</p>
                </div>
             ) : totalItemCount === 0 ? (
                <div className="empty-state">
                  {searchQuery ? (
                    <>
                      <Search className="empty-icon" />
                      <h3>No results found</h3>
                      <p>Try searching for a different term.</p>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="empty-icon" />
                      <h3>This folder is empty</h3>
                      <p>Drag and drop files here or click Upload File.</p>
                    </>
                  )}
                </div>
             ) : (
                <div className={`file-grid view-${viewMode}`}>
                  {/* Folders */}
                  {processedFolders.map((folder, index) => (
                    <div
                      key={`folder-${folder.id}`}
                      className={`file-card folder-card glass-card view-${viewMode}`}
                      style={{ animationDelay: `${index * 0.04}s` }}
                      onClick={() => navigateToFolder(folder)}
                    >
                      <div className="file-icon-wrapper">
                        <FolderOpen style={{ width: 24, height: 24 }} />
                      </div>
                      <div className={viewMode === 'details' ? 'file-info list-layout' : 'file-info'}>
                        {viewMode === 'details' ? (
                          <>
                            <div className="list-col-name"><h4 title={folder.name}>{folder.name}</h4></div>
                            <div className="list-col-size">-</div>
                            <div className="list-col-date">{formatDate(folder.createdAt)}</div>
                            <div className="list-col-type">Folder</div>
                          </>
                        ) : (
                          <>
                            <h4 className="file-name" title={folder.name}>{folder.name}</h4>
                            <div className="file-meta">
                              <span>{formatDate(folder.createdAt)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="file-actions">
                        <button
                          className="btn-action danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                          title="Delete Folder"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Files */}
                  {processedFiles.map((file, index) => {
                    const isMedia = file.contentType?.startsWith('image/') || file.contentType?.startsWith('video/');
                     return (
                      <div
                        key={`file-${file.id}`}
                        className={`file-card file-card-data glass-card view-${viewMode}`}
                        style={{ animationDelay: `${(index + processedFolders.length) * 0.04}s` }}
                      >
                        <div className="file-icon-wrapper">
                          {(isMedia && showThumbnails && (viewMode === 'large' || viewMode === 'extra_large')) ? (
                            file.contentType.startsWith('video/') ? (
                              <video src={getMediaUrl(file.id)} className="file-thumbnail" muted loop onMouseOver={e=>e.target.play()} onMouseOut={e=>e.target.pause()} />
                            ) : (
                              <img src={getMediaUrl(file.id)} alt={file.originalName} className="file-thumbnail" loading="lazy" />
                            )
                          ) : (
                            getFileIcon(file.contentType, viewMode === 'extra_large' ? 48 : 24)
                          )}
                        </div>
                        <div className={viewMode === 'details' ? 'file-info list-layout' : 'file-info'}>
                          {viewMode === 'details' ? (
                            <>
                              <div className="list-col-name"><h4 title={file.originalName}>{file.originalName}</h4></div>
                              <div className="list-col-size">{formatSize(file.size)}</div>
                              <div className="list-col-date">{formatDate(file.uploadedAt)}</div>
                              <div className="list-col-type" title={file.contentType}>{file.contentType?.split('/')[1] || 'File'}</div>
                            </>
                          ) : (
                            <>
                              <h4 className="file-name" title={file.originalName}>{file.originalName}</h4>
                              <div className="file-meta">
                                <span>{formatSize(file.size)}</span>
                                <span className="meta-dot">·</span>
                                <span>{formatDate(file.uploadedAt)}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="file-actions">
                        <button
                          className="btn-action ghost"
                          onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.originalName); }}
                          disabled={downloadingId === file.id}
                          title="Download"
                        >
                          {downloadingId === file.id
                            ? <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                            : <Download style={{ width: 14, height: 14 }} />}
                        </button>
                        <button
                          className="btn-action danger"
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
                  )})}
                </div>
             )}
          </div>
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

        {showSettings && (
          <div className="modal-backdrop animate-fade-in-up" onClick={() => setShowSettings(false)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>Dashboard Settings</h3>
              
              <div className="settings-section">
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Display Preferences</h4>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <input 
                     type="checkbox" 
                     checked={showThumbnails} 
                     onChange={handleToggleThumbnails}
                     style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Show Media Thumbnails</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Render images and videos securely directly in grid views.</div>
                  </div>
                </label>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button className="btn btn-primary" onClick={() => setShowSettings(false)}>Done</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
