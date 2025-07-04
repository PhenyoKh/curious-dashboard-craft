import { BaseModel } from './BaseModel';
import { Assignment, PaginationQuery } from '@/types';

export class AssignmentModel extends BaseModel {
  static async create(
    userId: string,
    title: string,
    dueDate: Date,
    status: string = 'Not Started',
    subjectId?: string
  ): Promise<Assignment> {
    const result = await this.query(
      `INSERT INTO assignments (user_id, subject_id, title, due_date, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, user_id, subject_id, title, due_date, status, created_at, updated_at`,
      [userId, subjectId || null, title, dueDate, status]
    );
    
    return result.rows[0];
  }
  
  static async findByUserId(userId: string, options: PaginationQuery = {}): Promise<{ assignments: Assignment[], total: number }> {
    const { page = 1, limit = 20, sort = 'due_date', order = 'asc' } = options;
    const offset = (page - 1) * limit;
    
    const countResult = await this.query(
      'SELECT COUNT(*) FROM assignments WHERE user_id = $1',
      [userId]
    );
    
    const result = await this.query(
      `SELECT a.id, a.user_id, a.subject_id, a.title, a.due_date, a.status, 
              a.created_at, a.updated_at
       FROM assignments a
       WHERE a.user_id = $1 
       ORDER BY a.${sort} ${order.toUpperCase()}
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return {
      assignments: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
  
  static async findById(id: string, userId: string): Promise<Assignment | null> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, due_date, status, created_at, updated_at
       FROM assignments 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    return result.rows[0] || null;
  }
  
  static async update(
    id: string,
    userId: string,
    title?: string,
    dueDate?: Date,
    status?: string,
    subjectId?: string
  ): Promise<Assignment | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dueDate);
    }
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
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
      `UPDATE assignments 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, user_id, subject_id, title, due_date, status, created_at, updated_at`,
      values
    );
    
    return result.rows[0] || null;
  }
  
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM assignments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    return (result.rowCount || 0) > 0;
  }
  
  static async findUpcoming(userId: string, limit: number = 10): Promise<Assignment[]> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, due_date, status, created_at, updated_at
       FROM assignments 
       WHERE user_id = $1 AND due_date > NOW() AND status != 'Completed'
       ORDER BY due_date ASC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }
  
  static async findOverdue(userId: string): Promise<Assignment[]> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, due_date, status, created_at, updated_at
       FROM assignments 
       WHERE user_id = $1 AND due_date < NOW() AND status != 'Completed'
       ORDER BY due_date ASC`,
      [userId]
    );
    
    return result.rows;
  }
  
  static async findBySubjectId(userId: string, subjectId: string): Promise<Assignment[]> {
    const result = await this.query(
      `SELECT id, user_id, subject_id, title, due_date, status, created_at, updated_at
       FROM assignments 
       WHERE user_id = $1 AND subject_id = $2
       ORDER BY due_date ASC`,
      [userId, subjectId]
    );
    
    return result.rows;
  }
  
  static async updateStatus(id: string, userId: string, status: string): Promise<Assignment | null> {
    const result = await this.query(
      `UPDATE assignments 
       SET status = $3 
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, subject_id, title, due_date, status, created_at, updated_at`,
      [id, userId, status]
    );
    
    return result.rows[0] || null;
  }
}