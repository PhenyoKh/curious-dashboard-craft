import { BaseModel } from './BaseModel';
import { Note, PaginationQuery, SearchQuery } from '@/types';

export class NoteModel extends BaseModel {
  static async create(
    userId: string, 
    title: string, 
    content: string, 
    contentText: string, 
    wordCount: number, 
    subjectId?: string
  ): Promise<Note> {
    const result = await this.query(
      `INSERT INTO notes (user_id, subject_id, title, content, content_text, word_count) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, user_id, subject_id, title, content, content_text, word_count, created_at, modified_at`,
      [userId, subjectId || null, title, content, contentText, wordCount]
    );
    
    return result.rows[0];
  }
  
  static async findByUserId(userId: string, options: PaginationQuery = {}): Promise<{ notes: Note[], total: number }> {
    const { page = 1, limit = 20, sort = 'modified_at', order = 'desc' } = options;
    const offset = (page - 1) * limit;
    
    const countResult = await this.query(
      'SELECT COUNT(*) FROM notes WHERE user_id = $1',
      [userId]
    );
    
    const result = await this.query(
      `SELECT n.id, n.user_id, n.subject_id, n.title, n.content, n.content_text, 
              n.word_count, n.created_at, n.modified_at
       FROM notes n
       WHERE n.user_id = $1 
       ORDER BY n.${sort} ${order.toUpperCase()}
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return {
      notes: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
  
  static async findById(id: string, userId: string): Promise<Note | null> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, content, content_text, 
              word_count, created_at, modified_at
       FROM notes 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    return result.rows[0] || null;
  }
  
  static async update(
    id: string, 
    userId: string, 
    title?: string, 
    content?: string, 
    contentText?: string, 
    wordCount?: number, 
    subjectId?: string
  ): Promise<Note | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    
    if (contentText !== undefined) {
      updates.push(`content_text = $${paramIndex++}`);
      values.push(contentText);
    }
    
    if (wordCount !== undefined) {
      updates.push(`word_count = $${paramIndex++}`);
      values.push(wordCount);
    }
    
    if (subjectId !== undefined) {
      updates.push(`subject_id = $${paramIndex++}`);
      values.push(subjectId);
    }
    
    if (updates.length === 0) {
      return this.findById(id, userId);
    }
    
    values.push(id, userId);
    
    const result = await this.query(
      `UPDATE notes 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, user_id, subject_id, title, content, content_text, 
                 word_count, created_at, modified_at`,
      values
    );
    
    return result.rows[0] || null;
  }
  
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    return (result.rowCount || 0) > 0;
  }
  
  static async search(userId: string, options: SearchQuery = {}): Promise<{ notes: Note[], total: number }> {
    const { q, page = 1, limit = 20, sort = 'modified_at', order = 'desc' } = options;
    
    if (!q) {
      return this.findByUserId(userId, { page, limit, sort, order });
    }
    
    const offset = (page - 1) * limit;
    
    const countResult = await this.query(
      `SELECT COUNT(*) FROM notes 
       WHERE user_id = $1 AND (
         to_tsvector('english', content_text) @@ plainto_tsquery('english', $2) OR
         title ILIKE $3
       )`,
      [userId, q, `%${q}%`]
    );
    
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, content, content_text, 
              word_count, created_at, modified_at,
              ts_rank(to_tsvector('english', content_text), plainto_tsquery('english', $2)) as rank
       FROM notes 
       WHERE user_id = $1 AND (
         to_tsvector('english', content_text) @@ plainto_tsquery('english', $2) OR
         title ILIKE $3
       )
       ORDER BY rank DESC, ${sort} ${order.toUpperCase()}
       LIMIT $4 OFFSET $5`,
      [userId, q, `%${q}%`, limit, offset]
    );
    
    return {
      notes: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
  
  static async findRecent(userId: string, limit: number = 10): Promise<Note[]> {
    const result = await this.query(
      `SELECT n.id, n.user_id, n.subject_id, n.title, n.content, n.content_text, 
              n.word_count, n.created_at, n.modified_at
       FROM notes n
       WHERE n.user_id = $1 
       ORDER BY n.modified_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }
  
  static async findBySubjectId(userId: string, subjectId: string): Promise<Note[]> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, content, content_text, 
              word_count, created_at, modified_at
       FROM notes 
       WHERE user_id = $1 AND subject_id = $2
       ORDER BY modified_at DESC`,
      [userId, subjectId]
    );
    
    return result.rows;
  }
}