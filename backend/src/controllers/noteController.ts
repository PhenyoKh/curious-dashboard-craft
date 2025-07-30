import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { NoteModel } from '@/models/Note';
import { SubjectModel } from '@/models/Subject';
import { ApiResponse, SearchQuery, PaginationQuery } from '@/types';
import { htmlToText, calculateWordCount } from '@/utils/textProcessor';
import { ExportService, ExportedNote } from '@/services/exportService';

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, subjectId, highlights } = req.body;
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
    
    const contentText = htmlToText(content);
    const wordCount = calculateWordCount(content);
    const highlightsJson = highlights ? JSON.stringify(highlights) : '[]';
    
    const note = await NoteModel.create(
      userId,
      title,
      content,
      contentText,
      wordCount,
      subjectId,
      highlightsJson
    );
    
    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = req.query as PaginationQuery;
    
    const result = await NoteModel.findByUserId(userId, query);
    
    res.json({
      success: true,
      data: {
        notes: result.notes,
        pagination: {
          total: result.total,
          page: query.page || 1,
          limit: query.limit || 20,
          totalPages: Math.ceil(result.total / (query.limit || 20))
        }
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const note = await NoteModel.findById(id, userId);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      } as ApiResponse);
    }
    
    // Get subject details if note has a subject
    let subject = null;
    if (note.subject_id) {
      subject = await SubjectModel.findById(note.subject_id, userId);
    }
    
    res.json({
      success: true,
      data: {
        ...note,
        subject
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, subjectId, highlights } = req.body;
    const userId = req.user!.id;
    
    // Check if note exists
    const existingNote = await NoteModel.findById(id, userId);
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
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
    
    let contentText, wordCount;
    if (content !== undefined) {
      contentText = htmlToText(content);
      wordCount = calculateWordCount(content);
    }

    let highlightsJson;
    if (highlights !== undefined) {
      highlightsJson = JSON.stringify(highlights);
    }
    
    const note = await NoteModel.update(
      id,
      userId,
      title,
      content,
      contentText,
      wordCount,
      subjectId,
      highlightsJson
    );
    
    res.json({
      success: true,
      data: note,
      message: 'Note updated successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const deleted = await NoteModel.delete(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = req.query as SearchQuery;
    
    const result = await NoteModel.search(userId, query);
    
    res.json({
      success: true,
      data: {
        notes: result.notes,
        pagination: {
          total: result.total,
          page: query.page || 1,
          limit: query.limit || 20,
          totalPages: Math.ceil(result.total / (query.limit || 20))
        },
        query: query.q
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const getRecentNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const notes = await NoteModel.findRecent(userId, limit);
    
    // Get subjects for each note
    const notesWithSubjects = await Promise.all(
      notes.map(async (note) => {
        let subject = null;
        if (note.subject_id) {
          subject = await SubjectModel.findById(note.subject_id, userId);
        }
        return { ...note, subject };
      })
    );
    
    res.json({
      success: true,
      data: notesWithSubjects
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get recent notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const exportNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'text' } = req.query;
    const userId = req.user!.id;
    
    const note = await NoteModel.findById(id, userId);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      } as ApiResponse);
    }

    // Create an exportable note with highlights
    const exportableNote: ExportedNote = {
      ...note,
      highlights: note.highlights ? JSON.parse(note.highlights as string) : []
    };

    const formatStr = format as string;
    const supportedFormats = ['text', 'txt', 'html', 'markdown', 'md'];
    
    if (!supportedFormats.includes(formatStr)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported export format. Supported formats: ${supportedFormats.join(', ')}`
      } as ApiResponse);
    }

    let exportContent: string;
    let filename: string;
    
    // Generate filename
    const safeTitle = (note.title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const extension = ExportService.getFileExtension(formatStr);
    filename = `${safeTitle}${extension}`;

    // Generate export content based on format
    switch (formatStr) {
      case 'html':
        exportContent = ExportService.exportAsHTML(exportableNote);
        break;
      case 'markdown':
      case 'md':
        exportContent = ExportService.exportAsMarkdown(exportableNote);
        break;
      case 'text':
      case 'txt':
      default:
        exportContent = ExportService.exportAsText(exportableNote);
        break;
    }

    // Set response headers
    const contentType = ExportService.getContentType(formatStr);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportContent);
    
  } catch (error) {
    console.error('Export note error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};