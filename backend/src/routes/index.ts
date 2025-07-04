import { Router } from 'express';
import authRoutes from './auth';
import noteRoutes from './notes';
import subjectRoutes from './subjects';
import assignmentRoutes from './assignments';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    message: 'API is running'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/notes', noteRoutes);
router.use('/subjects', subjectRoutes);
router.use('/assignments', assignmentRoutes);

export default router;