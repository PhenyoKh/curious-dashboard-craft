import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

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

  // Get recent notes (last 10)
  async getRecentNotes(userId: string, limit: number = 10): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('modified_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
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
  // Get all assignments for a user
  async getUserAssignments(userId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
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

  // Create a new schedule event
  async createScheduleEvent(event: ScheduleEventInsert): Promise<ScheduleEvent> {
    const { data, error } = await supabase
      .from('schedule_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
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
  handleError(error: any): never {
    console.error('Supabase Error:', error);
    
    if (error.code === 'PGRST301') {
      throw new Error('Unauthorized access');
    }
    
    if (error.code === 'PGRST116') {
      throw new Error('Record not found');
    }
    
    if (error.message) {
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

// Get current user ID from Supabase auth
const getCurrentUserId = async (): Promise<string> => {
  console.log('🔍 getCurrentUserId: Checking authentication...');
  
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
export const getRecentNotes = async (): Promise<Note[]> => {
  const userId = await getCurrentUserId();
  return notesService.getRecentNotes(userId);
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

// Schedule convenience functions
export const getScheduleEvents = async (): Promise<ScheduleEvent[]> => {
  const userId = await getCurrentUserId();
  return scheduleService.getUserScheduleEvents(userId);
};

export const createScheduleEvent = async (eventData: Omit<ScheduleEventInsert, 'user_id'>): Promise<ScheduleEvent> => {
  const userId = await getCurrentUserId();
  return scheduleService.createScheduleEvent({ ...eventData, user_id: userId });
};

// Export default service object for convenience
export default {
  notes: notesService,
  subjects: subjectsService,
  assignments: assignmentsService,
  schedule: scheduleService,
  userProfile: userProfileService,
  userSettings: userSettingsService,
  dashboard: dashboardService,
  utils: supabaseUtils,
};