import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { RecurrenceService } from './recurrenceService';
import type { RecurrencePattern } from '../types/recurrence';

// Type aliases for cleaner code
type Tables = Database['public']['Tables'];
type Note = Tables['notes']['Row'];
type NoteInsert = Tables['notes']['Insert'];
type NoteUpdate = Tables['notes']['Update'];
type Subject = Tables['subjects']['Row'];
type SubjectInsert = Tables['subjects']['Insert'];
type SubjectUpdate = Tables['subjects']['Update'];
type Assignment = Tables['assignments']['Row'];
type AssignmentInsert = Tables['assignments']['Insert'];
type AssignmentUpdate = Tables['assignments']['Update'];
type Semester = Tables['semesters']['Row'];
type SemesterInsert = Tables['semesters']['Insert'];
type SemesterUpdate = Tables['semesters']['Update'];
type AssignmentCategory = Tables['assignment_categories']['Row'];
type StudySession = Tables['study_sessions']['Row'];
type StudySessionInsert = Tables['study_sessions']['Insert'];
type StudySessionUpdate = Tables['study_sessions']['Update'];
type ScheduleEvent = Tables['schedule_events']['Row'];
type ScheduleEventInsert = Tables['schedule_events']['Insert'];
type ScheduleEventUpdate = Tables['schedule_events']['Update'];
type UserProfile = Tables['user_profiles']['Row'];
type UserProfileUpdate = Tables['user_profiles']['Update'];
type UserSettings = Tables['user_settings']['Row'];
type UserSettingsInsert = Tables['user_settings']['Insert'];
type UserSettingsUpdate = Tables['user_settings']['Update'];

// ========================
// NOTES SERVICE
// ========================

