/**
 * Conflict Resolution Modal - Browser-compatible placeholder for sync conflicts
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarIcon,
  AlertTriangleIcon,
  InfoIcon,
} from 'lucide-react';
import { logger } from '@/utils/logger';

// Browser-compatible types
export interface SyncConflict {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SyncConflict | null;
  onResolved: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  onResolved
}) => {
  React.useEffect(() => {
    if (isOpen && conflict) {
      logger.log('Conflict resolution modal opened (setup mode)', conflict);
    }
  }, [isOpen, conflict]);

  const handleClose = () => {
    logger.log('Conflict resolution modal closed');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Sync Conflict Resolution</span>
          </DialogTitle>
          <DialogDescription>
            Resolve conflicts between local and external calendar events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Setup Notice */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Conflict resolution will be available once calendar integrations are configured and active.
            </AlertDescription>
          </Alert>

          {/* Placeholder UI */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Conflict Resolution Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                When calendar sync is active, conflicts may arise when:
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="text-sm">
                    The same event is modified in both local and external calendars
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="text-sm">
                    Events have different details (title, time, location) between sources
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="text-sm">
                    Recurring events are changed differently in each calendar
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium mb-2">Resolution Options:</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• <strong>Keep Local:</strong> Use the local calendar version</div>
                  <div>• <strong>Keep External:</strong> Use the external calendar version</div>
                  <div>• <strong>Merge:</strong> Combine details from both versions</div>
                  <div>• <strong>Ignore:</strong> Skip this conflict</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mock conflict display if one is passed */}
          {conflict && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                  <span>Sample Conflict</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div><strong>Type:</strong> {conflict.type}</div>
                  <div><strong>Description:</strong> {conflict.description}</div>
                  <div><strong>Created:</strong> {new Date(conflict.created_at).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button disabled>
              Resolve Conflicts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};