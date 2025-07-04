import { BaseModel } from './BaseModel';
import { Subject } from '@/types';

export class SubjectModel extends BaseModel {
  static async create(userId: string, value: string, label: string): Promise<Subject> {
    const result = await this.query(
      `INSERT INTO subjects (user_id, value, label) 
       VALUES ($1, $2, $3) 
       RETURNING id, user_id, value, label, created_at`,
      [userId, value, label]
    );
    
    return result.rows[0];
  }
  
  static async findByUserId(userId: string): Promise<Subject[]> {
    const result = await this.query(
      'SELECT id, user_id, value, label, created_at FROM subjects WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    
    return result.rows;
  }
  
  static async findById(id: string, userId: string): Promise<Subject | null> {
    const result = await this.query(
      'SELECT id, user_id, value, label, created_at FROM subjects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    return result.rows[0] || null;
  }
  
  static async update(id: string, userId: string, value: string, label: string): Promise<Subject | null> {
    const result = await this.query(
      `UPDATE subjects 
       SET value = $3, label = $4 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, user_id, value, label, created_at`,
      [id, userId, value, label]
    );
    
    return result.rows[0] || null;
  }
  
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM subjects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    return (result.rowCount || 0) > 0;
  }
  
  static async findByValue(userId: string, value: string): Promise<Subject | null> {
    const result = await this.query(
      'SELECT id, user_id, value, label, created_at FROM subjects WHERE user_id = $1 AND value = $2',
      [userId, value]
    );
    
    return result.rows[0] || null;
  }
}