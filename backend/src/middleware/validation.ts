
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

const passwordSchema = z.string().min(12, 'Password must be at least 12 characters long').regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
);

export const validateRequest = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas with strengthened password requirements
  register: z.object({
    email: z.string().email('Invalid email format').max(255, 'Email too long'),
    password: passwordSchema
  }),
  
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  }),
  
  // Note schemas with enhanced validation
  createNote: z.object({
    title: z.string().min(1, 'Title is required').max(500, 'Title too long').trim(),
    content: z.string().default(''),
    subjectId: z.string().uuid().optional(),
    highlights: z.array(z.any()).optional()
  }),
  
  updateNote: z.object({
    title: z.string().min(1, 'Title is required').max(500, 'Title too long').trim().optional(),
    content: z.string().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    highlights: z.array(z.any()).optional()
  }),
  
  // Subject schemas with enhanced validation
  createSubject: z.object({
    value: z.string().min(1, 'Value is required').max(100, 'Value too long').trim(),
    label: z.string().min(1, 'Label is required').max(255, 'Label too long').trim()
  }),
  
  updateSubject: z.object({
    value: z.string().min(1, 'Value is required').max(100, 'Value too long').trim().optional(),
    label: z.string().min(1, 'Label is required').max(255, 'Label too long').trim().optional()
  }),
  
  // Assignment schemas
  createAssignment: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim(),
    dueDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
    status: z.enum(['Not Started', 'In Progress', 'To Do', 'On Track', 'Overdue', 'Completed']).default('Not Started'),
    subjectId: z.string().uuid().optional()
  }),
  
  updateAssignment: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim().optional(),
    dueDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
    status: z.enum(['Not Started', 'In Progress', 'To Do', 'On Track', 'Overdue', 'Completed']).optional(),
    subjectId: z.string().uuid().nullable().optional()
  }),
  
  // Query schemas
  pagination: z.object({
    page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1).max(1000)).optional(),
    limit: z.string().transform(val => parseInt(val) || 20).pipe(z.number().min(1).max(100)).optional(),
    sort: z.string().max(50).optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),
  
  search: z.object({
    q: z.string().max(500).optional(),
    page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1).max(1000)).optional(),
    limit: z.string().transform(val => parseInt(val) || 20).pipe(z.number().min(1).max(100)).optional(),
    sort: z.string().max(50).optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),
  
  // Params schemas
  uuid: z.object({
    id: z.string().uuid('Invalid ID format')
  })
};
