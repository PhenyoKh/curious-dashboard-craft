import { BaseModel } from './BaseModel';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export class UserModel extends BaseModel {
  static async create(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await this.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, password_hash, created_at, updated_at`,
      [email, passwordHash]
    );
    
    return result.rows[0];
  }
  
  static async findByEmail(email: string): Promise<User | null> {
    const result = await this.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  }
  
  static async findById(id: string): Promise<User | null> {
    const result = await this.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }
  
  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  static async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await this.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );
  }
}