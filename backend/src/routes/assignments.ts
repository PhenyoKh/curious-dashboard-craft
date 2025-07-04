import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  getUpcomingAssignments,
  getOverdueAssignments,
  updateAssignmentStatus
} from '@/controllers/assignmentController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, schemas } from '@/middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create assignment
router.post('/', validateRequest({ body: schemas.createAssignment }), createAssignment);

// Get all assignments with pagination
router.get('/', validateRequest({ query: schemas.pagination }), getAssignments);

// Get upcoming assignments
router.get('/upcoming', getUpcomingAssignments);

// Get overdue assignments
router.get('/overdue', getOverdueAssignments);

// Get specific assignment
router.get('/:id', validateRequest({ params: schemas.uuid }), getAssignment);

// Update assignment
router.put('/:id', 
  validateRequest({ 
    params: schemas.uuid, 
    body: schemas.updateAssignment 
  }), 
  updateAssignment
);

// Update assignment status only
router.patch('/:id/status', 
  validateRequest({ 
    params: schemas.uuid,
    body: schemas.updateAssignment.pick({ status: true })
  }), 
  updateAssignmentStatus
);

// Delete assignment
router.delete('/:id', validateRequest({ params: schemas.uuid }), deleteAssignment);

export default router;