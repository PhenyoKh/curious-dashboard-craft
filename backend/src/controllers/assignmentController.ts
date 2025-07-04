import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { AssignmentModel } from '@/models/Assignment';
import { SubjectModel } from '@/models/Subject';
import { ApiResponse, PaginationQuery } from '@/types';

export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { title, dueDate, status, subjectId } = req.body;
    const userId = req.user!.id;
    
    // Validate subject exists if provided
    if (subjectId) {
      const subject = await SubjectModel.findById(subjectId, userId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          error: 'Subject not found'
        } as ApiResponse);
      }
    }
    
    const assignment = await AssignmentModel.create(
      userId,
      title,
      new Date(dueDate),
      status,
      subjectId
    );
    
    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Assignment created successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = req.query as PaginationQuery;
    
    const result = await AssignmentModel.findByUserId(userId, query);
    
    // Get subjects for each assignment
    const assignmentsWithSubjects = await Promise.all(
      result.assignments.map(async (assignment) => {
        let subject = null;
        if (assignment.subject_id) {
          subject = await SubjectModel.findById(assignment.subject_id, userId);
        }
        return { ...assignment, subject };
      })
    );
    
    res.json({
      success: true,
      data: {
        assignments: assignmentsWithSubjects,
        pagination: {
          total: result.total,
          page: query.page || 1,
          limit: query.limit || 20,
          totalPages: Math.ceil(result.total / (query.limit || 20))
        }
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const assignment = await AssignmentModel.findById(id, userId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      } as ApiResponse);
    }
    
    // Get subject details if assignment has a subject
    let subject = null;
    if (assignment.subject_id) {
      subject = await SubjectModel.findById(assignment.subject_id, userId);
    }
    
    res.json({
      success: true,
      data: {
        ...assignment,
        subject
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const updateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, dueDate, status, subjectId } = req.body;
    const userId = req.user!.id;
    
    // Check if assignment exists
    const existingAssignment = await AssignmentModel.findById(id, userId);
    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      } as ApiResponse);
    }
    
    // Validate subject exists if provided
    if (subjectId !== undefined && subjectId !== null) {
      const subject = await SubjectModel.findById(subjectId, userId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          error: 'Subject not found'
        } as ApiResponse);
      }
    }
    
    const assignment = await AssignmentModel.update(
      id,
      userId,
      title,
      dueDate ? new Date(dueDate) : undefined,
      status,
      subjectId
    );
    
    res.json({
      success: true,
      data: assignment,
      message: 'Assignment updated successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const deleted = await AssignmentModel.delete(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getUpcomingAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const assignments = await AssignmentModel.findUpcoming(userId, limit);
    
    // Get subjects for each assignment
    const assignmentsWithSubjects = await Promise.all(
      assignments.map(async (assignment) => {
        let subject = null;
        if (assignment.subject_id) {
          subject = await SubjectModel.findById(assignment.subject_id, userId);
        }
        return { ...assignment, subject };
      })
    );
    
    res.json({
      success: true,
      data: assignmentsWithSubjects
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get upcoming assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getOverdueAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const assignments = await AssignmentModel.findOverdue(userId);
    
    // Get subjects for each assignment
    const assignmentsWithSubjects = await Promise.all(
      assignments.map(async (assignment) => {
        let subject = null;
        if (assignment.subject_id) {
          subject = await SubjectModel.findById(assignment.subject_id, userId);
        }
        return { ...assignment, subject };
      })
    );
    
    res.json({
      success: true,
      data: assignmentsWithSubjects
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get overdue assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const updateAssignmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;
    
    const assignment = await AssignmentModel.updateStatus(id, userId, status);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      data: assignment,
      message: 'Assignment status updated successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Update assignment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};