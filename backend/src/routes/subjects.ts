import { Router } from 'express';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  getSubjectNotes,
  getSubjectAssignments
} from '@/controllers/subjectController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, schemas } from '@/middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create subject
router.post('/', validateRequest({ body: schemas.createSubject }), createSubject);

// Get all subjects
router.get('/', getSubjects);

// Get specific subject
router.get('/:id', validateRequest({ params: schemas.uuid }), getSubject);

// Update subject
router.put('/:id', 
  validateRequest({ 
    params: schemas.uuid, 
    body: schemas.updateSubject 
  }), 
  updateSubject
);

// Delete subject
router.delete('/:id', validateRequest({ params: schemas.uuid }), deleteSubject);

// Get subject's notes
router.get('/:id/notes', validateRequest({ params: schemas.uuid }), getSubjectNotes);

// Get subject's assignments
router.get('/:id/assignments', validateRequest({ params: schemas.uuid }), getSubjectAssignments);

export default router;