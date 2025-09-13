import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  File, 
  Download, 
  Calendar,
  HardDrive,
  Search,
  Filter,
  Grid,
  List,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadService } from '../services/apiService';
import toast from 'react-hot-toast';

interface Download {
  id: string;
  url: string;
  title: string;
  filename: string;
  size: number;
  size_formatted: string;
  channel: string;
  source: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  timestamp?: string;
}

interface FolderStructure {
  [key: string]: {
    files: Download[];
    subfolders: { [key: string]: any };
  };
}

const DownloadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'downloading' | 'failed'>('all');

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      const response = await downloadService.getDownloads();
      if (response.success) {
        setDownloads(response.data);
        organizeIntoFolders(response.data);
      }
    } catch (error) {
      console.error('Error fetching downloads:', error);
      toast.error('Failed to fetch downloads');
    }
  };

  const organizeIntoFolders = (downloads: Download[]) => {
    const structure: FolderStructure = {};
    
    downloads.forEach(download => {
      // Extract date from createdAt or completedAt
      const date = new Date(download.completedAt || download.createdAt);
      const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!structure[dateFolder]) {
        structure[dateFolder] = {
          files: [],
          subfolders: {}
        };
      }
      
      // Group by source (youtube, discord, etc.)
      const sourceFolder = download.source || 'unknown';
      if (!structure[dateFolder].subfolders[sourceFolder]) {
        structure[dateFolder].subfolders[sourceFolder] = {
          files: [],
          subfolders: {}
        };
      }
      
      structure[dateFolder].subfolders[sourceFolder].files.push(download);
    });
    
    setFolderStructure(structure);
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/30"></div>;
      case 'downloading':
        return <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/30"></div>;
      case 'failed':
        return <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/30"></div>;
      default:
        return <div className="w-3 h-3 bg-slate-400 rounded-full"></div>;
    }
  };

  const filteredDownloads = downloads.filter(download => {
    const matchesSearch = download.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         download.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || download.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderFolder = (folderPath: string, folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folderPath);
    const hasContent = folder.files.length > 0 || Object.keys(folder.subfolders).length > 0;
    
    return (
      <div key={folderPath} className="select-none">
        <div 
          className={`flex items-center py-3 px-4 hover:bg-slate-700/30 cursor-pointer rounded-lg transition-colors ${
            level === 0 ? 'font-semibold' : 'font-medium'
          }`}
          style={{ paddingLeft: `${level * 20 + 16}px` }}
          onClick={() => hasContent && toggleFolder(folderPath)}
        >
          {hasContent && (
            <div className="mr-3">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
          )}
          <Folder className="w-5 h-5 text-blue-400 mr-3" />
          <span className="text-white">
            {folderPath.split('/').pop()}
            {folder.files.length > 0 && (
              <span className="text-slate-400 ml-2">({folder.files.length})</span>
            )}
          </span>
        </div>
        
        {isExpanded && (
          <div>
            {/* Render files in this folder */}
            {folder.files.map((file: Download) => (
              <div 
                key={file.id}
                className="flex items-center py-3 px-4 hover:bg-slate-700/20 rounded-lg transition-colors"
                style={{ paddingLeft: `${(level + 1) * 20 + 16}px` }}
              >
                <File className="w-5 h-5 text-slate-400 mr-4" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file.status)}
                    <span className="text-sm font-medium text-white truncate">
                      {file.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {file.size_formatted} • {file.channel} • {new Date(file.completedAt || file.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Render subfolders */}
            {Object.entries(folder.subfolders).map(([subfolderName, subfolder]) => 
              renderFolder(`${folderPath}/${subfolderName}`, subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-600"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-white">All Downloads</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search downloads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="downloading">Downloading</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {Object.keys(folderStructure).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No downloads yet</h3>
            <p className="text-slate-400">Start downloading videos from Discord to see them here</p>
          </div>
        ) : (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Downloads by Date</h2>
                <div className="text-sm text-slate-400">
                  {downloads.length} total downloads
                </div>
              </div>
              
              <div className="space-y-1">
                {Object.entries(folderStructure)
                  .sort(([a], [b]) => b.localeCompare(a)) // Sort by date, newest first
                  .map(([dateFolder, folder]) => 
                    renderFolder(dateFolder, folder)
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;


