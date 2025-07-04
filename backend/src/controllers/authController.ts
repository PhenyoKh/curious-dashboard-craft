import { Request, Response } from 'express';
import { UserModel } from '@/models/User';
import { generateToken } from '@/utils/jwt';
import { ApiResponse } from '@/types';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      } as ApiResponse);
    }
    
    // Create new user
    const user = await UserModel.create(email, password);
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        token
      },
      message: 'User registered successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse);
    }
    
    // Validate password
    const isValidPassword = await UserModel.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse);
    }
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        token
      },
      message: 'Login successful'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const fullUser = await UserModel.findById(user.id);
    if (!fullUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      data: {
        id: fullUser.id,
        email: fullUser.email,
        createdAt: fullUser.created_at,
        updatedAt: fullUser.updated_at
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};