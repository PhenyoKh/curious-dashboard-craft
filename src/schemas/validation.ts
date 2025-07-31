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
  
  code: z.string()
    .optional()
    .refine(val => !val || val.trim() === '' || /^[A-Z0-9]{2,10}$/.test(val.trim().toUpperCase()), 
      'Subject code must be 2-10 characters, letters and numbers only'),
  
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

// Enhanced Assignment validation schema
export const assignmentSchema = z.object({
  title: z.string()
    .min(1, 'Assignment title is required')
    .max(500, 'Title must be less than 500 characters')
    .refine(val => val.trim().length > 0, 'Title cannot be empty'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2,000 characters')
    .optional(),
  
  dueDate: z.date()
    .min(new Date(), 'Due date must be in the future'),
  
  assignmentType: z.enum([
    'assignment', 'exam', 'project', 'quiz', 'presentation', 
    'lab', 'homework', 'paper', 'discussion'
  ]).default('assignment'),
  
  submissionType: z.enum([
    'online', 'paper', 'presentation', 'email', 
    'in_person', 'upload', 'quiz_platform'
  ]).default('online'),
  
  priority: z.enum(['Low', 'Medium', 'High'])
    .default('Medium'),
  
  subjectId: z.string()
    .refine((val) => val === '__no_subject__' || z.string().uuid().safeParse(val).success, {
      message: 'Must be a valid UUID or __no_subject__'
    })
    .optional(),
  
  semesterId: z.string()
    .refine((val) => val === '' || z.string().uuid().safeParse(val).success, {
      message: 'Must be a valid UUID or empty'
    })
    .optional(),
    
  semester: z.string()
    .max(100, 'Semester name must be less than 100 characters')
    .optional(),
    
  submissionUrl: z.string()
    .refine((val) => val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL or empty'
    })
    .optional(),
    
  submissionInstructions: z.string()
    .max(1000, 'Instructions must be less than 1,000 characters')
    .optional(),
    
  studyTimeEstimate: z.number()
    .min(1, 'Study time must be at least 1 minute')
    .max(10080, 'Study time cannot exceed 1 week (10,080 minutes)')
    .optional(),
    
  difficultyRating: z.number()
    .min(1, 'Difficulty rating must be between 1 and 5')
    .max(5, 'Difficulty rating must be between 1 and 5')
    .optional(),
    
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

// Assignment update schema (all fields optional)
export const assignmentUpdateSchema = z.object({
  title: z.string()
    .min(1, 'Assignment title is required')
    .max(500, 'Title must be less than 500 characters')
    .optional(),
  
  description: z.string()
    .max(2000, 'Description must be less than 2,000 characters')
    .optional(),
  
  dueDate: z.date().optional(),
  
  status: z.enum([
    'Not Started', 'In Progress', 'To Do', 'On Track', 
    'Overdue', 'Completed', 'Submitted', 'Graded', 'Late Submission'
  ]).optional(),
  
  progressPercentage: z.number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%')
    .optional(),
    
  timeSpentMinutes: z.number()
    .min(0, 'Time spent cannot be negative')
    .optional(),
    
  difficultyRating: z.number()
    .min(1, 'Difficulty rating must be between 1 and 5')
    .max(5, 'Difficulty rating must be between 1 and 5')
    .optional(),
    
  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

// Semester validation schema
export const semesterSchema = z.object({
  name: z.string()
    .min(1, 'Semester name is required')
    .max(100, 'Name must be less than 100 characters'),
    
  academicYear: z.string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'),
    
  termType: z.enum([
    'fall', 'spring', 'summer', 'winter', 
    'semester1', 'semester2', 'quarter1', 'quarter2', 'quarter3', 'quarter4'
  ]),
  
  startDate: z.date(),
  
  endDate: z.date(),
  
  gpaTarget: z.number()
    .min(0.0, 'GPA target cannot be negative')
    .max(4.0, 'GPA target cannot exceed 4.0')
    .optional(),
    
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

// Study session validation schema
export const studySessionSchema = z.object({
  assignmentId: z.string()
    .uuid('Invalid assignment ID')
    .optional(),
    
  subjectId: z.string()
    .uuid('Invalid subject ID')
    .optional(),
    
  sessionType: z.enum([
    'study', 'research', 'writing', 'reviewing', 'practice', 'group_study'
  ]).default('study'),
  
  startTime: z.date(),
  
  endTime: z.date().optional(),
  
  plannedDuration: z.number()
    .min(1, 'Planned duration must be at least 1 minute')
    .max(1440, 'Planned duration cannot exceed 24 hours')
    .optional(),
    
  productivityRating: z.number()
    .min(1, 'Productivity rating must be between 1 and 5')
    .max(5, 'Productivity rating must be between 1 and 5')
    .optional(),
    
  notes: z.string()
    .max(1000, 'Notes must be less than 1,000 characters')
    .optional(),
    
  location: z.string()
    .max(255, 'Location must be less than 255 characters')
    .optional(),
}).refine(
  (data) => !data.endTime || data.endTime > data.startTime,
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

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
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;
export type SemesterInput = z.infer<typeof semesterSchema>;
export type StudySessionInput = z.infer<typeof studySessionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;