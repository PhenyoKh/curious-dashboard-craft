import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { SubjectModel } from '@/models/Subject';
import { NoteModel } from '@/models/Note';
import { AssignmentModel } from '@/models/Assignment';
import { ApiResponse } from '@/types';

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { value, label } = req.body;
    const userId = req.user!.id;
    
    // Check if subject with same value already exists for this user
    const existingSubject = await SubjectModel.findByValue(userId, value);
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        error: 'Subject with this value already exists'
      } as ApiResponse);
    }
    
    const subject = await SubjectModel.create(userId, value, label);
    
    res.status(201).json({
      success: true,
      data: subject,
      message: 'Subject created successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const subjects = await SubjectModel.findByUserId(userId);
    
    res.json({
      success: true,
      data: subjects
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const subject = await SubjectModel.findById(id, userId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    // Get notes and assignments count for this subject
    const notes = await NoteModel.findBySubjectId(userId, id);
    const assignments = await AssignmentModel.findBySubjectId(userId, id);
    
    res.json({
      success: true,
      data: {
        ...subject,
        notesCount: notes.length,
        assignmentsCount: assignments.length
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { value, label } = req.body;
    const userId = req.user!.id;
    
    // Check if subject exists
    const existingSubject = await SubjectModel.findById(id, userId);
    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    // Check if another subject with same value exists (if value is being changed)
    if (value && value !== existingSubject.value) {
      const duplicateSubject = await SubjectModel.findByValue(userId, value);
      if (duplicateSubject) {
        return res.status(409).json({
          success: false,
          error: 'Subject with this value already exists'
        } as ApiResponse);
      }
    }
    
    const subject = await SubjectModel.update(
      id,
      userId,
      value || existingSubject.value,
      label || existingSubject.label
    );
    
    res.json({
      success: true,
      data: subject,
      message: 'Subject updated successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    // Check if subject exists
    const subject = await SubjectModel.findById(id, userId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    // Check if subject has associated notes or assignments
    const notes = await NoteModel.findBySubjectId(userId, id);
    const assignments = await AssignmentModel.findBySubjectId(userId, id);
    
    if (notes.length > 0 || assignments.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete subject with associated notes or assignments',
        data: {
          notesCount: notes.length,
          assignmentsCount: assignments.length
        }
      } as ApiResponse);
    }
    
    const deleted = await SubjectModel.delete(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      message: 'Subject deleted successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getSubjectNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    // Check if subject exists
    const subject = await SubjectModel.findById(id, userId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    const notes = await NoteModel.findBySubjectId(userId, id);
    
    res.json({
      success: true,
      data: {
        subject,
        notes
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get subject notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getSubjectAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    // Check if subject exists
    const subject = await SubjectModel.findById(id, userId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      } as ApiResponse);
    }
    
    const assignments = await AssignmentModel.findBySubjectId(userId, id);
    
    res.json({
      success: true,
      data: {
        subject,
        assignments
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get subject assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};