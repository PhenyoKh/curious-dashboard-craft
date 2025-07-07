
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  value VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, value)
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  modified_at TIMESTAMP DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  due_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'Not Started',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = current_setting('app.current_user_id')::uuid);

-- RLS Policies for subjects table
CREATE POLICY "Users can view their own subjects" ON subjects
  FOR SELECT USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can create their own subjects" ON subjects
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can update their own subjects" ON subjects
  FOR UPDATE USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can delete their own subjects" ON subjects
  FOR DELETE USING (user_id = current_setting('app.current_user_id')::uuid);

-- RLS Policies for notes table
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can create their own notes" ON notes
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (user_id = current_setting('app.current_user_id')::uuid);

-- RLS Policies for assignments table
CREATE POLICY "Users can view their own assignments" ON assignments
  FOR SELECT USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can create their own assignments" ON assignments
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can update their own assignments" ON assignments
  FOR UPDATE USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "Users can delete their own assignments" ON assignments
  FOR DELETE USING (user_id = current_setting('app.current_user_id')::uuid);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_modified_at ON notes(modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_content_text ON notes USING gin(to_tsvector('english', content_text));
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Function to update modified_at timestamp
CREATE OR REPLACE FUNCTION update_modified_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update modified_at for notes
CREATE TRIGGER update_notes_modified_at BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION update_modified_at_column();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for users and assignments
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
