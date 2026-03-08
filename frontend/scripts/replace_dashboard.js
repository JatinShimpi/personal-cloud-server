const fs = require('fs');
let code = fs.readFileSync('src/pages/DashboardPage.jsx', 'utf8');

const targetImportLines = [
    "import {",
    "  Cloud, LogOut, Upload, Download, Trash2, File, FileText, FileImage,",
    "  FileVideo, FileAudio, Archive, Code, HardDrive, RefreshCw, Search,",
    "  UploadCloud, X, Loader2, FolderOpen, ScanSearch",
    "} from 'lucide-react';",
    "import toast from 'react-hot-toast';"
].join('\n');

const replaceImportLines = [
    "import {",
    "  Cloud, Logout as LogOut, Upload, Download, Delete as Trash2, File, FileText, Image as FileImage,",
    "  Video as FileVideo, AudioWaveform as FileAudio, Archive, BracketsAngle as Code, Server as HardDrive, Reload as RefreshCw, Search,",
    "  Cloud as UploadCloud, Cancel as X, Loader as Loader2, Folder as FolderOpen, ScanBarcode as ScanSearch",
    "} from 'pixelarticons/react';",
    "import { toast } from 'sonner';"
].join('\n');

code = code.replace(targetImportLines, replaceImportLines);
// Also fallback in case the exact line match fails (newline differences)
if (code.includes('lucide-react')) {
    code = code.replace(/import \{[\s\S]*?\} from 'lucide-react';/, replaceImportLines.split('\n').slice(0, 5).join('\n'));
    code = code.replace(/import toast from 'react-hot-toast';/, "import { toast } from 'sonner';");
}

code = code.replace(/size=\{([0-9]+)\}/g, "style={{ width: $1, height: $1 }}");
code = code.replace(/ strokeWidth=\{[0-9.]+\}/g, '');

fs.writeFileSync('src/pages/DashboardPage.jsx', code);
console.log('Replacement complete.');
