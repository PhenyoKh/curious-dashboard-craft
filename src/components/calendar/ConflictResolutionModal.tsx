/**
 * Conflict Resolution Modal - UI for resolving sync conflicts between local and Google Calendar events
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MergeIcon,
  InfoIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { SyncConflict, ConflictResolutionService } from '@/services/integrations/google/ConflictResolutionService';
import { LocalEvent } from '@/services/integrations/google/EventMappingService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SyncConflict | null;
  onResolved: () => void;
}

type ResolutionChoice = 'keep_local' | 'keep_external' | 'merge' | 'ignore';

interface MergedEventData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  onResolved,
}) => {
  const [resolution, setResolution] = useState<ResolutionChoice>('keep_local');
  const [mergedData, setMergedData] = useState<MergedEventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conflictService = ConflictResolutionService.getInstance();

  useEffect(() => {
    if (conflict) {
      // Initialize merged data with local event data
      setMergedData({
        title: conflict.local_event_data.title,
        description: conflict.local_event_data.description || '',
        start_time: conflict.local_event_data.start_time,
        end_time: conflict.local_event_data.end_time,
        location: conflict.local_event_data.location || '',
      });
      setResolution('keep_local');
      setError(null);
    }
  }, [conflict]);

  if (!conflict) return null;

  const localEvent = conflict.local_event_data;
  const externalEvent = conflict.external_event_data;

  const handleResolve = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await conflictService.resolveConflictManually(
        conflict.id,
        conflict.user_id,
        resolution,
        resolution === 'merge' ? mergedData as Partial<LocalEvent> : undefined
      );

      if (result.success) {
        toast.success('Conflict resolved successfully');
        onResolved();
        onClose();
      } else {
        setError(result.error || 'Failed to resolve conflict');
      }
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setResolution('keep_local');
    setError(null);
    onClose();
  };

  const getConflictSeverityColor = (type: SyncConflict['conflict_type']) => {
    switch (type) {
      case 'time_mismatch':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'content_mismatch':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'deletion_conflict':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'creation_conflict':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConflictIcon = (type: SyncConflict['conflict_type']) => {
    switch (type) {
      case 'time_mismatch':
        return <ClockIcon className="h-4 w-4" />;
      case 'content_mismatch':
        return <InfoIcon className="h-4 w-4" />;
      case 'deletion_conflict':
        return <XCircleIcon className="h-4 w-4" />;
      case 'creation_conflict':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <AlertTriangleIcon className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime: string) => {
    try {
      return format(new Date(dateTime), 'MMM d, yyyy h:mm a');
    } catch {
      return dateTime;
    }
  };

  const hasFieldDifference = (field: 'title' | 'description' | 'time' | 'location') => {
    switch (field) {
      case 'title':
        return localEvent.title !== externalEvent.summary;
      case 'description':
        return (localEvent.description || '') !== (externalEvent.description || '');
      case 'time':
        return (
          new Date(localEvent.start_time).getTime() !== new Date(externalEvent.start.dateTime).getTime() ||
          new Date(localEvent.end_time).getTime() !== new Date(externalEvent.end.dateTime).getTime()
        );
      case 'location':
        return (localEvent.location || '') !== (externalEvent.location || '');
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
            <span>Resolve Sync Conflict</span>
          </DialogTitle>
          <DialogDescription>
            This event has conflicting information between your local calendar and Google Calendar.
            Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge className={`${getConflictSeverityColor(conflict.conflict_type)} flex items-center space-x-1`}>
                {getConflictIcon(conflict.conflict_type)}
                <span className="capitalize">{conflict.conflict_type.replace('_', ' ')}</span>
              </Badge>
              <span className="text-sm text-gray-600">{conflict.conflict_description}</span>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Choose Resolution</h4>
            <RadioGroup value={resolution} onValueChange={(value: ResolutionChoice) => setResolution(value)}>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep_local" id="keep_local" />
                  <Label htmlFor="keep_local" className="flex items-center space-x-2 cursor-pointer">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span>Keep Local Version</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep_external" id="keep_external" />
                  <Label htmlFor="keep_external" className="flex items-center space-x-2 cursor-pointer">
                    <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                    <span>Keep Google Calendar Version</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merge" id="merge" />
                  <Label htmlFor="merge" className="flex items-center space-x-2 cursor-pointer">
                    <MergeIcon className="h-4 w-4 text-purple-500" />
                    <span>Merge Both Versions</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ignore" id="ignore" />
                  <Label htmlFor="ignore" className="flex items-center space-x-2 cursor-pointer">
                    <XCircleIcon className="h-4 w-4 text-gray-500" />
                    <span>Ignore Conflict (Keep Local)</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Event Comparison */}
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList>
              <TabsTrigger value="comparison">Compare Versions</TabsTrigger>
              {resolution === 'merge' && <TabsTrigger value="merge">Merge Details</TabsTrigger>}
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Event */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Local Calendar</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className={`space-y-1 ${hasFieldDifference('title') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Title</Label>
                      <p className="text-sm font-medium">{localEvent.title}</p>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('description') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Description</Label>
                      <p className="text-sm">{localEvent.description || 'No description'}</p>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('time') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Time</Label>
                      <div className="text-sm">
                        <p>{formatDateTime(localEvent.start_time)}</p>
                        <p>to {formatDateTime(localEvent.end_time)}</p>
                      </div>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('location') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Location</Label>
                      <p className="text-sm">{localEvent.location || 'No location'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* External Event */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600 flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Google Calendar</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className={`space-y-1 ${hasFieldDifference('title') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Title</Label>
                      <p className="text-sm font-medium">{externalEvent.summary}</p>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('description') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Description</Label>
                      <p className="text-sm">{externalEvent.description || 'No description'}</p>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('time') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Time</Label>
                      <div className="text-sm">
                        <p>{formatDateTime(externalEvent.start.dateTime)}</p>
                        <p>to {formatDateTime(externalEvent.end.dateTime)}</p>
                      </div>
                    </div>

                    <div className={`space-y-1 ${hasFieldDifference('location') ? 'bg-yellow-50 p-2 rounded' : ''}`}>
                      <Label className="text-xs text-gray-500">Location</Label>
                      <p className="text-sm">{externalEvent.location || 'No location'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {resolution === 'merge' && (
              <TabsContent value="merge" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="text-md font-medium">Customize Merged Event</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="merge-title">Title</Label>
                      <Input
                        id="merge-title"
                        value={mergedData?.title || ''}
                        onChange={(e) => setMergedData(prev => prev ? { ...prev, title: e.target.value } : null)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="merge-description">Description</Label>
                      <Textarea
                        id="merge-description"
                        value={mergedData?.description || ''}
                        onChange={(e) => setMergedData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="merge-start">Start Time</Label>
                        <Input
                          id="merge-start"
                          type="datetime-local"
                          value={mergedData?.start_time?.slice(0, 16) || ''}
                          onChange={(e) => setMergedData(prev => prev ? { ...prev, start_time: e.target.value } : null)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="merge-end">End Time</Label>
                        <Input
                          id="merge-end"
                          type="datetime-local"
                          value={mergedData?.end_time?.slice(0, 16) || ''}
                          onChange={(e) => setMergedData(prev => prev ? { ...prev, end_time: e.target.value } : null)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="merge-location">Location</Label>
                      <Input
                        id="merge-location"
                        value={mergedData?.location || ''}
                        onChange={(e) => setMergedData(prev => prev ? { ...prev, location: e.target.value } : null)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={loading}>
            {loading ? 'Resolving...' : 'Resolve Conflict'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};