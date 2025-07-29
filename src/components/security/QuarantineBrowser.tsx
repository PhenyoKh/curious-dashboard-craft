/**
 * Quarantine File Browser Component
 * Visual interface for managing quarantined files with advanced filtering
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Shield,
  FileX,
  Eye,
  Calendar,
  FileText,
  Image,
  Archive,
  CheckSquare,
  Square,
  MoreHorizontal,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuarantine } from '@/hooks/useQuarantine';
import { ThreatType } from '@/lib/security/FileSecurityValidator';
import type { QuarantinedFile } from '@/lib/security/QuarantineManager';

interface QuarantineBrowserProps {
  className?: string;
}

type SortField = 'name' | 'size' | 'date' | 'threats';
type SortOrder = 'asc' | 'desc';

const QuarantineBrowser: React.FC<QuarantineBrowserProps> = ({ className = '' }) => {
  const {
    files,
    stats,
    totalFiles,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    selectedFiles,
    selectedCount,
    canRestoreSelected,
    loadMore,
    refresh,
    restoreFile,
    deleteFile,
    bulkDeleteFiles,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection
  } = useQuarantine({ autoRefresh: true });

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState<ThreatType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFileDetails, setShowFileDetails] = useState<QuarantinedFile | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'restore' | 'delete' | 'bulk-delete';
    files: QuarantinedFile[];
  } | null>(null);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    const filtered = files.filter(file => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!file.original_filename.toLowerCase().includes(query) &&
            !file.quarantine_reason.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Threat type filter
      if (threatFilter !== 'all') {
        if (!file.threats.some(threat => threat.type === threatFilter)) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'all') {
        if (!file.threats.some(threat => threat.severity === severityFilter)) {
          return false;
        }
      }

      return true;
    });

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.original_filename.localeCompare(b.original_filename);
          break;
        case 'size':
          comparison = a.file_size - b.file_size;
          break;
        case 'date':
          comparison = new Date(a.quarantined_at).getTime() - new Date(b.quarantined_at).getTime();
          break;
        case 'threats':
          comparison = a.threats.length - b.threats.length;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchQuery, threatFilter, severityFilter, sortField, sortOrder]);

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileIcon = (filename: string, mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <Archive className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getThreatBadgeColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleBulkAction = async (action: 'restore' | 'delete') => {
    const selectedFileObjects = files.filter(f => selectedFiles.has(f.id));
    
    if (selectedFileObjects.length === 0) return;

    if (action === 'delete') {
      setConfirmAction({ type: 'bulk-delete', files: selectedFileObjects });
    } else {
      // For restore, we need to implement bulk restore
      for (const file of selectedFileObjects) {
        if (file.can_restore) {
          await restoreFile(file.id);
        }
      }
      clearSelection();
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'bulk-delete') {
        await bulkDeleteFiles(confirmAction.files.map(f => f.id));
      } else if (confirmAction.type === 'delete') {
        await deleteFile(confirmAction.files[0].id);
      } else if (confirmAction.type === 'restore') {
        await restoreFile(confirmAction.files[0].id);
      }
      
      clearSelection();
    } finally {
      setConfirmAction(null);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quarantine Browser</h2>
          <p className="text-gray-600">
            {totalFiles} files quarantined • {stats ? formatFileSize(stats.total_size) : '0 B'} total
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Threat Type</label>
              <Select value={threatFilter} onValueChange={(value: ThreatType | 'all') => setThreatFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dangerous_extension">Dangerous Extension</SelectItem>
                  <SelectItem value="disguised_executable">Disguised Executable</SelectItem>
                  <SelectItem value="script_injection">Script Injection</SelectItem>
                  <SelectItem value="zip_bomb">ZIP Bomb</SelectItem>
                  <SelectItem value="malicious_polyglot">Malicious Polyglot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={(value: typeof severityFilter) => setSeverityFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="size-desc">Size (Largest)</SelectItem>
                  <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                  <SelectItem value="threats-desc">Most Threats</SelectItem>
                  <SelectItem value="threats-asc">Least Threats</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-blue-900">
                  {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-700 border-blue-300"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex space-x-2">
                {canRestoreSelected && (
                  <Button
                    onClick={() => handleBulkAction('restore')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore Selected
                  </Button>
                )}
                <Button
                  onClick={() => handleBulkAction('delete')}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Quarantined Files ({filteredFiles.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedCount === filteredFiles.length && filteredFiles.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    selectAllFiles();
                  } else {
                    clearSelection();
                  }
                }}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileX className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quarantined files</h3>
              <p className="mt-1 text-sm text-gray-500">
                {files.length === 0 ? "Great! No security threats detected." : "No files match your current filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-700">
                <div className="col-span-1"></div>
                <div 
                  className="col-span-4 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('name')}
                >
                  Name {getSortIcon('name')}
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('size')}
                >
                  Size {getSortIcon('size')}
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('threats')}
                >
                  Threats {getSortIcon('threats')}
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('date')}
                >
                  Quarantined {getSortIcon('date')}
                </div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* File Rows */}
              {filteredFiles.map((file) => (
                <div key={file.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50">
                  <div className="col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />
                  </div>
                  
                  <div className="col-span-4 flex items-center space-x-3">
                    {getFileIcon(file.original_filename, file.mime_type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original_filename}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {file.mime_type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-900">
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>
                  
                  <div className="col-span-2 flex items-center">
                    <div className="flex flex-wrap gap-1">
                      {file.threats.slice(0, 2).map((threat, index) => (
                        <Badge
                          key={index}
                          className={`text-xs ${getThreatBadgeColor(threat.severity)}`}
                        >
                          {threat.severity}
                        </Badge>
                      ))}
                      {file.threats.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{file.threats.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-500">
                      {formatDate(file.quarantined_at)}
                    </span>
                  </div>
                  
                  <div className="col-span-1 flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowFileDetails(file)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {file.can_restore && (
                          <DropdownMenuItem 
                            onClick={() => setConfirmAction({ type: 'restore', files: [file] })}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore File
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setConfirmAction({ type: 'delete', files: [file] })}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center border-t">
              <Button
                onClick={loadMore}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More Files'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Details Dialog */}
      {showFileDetails && (
        <Dialog open={!!showFileDetails} onOpenChange={() => setShowFileDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getFileIcon(showFileDetails.original_filename, showFileDetails.mime_type)}
                <span>{showFileDetails.original_filename}</span>
              </DialogTitle>
              <DialogDescription>
                Quarantined on {formatDate(showFileDetails.quarantined_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">File Size</label>
                  <p className="text-sm text-gray-900">{formatFileSize(showFileDetails.file_size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">MIME Type</label>
                  <p className="text-sm text-gray-900">{showFileDetails.mime_type}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quarantine Reason</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {showFileDetails.quarantine_reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Security Threats ({showFileDetails.threats.length})
                </label>
                <div className="space-y-2">
                  {showFileDetails.threats.map((threat, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getThreatBadgeColor(threat.severity)}>
                          {threat.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">{threat.type}</span>
                      </div>
                      <p className="text-sm text-gray-900">{threat.description}</p>
                      <p className="text-xs text-gray-600 mt-1">{threat.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  {showFileDetails.can_restore ? (
                    <Badge className="bg-green-100 text-green-800">Can be restored</Badge>
                  ) : (
                    <Badge variant="destructive">Cannot be restored</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {showFileDetails.can_restore && (
                    <Button
                      onClick={() => {
                        setConfirmAction({ type: 'restore', files: [showFileDetails] });
                        setShowFileDetails(null);
                      }}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setConfirmAction({ type: 'delete', files: [showFileDetails] });
                      setShowFileDetails(null);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction.type === 'restore' ? 'Restore File' : 
                 confirmAction.type === 'delete' ? 'Delete File' : 'Delete Files'}
              </DialogTitle>
              <DialogDescription>
                {confirmAction.type === 'restore' 
                  ? `Are you sure you want to restore "${confirmAction.files[0].original_filename}"? This will move it back to your normal files.`
                  : confirmAction.type === 'bulk-delete'
                  ? `Are you sure you want to permanently delete ${confirmAction.files.length} selected files? This action cannot be undone.`
                  : `Are you sure you want to permanently delete "${confirmAction.files[0].original_filename}"? This action cannot be undone.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={confirmAction.type === 'restore' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={confirmAction.type === 'restore' ? 'default' : 'destructive'}
              >
                {confirmAction.type === 'restore' ? 'Restore' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default QuarantineBrowser;