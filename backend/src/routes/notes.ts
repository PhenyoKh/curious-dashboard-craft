import { Router } from 'express';
import {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
  getRecentNotes,
  exportNote
} from '@/controllers/noteController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, schemas } from '@/middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create note
router.post('/', validateRequest({ body: schemas.createNote }), createNote);

// Get all notes with pagination
router.get('/', validateRequest({ query: schemas.pagination }), getNotes);

// Search notes
router.get('/search', validateRequest({ query: schemas.search }), searchNotes);

// Get recent notes
router.get('/recent', getRecentNotes);

// Get specific note
router.get('/:id', validateRequest({ params: schemas.uuid }), getNote);

// Update note
router.put('/:id', 
  validateRequest({ 
    params: schemas.uuid, 
    body: schemas.updateNote 
  }), 
  updateNote
);

// Delete note
router.delete('/:id', validateRequest({ params: schemas.uuid }), deleteNote);

// Export note
router.post('/:id/export', validateRequest({ params: schemas.uuid }), exportNote);

export default router;