export const notesService = {
  // Get all notes for a user
  async getUserNotes(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('modified_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all notes for a user with subject information
  async getUserNotesWithSubjects(userId: string): Promise<(Note & { subject_name?: string; subject_color?: string })[]> {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        subjects(label, value)
      `)
      .eq('user_id', userId)
      .order('modified_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to include subject_name and generate color
    return (data || []).map(note => ({
      ...note,
      subject_name: note.subjects?.label || null,
      subject_color: this.generateSubjectColor(note.subjects?.label || '')
    }));
  },

  // Helper method to generate consistent colors for subjects
  generateSubjectColor(subjectLabel: string): string {
    if (!subjectLabel) return 'blue';
    
    const colors = ['blue', 'green', 'purple', 'red', 'yellow', 'pink'];
    const hash = subjectLabel.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  },

  // Get recent notes (last 10) with subject information
  async getRecentNotes(userId: string, limit: number = 10): Promise<(Note & { subject_name?: string })[]> {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        subjects(label)
      `)
      .eq('user_id', userId)
      .order('modified_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Transform the data to include subject_name
    return (data || []).map(note => ({
      ...note,
      subject_name: note.subjects?.label || null
    }));
  },

  // Get notes by subject
  async getNotesBySubject(userId: string, subjectId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('modified_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get a single note
  async getNote(noteId: string, userId: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new note
  async createNote(note: NoteInsert): Promise<Note> {
    console.log('🔍 notesService.createNote: Inserting data:', note);
    
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single();

    console.log('🔍 notesService.createNote: Supabase response:', { data, error });
    
    if (error) {
      console.error('❌ notesService.createNote: Database error:', error);
      console.error('❌ notesService.createNote: Error code:', error.code);
      console.error('❌ notesService.createNote: Error message:', error.message);
      console.error('❌ notesService.createNote: Error details:', error.details);
      throw error;
    }
    
    console.log('🔍 notesService.createNote: Successfully created:', data);
    return data;
  },

  // Update a note
  async updateNote(noteId: string, updates: NoteUpdate, userId: string): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .update({
        ...updates,
        modified_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a note
  async deleteNote(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Search notes
  async searchNotes(userId: string, query: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,content_text.ilike.%${query}%`)
      .order('modified_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// ========================
// SUBJECTS SERVICE
// ========================

export const subjectsService = {
  // Get all subjects for a user
  async getUserSubjects(userId: string): Promise<Subject[]> {
    console.log('🔍 subjectsService.getUserSubjects: Querying for user ID:', userId);
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('🔍 subjectsService.getUserSubjects: Supabase response:', { data, error });
    
    if (error) {
      console.error('❌ subjectsService.getUserSubjects: Database error:', error);
      throw error;
    }
    
    console.log('🔍 subjectsService.getUserSubjects: Returning data:', data || []);
    return data || [];
  },

  // Get a single subject
  async getSubject(subjectId: string, userId: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new subject
  async createSubject(subject: SubjectInsert): Promise<Subject> {
    console.log('🔍 subjectsService.createSubject: Inserting data:', subject);
    
    const { data, error } = await supabase
      .from('subjects')
      .insert(subject)
      .select()
      .single();

    console.log('🔍 subjectsService.createSubject: Supabase response:', { data, error });
    
    if (error) {
      console.error('❌ subjectsService.createSubject: Database error:', error);
      console.error('❌ subjectsService.createSubject: Error code:', error.code);
      console.error('❌ subjectsService.createSubject: Error message:', error.message);
      console.error('❌ subjectsService.createSubject: Error details:', error.details);
      throw error;
    }
    
    console.log('🔍 subjectsService.createSubject: Successfully created:', data);
    return data;
  },

  // Update a subject
  async updateSubject(subjectId: string, updates: SubjectUpdate, userId: string): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', subjectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a subject
  async deleteSubject(subjectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Get subject with note count
  async getSubjectsWithNoteCounts(userId: string): Promise<(Subject & { note_count: number })[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        notes(count)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    
    return (data || []).map(subject => ({
      ...subject,
      note_count: subject.notes?.[0]?.count || 0,
      notes: undefined, // Remove the notes array from the result
    }));
  },
};

// ========================
// ASSIGNMENTS SERVICE
// ========================

export const assignmentsService = {
  // Get all assignments for a user with enhanced data
  async getUserAssignments(userId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get assignments with subject and semester information
  async getUserAssignmentsWithDetails(userId: string): Promise<(Assignment & { subject_name?: string; subject_code?: string; semester_name?: string })[]> {
    console.log('🔍 getUserAssignmentsWithDetails: Starting query for user:', userId);
    
    // First get assignments, then get subjects separately to avoid join issues
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (assignmentsError) {
      console.error('❌ getUserAssignmentsWithDetails: Assignments query failed:', assignmentsError);
      throw assignmentsError;
    }

    // Get all subjects for this user
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, label, value, color')
      .eq('user_id', userId);

    if (subjectsError) {
      console.error('❌ getUserAssignmentsWithDetails: Subjects query failed:', subjectsError);
      throw subjectsError;
    }

    console.log('🔍 getUserAssignmentsWithDetails: Assignments data:', assignmentsData);
    console.log('🔍 getUserAssignmentsWithDetails: Subjects data:', subjectsData);
    
    // Create a map of subject ID to subject info for quick lookup
    const subjectsMap = new Map();
    (subjectsData || []).forEach(subject => {
      subjectsMap.set(subject.id, subject);
    });
    
    // Map assignments with subject details
    return (assignmentsData || []).map(assignment => {
      const subject = assignment.subject_id ? subjectsMap.get(assignment.subject_id) : null;
      return {
        ...assignment,
        subject_name: subject?.label || 'No Subject',
        subject_code: subject?.value || null,
        semester_name: null // Will be added when semester table is ready
      };
    });
  },

  // Get upcoming assignments
  async getUpcomingAssignments(userId: string, days: number = 7): Promise<Assignment[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', new Date().toISOString())
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get assignments by subject
  async getAssignmentsBySubject(userId: string, subjectId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create a new assignment
  async createAssignment(assignment: AssignmentInsert): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update an assignment
  async updateAssignment(assignmentId: string, updates: AssignmentUpdate, userId: string): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark assignment as completed
  async completeAssignment(assignmentId: string, userId: string): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete an assignment
  async deleteAssignment(assignmentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Get prioritized assignments using database function
  async getPrioritizedAssignments(userId: string, limit: number = 10): Promise<Assignment[]> {
    const { data, error } = await supabase
      .rpc('get_prioritized_assignments', {
        p_user_id: userId,
        p_limit: limit
      });

    if (error) throw error;
    return data || [];
  },

  // Update assignment progress
  async updateAssignmentProgress(assignmentId: string, userId: string, progressPercentage: number): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString(),
        // Auto-update status based on progress
        status: progressPercentage === 100 ? 'Completed' : 
                progressPercentage > 0 ? 'In Progress' : 'Not Started'
      })
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add time spent to assignment
  async addTimeSpent(assignmentId: string, userId: string, minutesSpent: number): Promise<Assignment> {
    // First get current time spent
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select('time_spent_minutes')
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newTimeSpent = (currentAssignment.time_spent_minutes || 0) + minutesSpent;

    const { data, error } = await supabase
      .from('assignments')
      .update({
        time_spent_minutes: newTimeSpent,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get assignments by filters
  async getFilteredAssignments(
    userId: string,
    filters: {
      status?: string[];
      type?: string[];
      priority?: string[];
      subject_id?: string;
      semester_id?: string;
      search?: string;
    }
  ): Promise<Assignment[]> {
    let query = supabase
      .from('assignments')
      .select(`
        *,
        subjects(label, value),
        semesters(name)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.type && filters.type.length > 0) {
      query = query.in('assignment_type', filters.type);
    }
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }
    if (filters.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }
    if (filters.semester_id) {
      query = query.eq('semester_id', filters.semester_id);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('due_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Batch update assignments
  async batchUpdateAssignments(
    userId: string,
    assignmentIds: string[],
    updates: Partial<AssignmentUpdate>
  ): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('id', assignmentIds)
      .select();

    if (error) throw error;
    return data || [];
  },
};

// ========================
// SEMESTERS SERVICE
// ========================

export const semestersService = {
  // Get all semesters for a user
  async getUserSemesters(userId: string): Promise<Semester[]> {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get current semester
  async getCurrentSemester(userId: string): Promise<Semester | null> {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Create a new semester
  async createSemester(semester: SemesterInsert): Promise<Semester> {
    const { data, error } = await supabase
      .from('semesters')
      .insert(semester)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a semester
  async updateSemester(semesterId: string, updates: SemesterUpdate, userId: string): Promise<Semester> {
    const { data, error } = await supabase
      .from('semesters')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', semesterId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Set current semester (unset others)
  async setCurrentSemester(semesterId: string, userId: string): Promise<Semester> {
    // First unset all current semesters
    await supabase
      .from('semesters')
      .update({ is_current: false })
      .eq('user_id', userId);

    // Then set the new current semester
    const { data, error } = await supabase
      .from('semesters')
      .update({
        is_current: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', semesterId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a semester
  async deleteSemester(semesterId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', semesterId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

// ========================
// ASSIGNMENT CATEGORIES SERVICE
// ========================

export const assignmentCategoriesService = {
  // Get all assignment categories
  async getAssignmentCategories(): Promise<AssignmentCategory[]> {
    const { data, error } = await supabase
      .from('assignment_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Get category by keywords (for auto-detection)
  async getCategoryByKeywords(keywords: string[]): Promise<AssignmentCategory | null> {
    const { data, error } = await supabase
      .from('assignment_categories')
      .select('*')
      .contains('keywords', keywords)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create user-specific assignment category
  async createCustomCategory(category: Omit<AssignmentCategory, 'id' | 'created_at' | 'is_system_category'>): Promise<AssignmentCategory> {
    const { data, error } = await supabase
      .from('assignment_categories')
      .insert({ ...category, is_system_category: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ========================
// STUDY SESSIONS SERVICE
// ========================

export const studySessionsService = {
  // Get all study sessions for a user
  async getUserStudySessions(userId: string): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get study sessions for an assignment
  async getAssignmentStudySessions(assignmentId: string, userId: string): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('assignment_id', assignmentId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new study session
  async createStudySession(session: StudySessionInsert): Promise<StudySession> {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a study session
  async updateStudySession(sessionId: string, updates: StudySessionUpdate, userId: string): Promise<StudySession> {
    const { data, error } = await supabase
      .from('study_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete a study session (set end time and calculate duration)
  async completeStudySession(sessionId: string, userId: string, productivityRating?: number): Promise<StudySession> {
    const endTime = new Date();
    
    // Get the session to calculate duration
    const { data: session, error: fetchError } = await supabase
      .from('study_sessions')
      .select('start_time, planned_duration')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const startTime = new Date(session.start_time);
    const actualDuration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes

    const { data, error } = await supabase
      .from('study_sessions')
      .update({
        end_time: endTime.toISOString(),
        actual_duration: actualDuration,
        productivity_rating: productivityRating,
        is_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get study time analytics
  async getStudyTimeAnalytics(userId: string, subjectId?: string): Promise<{
    total_minutes: number;
    session_count: number;
    average_session_length: number;
    average_productivity: number;
  }> {
    let query = supabase
      .from('study_sessions')
      .select('actual_duration, productivity_rating')
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const sessions = data || [];
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.actual_duration || 0), 0);
    const ratingsWithValue = sessions.filter(s => s.productivity_rating).map(s => s.productivity_rating);
    const averageProductivity = ratingsWithValue.length > 0 
      ? ratingsWithValue.reduce((sum, rating) => sum + rating, 0) / ratingsWithValue.length 
      : 0;

    return {
      total_minutes: totalMinutes,
      session_count: sessions.length,
      average_session_length: sessions.length > 0 ? totalMinutes / sessions.length : 0,
      average_productivity: averageProductivity,
    };
  },

  // Delete a study session
  async deleteStudySession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

// ========================
// SCHEDULE SERVICE
// ========================

export const scheduleService = {
  // Get all schedule events for a user
  async getUserScheduleEvents(userId: string): Promise<ScheduleEvent[]> {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get events for a date range
  async getEventsInRange(userId: string, startDate: string, endDate: string): Promise<ScheduleEvent[]> {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get today's events
  async getTodaysEvents(userId: string): Promise<ScheduleEvent[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    return this.getEventsInRange(userId, startOfDay, endOfDay);
  },

  // Get this week's events (Monday to Sunday)
  async getThisWeeksEvents(userId: string): Promise<ScheduleEvent[]> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    startOfWeek.setDate(today.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getEventsInRange(userId, startOfWeek.toISOString(), endOfWeek.toISOString());
  },

  // Check for conflicting events
  async checkEventConflicts(
    userId: string, 
    startTime: string, 
    endTime: string, 
    excludeEventId?: string
  ): Promise<ScheduleEvent[]> {
    let query = supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId);
    
    // Only add the neq filter if excludeEventId is provided
    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }
    
    const { data, error } = await query
      .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`) // Overlap condition
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Find available time slots on a given date
  async findAvailableSlots(
    userId: string, 
    date: string, 
    durationMinutes: number = 60,
    workingHours: { start: string; end: string } = { start: '08:00', end: '18:00' }
  ): Promise<{ start: string; end: string }[]> {
    const startOfDay = `${date}T${workingHours.start}:00`;
    const endOfDay = `${date}T${workingHours.end}:00`;
    
    const existingEvents = await this.getEventsInRange(userId, startOfDay, endOfDay);
    
    // Sort events by start time
    existingEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const slots: { start: string; end: string }[] = [];
    const slotDurationMs = durationMinutes * 60 * 1000;
    
    let currentTime = new Date(startOfDay);
    const endTime = new Date(endOfDay);

    for (const event of existingEvents) {
      const eventStart = new Date(event.start_time);
      
      // Check if there's a gap before this event
      if (eventStart.getTime() - currentTime.getTime() >= slotDurationMs) {
        const slotEnd = new Date(Math.min(eventStart.getTime(), currentTime.getTime() + slotDurationMs));
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      
      // Move current time to after this event
      currentTime = new Date(Math.max(currentTime.getTime(), new Date(event.end_time).getTime()));
    }

    // Check if there's time remaining at the end of the day
    if (endTime.getTime() - currentTime.getTime() >= slotDurationMs) {
      const slotEnd = new Date(Math.min(endTime.getTime(), currentTime.getTime() + slotDurationMs));
      slots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString()
      });
    }

    return slots;
  },

  // Create a new schedule event (handles both single and recurring events)
  async createScheduleEvent(event: ScheduleEventInsert & { recurrence_pattern?: string }): Promise<ScheduleEvent> {
    // Check if this is a recurring event
    if (event.is_recurring && event.recurrence_pattern) {
      try {
        const pattern: RecurrencePattern = JSON.parse(event.recurrence_pattern);
        
        // Validate the recurrence pattern
        const validation = RecurrenceService.isRecurrenceValid(pattern);
        if (!validation.valid) {
          throw new Error(`Invalid recurrence pattern: ${validation.errors.join(', ')}`);
        }
        
        // Generate time range for the next 6 months
        const startDate = new Date(event.start_time);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);
        
        // If pattern has an end date, use the earlier of the two
        if (pattern.endDate) {
          const patternEndDate = new Date(pattern.endDate);
          if (patternEndDate < endDate) {
            endDate.setTime(patternEndDate.getTime());
          }
        }
        
        // Generate recurring event instances
        const expandedEvents = await RecurrenceService.expandRecurringEvent(
          event,
          pattern,
          {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        );
        
        // For each event, embed the recurrence pattern in the description as fallback
        // until the database migration is applied
        const eventsWithFallback = expandedEvents.map(expandedEvent => {
          const originalDescription = expandedEvent.description || '';
          const patternMarker = `__RECURRENCE_PATTERN__${event.recurrence_pattern}__END_PATTERN__`;
          return {
            ...expandedEvent,
            description: originalDescription ? `${originalDescription}\n${patternMarker}` : patternMarker
          };
        });
        
        // Insert all instances, but return the first one as the "primary" event
        const { data, error } = await supabase
          .from('schedule_events')
          .insert(eventsWithFallback)
          .select()
          .order('start_time');
        
        if (error) throw error;
        
        // Return the first instance with clean description
        const firstEvent = data[0];
        firstEvent.description = this.extractOriginalDescription(firstEvent.description);
        return firstEvent;
        
      } catch (parseError) {
        throw new Error(`Failed to parse recurrence pattern: ${parseError}`);
      }
    } else {
      // Single event - regular creation
      const { data, error } = await supabase
        .from('schedule_events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Helper method to extract recurrence pattern from description (fallback)
  extractRecurrencePattern(description: string | null): string | null {
    if (!description) return null;
    const match = description.match(/__RECURRENCE_PATTERN__(.*?)__END_PATTERN__/);
    return match ? match[1] : null;
  },

  // Helper method to extract original description without recurrence pattern
  extractOriginalDescription(description: string | null): string | null {
    if (!description) return null;
    return description.replace(/__RECURRENCE_PATTERN__.*?__END_PATTERN__\n?/, '').trim() || null;
  },

  // Update a schedule event
  async updateScheduleEvent(eventId: string, updates: ScheduleEventUpdate, userId: string): Promise<ScheduleEvent> {
    const { data, error } = await supabase
      .from('schedule_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a schedule event
  async deleteScheduleEvent(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('schedule_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

// ========================
// USER PROFILE SERVICE
// ========================

export const userProfileService = {
  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Create user profile
  async createUserProfile(profile: UserProfile): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ========================
// USER SETTINGS SERVICE
// ========================

export const userSettingsService = {
  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Create default user settings
  async createUserSettings(userId: string): Promise<UserSettings> {
    const defaultSettings: UserSettingsInsert = {
      user_id: userId,
      theme: 'light',
      language: 'en',
      auto_save_notes: true,
      enable_spell_check: true,
      show_line_numbers: false,
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user settings
  async updateUserSettings(userId: string, updates: UserSettingsUpdate): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ========================
// DASHBOARD SERVICE
// ========================

export const dashboardService = {
  // Get dashboard data (overview of everything)
  async getDashboardData(userId: string) {
    const [
      recentNotes,
      upcomingAssignments,
      todaysEvents,
      subjects,
    ] = await Promise.all([
      notesService.getRecentNotes(userId, 5),
      assignmentsService.getUpcomingAssignments(userId, 7),
      scheduleService.getTodaysEvents(userId),
      subjectsService.getSubjectsWithNoteCounts(userId),
    ]);

    return {
      recentNotes,
      upcomingAssignments,
      todaysEvents,
      subjects,
      stats: {
        totalNotes: recentNotes.length,
        totalSubjects: subjects.length,
        pendingAssignments: upcomingAssignments.filter(a => a.status !== 'completed').length,
        todaysEvents: todaysEvents.length,
      },
    };
  },
};

// ========================
// UTILITY FUNCTIONS
// ========================

export const supabaseUtils = {
  // Handle Supabase errors consistently
  handleError(error: unknown): never {
    console.error('Supabase Error:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST301') {
      throw new Error('Unauthorized access');
    }
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      throw new Error('Record not found');
    }
    
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      throw new Error(error.message);
    }
    
    throw new Error('An unexpected error occurred');
  },

  // Generate word count from HTML content
  getWordCount(htmlContent: string): number {
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  },

  // Extract plain text from HTML content
  getPlainText(htmlContent: string): string {
    return htmlContent.replace(/<[^>]*>/g, '').trim();
  },
};

// ========================
// CONVENIENCE WRAPPER FUNCTIONS
// ========================

// Get current user ID from Supabase auth with session validation
const getCurrentUserId = async (): Promise<string> => {
  console.log('🔍 getCurrentUserId: Checking authentication...');
  
  // Always check for a session before making Supabase user calls
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ getCurrentUserId: No session found');
    throw new Error('No active session - authentication required');
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('🔍 getCurrentUserId: Auth response:', { user: user ? { id: user.id, email: user.email } : null, error });
  
  if (error) {
    console.error('❌ getCurrentUserId: Auth error:', error);
    throw new Error('Authentication required');
  }
  
  if (!user) {
    console.error('❌ getCurrentUserId: No user found');
    throw new Error('No authenticated user found');
  }
  
  console.log('🔍 getCurrentUserId: Successfully got user ID:', user.id);
  return user.id;
};

// Notes convenience functions
export const getRecentNotes = async (): Promise<(Note & { subject_name?: string })[]> => {
  const userId = await getCurrentUserId();
  return notesService.getRecentNotes(userId);
};

export const getAllNotesWithSubjects = async (): Promise<(Note & { subject_name?: string; subject_color?: string })[]> => {
  const userId = await getCurrentUserId();
  return notesService.getUserNotesWithSubjects(userId);
};

export const getNoteById = async (noteId: string): Promise<Note | null> => {
  const userId = await getCurrentUserId();
  return notesService.getNote(noteId, userId);
};

export const updateNoteById = async (noteId: string, updates: Omit<NoteUpdate, 'user_id'>): Promise<Note> => {
  const userId = await getCurrentUserId();
  return notesService.updateNote(noteId, updates, userId);
};

export const createNote = async (noteData: Omit<NoteInsert, 'user_id'>): Promise<Note> => {
  console.log('🔍 createNote: Starting to create note...');
  console.log('🔍 createNote: Input data:', noteData);
  
  try {
    const userId = await getCurrentUserId();
    console.log('🔍 createNote: Got user ID:', userId);
    
    const fullNoteData = { ...noteData, user_id: userId };
    console.log('🔍 createNote: Full data to insert:', fullNoteData);
    
    const result = await notesService.createNote(fullNoteData);
    console.log('🔍 createNote: Created note successfully:', result);
    
    return result;
  } catch (error) {
    console.error('❌ createNote: Error occurred:', error);
    console.error('❌ createNote: Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export const deleteNote = async (noteId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting note:', noteId);
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('❌ Error deleting note:', error);
      return false;
    }

    console.log('✅ Note deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in deleteNote:', error);
    return false;
  }
};

// Subjects convenience functions
export const getSubjects = async (): Promise<Subject[]> => {
  console.log('🔍 getSubjects: Starting to fetch subjects...');
  try {
    const userId = await getCurrentUserId();
    console.log('🔍 getSubjects: Got user ID:', userId);
    
    const subjects = await subjectsService.getUserSubjects(userId);
    console.log('🔍 getSubjects: Raw response from Supabase:', subjects);
    console.log('🔍 getSubjects: Number of subjects found:', subjects?.length || 0);
    
    if (subjects && subjects.length > 0) {
      console.log('🔍 getSubjects: First subject data:', subjects[0]);
      console.log('🔍 getSubjects: Subject fields:', Object.keys(subjects[0]));
    }
    
    return subjects;
  } catch (error) {
    console.error('❌ getSubjects: Error occurred:', error);
    throw error;
  }
};

export const createSubject = async (subjectData: Omit<SubjectInsert, 'user_id'>): Promise<Subject> => {
  console.log('🔍 createSubject: Starting to create subject...');
  console.log('🔍 createSubject: Input data:', subjectData);
  
  try {
    const userId = await getCurrentUserId();
    console.log('🔍 createSubject: Got user ID:', userId);
    
    const fullSubjectData = { ...subjectData, user_id: userId };
    console.log('🔍 createSubject: Full data to insert:', fullSubjectData);
    
    const result = await subjectsService.createSubject(fullSubjectData);
    console.log('🔍 createSubject: Created subject successfully:', result);
    
    return result;
  } catch (error) {
    console.error('❌ createSubject: Error occurred:', error);
    console.error('❌ createSubject: Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

// Assignments convenience functions
export const getAssignments = async (): Promise<Assignment[]> => {
  const userId = await getCurrentUserId();
  return assignmentsService.getUserAssignments(userId);
};

export const createAssignment = async (assignmentData: Omit<AssignmentInsert, 'user_id'>): Promise<Assignment> => {
  const userId = await getCurrentUserId();
  return assignmentsService.createAssignment({ ...assignmentData, user_id: userId });
};

export const updateAssignment = async (assignmentId: string, updates: AssignmentUpdate): Promise<Assignment> => {
  const userId = await getCurrentUserId();
  return assignmentsService.updateAssignment(assignmentId, updates, userId);
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  return assignmentsService.deleteAssignment(assignmentId, userId);
};

// Enhanced assignment convenience functions
export const getAssignmentsWithDetails = async (): Promise<(Assignment & { subject_name?: string; subject_code?: string; semester_name?: string })[]> => {
  const userId = await getCurrentUserId();
  return assignmentsService.getUserAssignmentsWithDetails(userId);
};

export const getPrioritizedAssignments = async (limit?: number): Promise<Assignment[]> => {
  const userId = await getCurrentUserId();
  return assignmentsService.getPrioritizedAssignments(userId, limit);
};

export const updateAssignmentProgress = async (assignmentId: string, progressPercentage: number): Promise<Assignment> => {
  const userId = await getCurrentUserId();
  return assignmentsService.updateAssignmentProgress(assignmentId, userId, progressPercentage);
};

export const addTimeToAssignment = async (assignmentId: string, minutesSpent: number): Promise<Assignment> => {
  const userId = await getCurrentUserId();
  return assignmentsService.addTimeSpent(assignmentId, userId, minutesSpent);
};

interface AssignmentFilters {
  status?: string[];
  type?: string[];
  priority?: string[];
  subject_id?: string;
  semester_id?: string;
  search?: string;
}

export const getFilteredAssignments = async (filters: AssignmentFilters): Promise<Assignment[]> => {
  const userId = await getCurrentUserId();
  return assignmentsService.getFilteredAssignments(userId, filters);
};

// Semesters convenience functions
export const getSemesters = async (): Promise<Semester[]> => {
  const userId = await getCurrentUserId();
  return semestersService.getUserSemesters(userId);
};

export const getCurrentSemester = async (): Promise<Semester | null> => {
  const userId = await getCurrentUserId();
  return semestersService.getCurrentSemester(userId);
};

export const createSemester = async (semesterData: Omit<SemesterInsert, 'user_id'>): Promise<Semester> => {
  const userId = await getCurrentUserId();
  return semestersService.createSemester({ ...semesterData, user_id: userId });
};

export const setCurrentSemester = async (semesterId: string): Promise<Semester> => {
  const userId = await getCurrentUserId();
  return semestersService.setCurrentSemester(semesterId, userId);
};

// Study sessions convenience functions
export const getStudySessions = async (): Promise<StudySession[]> => {
  const userId = await getCurrentUserId();
  return studySessionsService.getUserStudySessions(userId);
};

export const getAssignmentStudySessions = async (assignmentId: string): Promise<StudySession[]> => {
  const userId = await getCurrentUserId();
  return studySessionsService.getAssignmentStudySessions(assignmentId, userId);
};

export const createStudySession = async (sessionData: Omit<StudySessionInsert, 'user_id'>): Promise<StudySession> => {
  const userId = await getCurrentUserId();
  return studySessionsService.createStudySession({ ...sessionData, user_id: userId });
};

export const completeStudySession = async (sessionId: string, productivityRating?: number): Promise<StudySession> => {
  const userId = await getCurrentUserId();
  return studySessionsService.completeStudySession(sessionId, userId, productivityRating);
};

export const getStudyTimeAnalytics = async (subjectId?: string): Promise<{
  total_minutes: number;
  session_count: number;
  average_session_length: number;
  average_productivity: number;
}> => {
  const userId = await getCurrentUserId();
  return studySessionsService.getStudyTimeAnalytics(userId, subjectId);
};

// Assignment categories convenience functions
export const getAssignmentCategories = async (): Promise<AssignmentCategory[]> => {
  return assignmentCategoriesService.getAssignmentCategories();
};

// Schedule convenience functions
export const getScheduleEvents = async (): Promise<ScheduleEvent[]> => {
  const userId = await getCurrentUserId();
  return scheduleService.getUserScheduleEvents(userId);
};

export const getThisWeeksScheduleEvents = async (): Promise<ScheduleEvent[]> => {
  const userId = await getCurrentUserId();
  return scheduleService.getThisWeeksEvents(userId);
};

export const createScheduleEvent = async (eventData: Omit<ScheduleEventInsert, 'user_id'>): Promise<ScheduleEvent> => {
  const userId = await getCurrentUserId();
  return scheduleService.createScheduleEvent({ ...eventData, user_id: userId });
};

export const updateScheduleEvent = async (eventId: string, eventData: Partial<Omit<ScheduleEventInsert, 'user_id'>>): Promise<ScheduleEvent> => {
  const userId = await getCurrentUserId();
  return scheduleService.updateScheduleEvent(eventId, eventData, userId);
};

export const deleteScheduleEvent = async (eventId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  return scheduleService.deleteScheduleEvent(eventId, userId);
};

export const checkEventConflicts = async (
  startTime: string, 
  endTime: string, 
  excludeEventId?: string
): Promise<ScheduleEvent[]> => {
  const userId = await getCurrentUserId();
  return scheduleService.checkEventConflicts(userId, startTime, endTime, excludeEventId);
};

export const findAvailableSlots = async (
  date: string, 
  durationMinutes?: number, 
  workingHours?: { start: string; end: string }
): Promise<{ start: string; end: string }[]> => {
  const userId = await getCurrentUserId();
  return scheduleService.findAvailableSlots(userId, date, durationMinutes, workingHours);
};

// Export default service object for convenience
export default {
  notes: notesService,
  subjects: subjectsService,
  assignments: assignmentsService,
  semesters: semestersService,
  assignmentCategories: assignmentCategoriesService,
  studySessions: studySessionsService,
  schedule: scheduleService,
  userProfile: userProfileService,
  userSettings: userSettingsService,
  dashboard: dashboardService,
  utils: supabaseUtils,
};