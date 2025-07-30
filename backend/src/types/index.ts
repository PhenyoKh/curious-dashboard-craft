export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subject {
  id: string;
  user_id: string;
  value: string;
  label: string;
  created_at: Date;
}

export interface Note {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  content: string;
  content_text: string;
  word_count: number;
  highlights?: string; // JSON string of highlights array
  created_at: Date;
  modified_at: Date;
}

export interface Assignment {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  due_date: Date;
  status: 'Not Started' | 'In Progress' | 'To Do' | 'On Track' | 'Overdue' | 'Completed';
  created_at: Date;
  updated_at: Date;
}

export interface NoteMetadata {
  subject: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface SubjectOption {
  value: string;
  label: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
}