import { z } from 'zod';

// Note validation schema
export const noteSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .refine(val => val.trim().length > 0, 'Title cannot be empty'),
  
  content: z.string()
    .max(100000, 'Content must be less than 100,000 characters'),
  
  tags: z.array(z.string())
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  
  subjectId: z.string()
    .uuid('Invalid subject ID')
    .optional(),
});

// Subject validation schema
export const subjectSchema = z.object({
  name: z.string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name must be less than 100 characters')
    .refine(val => val.trim().length > 0, 'Subject name cannot be empty'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

// Assignment validation schema
export const assignmentSchema = z.object({
  title: z.string()
    .min(1, 'Assignment title is required')
    .max(200, 'Title must be less than 200 characters')
    .refine(val => val.trim().length > 0, 'Title cannot be empty'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1,000 characters')
    .optional(),
  
  dueDate: z.date()
    .min(new Date(), 'Due date must be in the future'),
  
  priority: z.enum(['low', 'medium', 'high'])
    .default('medium'),
  
  subjectId: z.string()
    .uuid('Invalid subject ID'),
});

// User authentication schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 254 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 254 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  confirmPassword: z.string(),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .refine(val => val.trim().length > 0, 'Name cannot be empty'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Search validation
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .refine(val => val.trim().length > 0, 'Search query cannot be empty'),
  
  filters: z.object({
    subjects: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
    }).optional(),
  }).optional(),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
    .refine((file) => file.size >= 1024, 'File must be at least 1KB')
    .refine((file) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not allowed'),
  
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
});

// Export types
export type NoteInput = z.infer<typeof noteSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;