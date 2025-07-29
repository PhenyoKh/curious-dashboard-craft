/**
 * Syllabus Parser Service
 * 
 * Advanced parser for extracting academic assignment and schedule information
 * from syllabus documents (PDF, Word, text files).
 */

import { assignmentsService, subjectsService, semestersService } from './supabaseService';
import type { 
  ParsedSyllabus,
  AssignmentType,
  AssignmentFormData,
  Semester,
  Subject
} from '../types/assignments';

// Supported file types
export type SyllabusFileType = 'pdf' | 'docx' | 'doc' | 'txt' | 'html';

// Parsing configuration
export interface SyllabusParsingConfig {
  confidence_threshold: number;
  auto_create_assignments: boolean;
  auto_create_subjects: boolean;
  date_format_preferences: string[];
  assignment_type_keywords: Record<AssignmentType, string[]>;
  grade_weight_extraction: boolean;
  instructor_info_extraction: boolean;
}

// Parsing result with confidence scores
export interface SyllabusParsingResult {
  success: boolean;
  confidence_score: number;
  parsed_data: ParsedSyllabus;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  auto_created_items: {
    subjects: number;
    assignments: number;
    semesters: number;
  };
}

// Date pattern recognition
interface DatePattern {
  pattern: RegExp;
  format: string;
  confidence: number;
  examples: string[];
}

// Assignment pattern recognition
interface AssignmentPattern {
  type: AssignmentType;
  keywords: string[];
  patterns: RegExp[];
  context_clues: string[];
  weight: number;
}

// Course information extraction patterns
interface CourseInfoPattern {
  field: 'name' | 'code' | 'instructor' | 'semester' | 'credits' | 'section';
  patterns: RegExp[];
  priority: number;
}

export class SyllabusParserService {
  private config: SyllabusParsingConfig;
  private datePatterns: DatePattern[];
  private assignmentPatterns: AssignmentPattern[];
  private coursePatterns: CourseInfoPattern[];

  constructor(config?: Partial<SyllabusParsingConfig>) {
    this.config = {
      confidence_threshold: 0.7,
      auto_create_assignments: true,
      auto_create_subjects: true,
      date_format_preferences: ['MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'Month DD, YYYY'],
      assignment_type_keywords: {
        'assignment': ['assignment', 'homework', 'hw', 'problem set', 'exercise'],
        'exam': ['exam', 'test', 'midterm', 'final', 'examination'],
        'quiz': ['quiz', 'pop quiz', 'short test', 'assessment'],
        'project': ['project', 'final project', 'group project', 'research project'],
        'paper': ['paper', 'essay', 'report', 'thesis', 'research paper'],
        'presentation': ['presentation', 'oral presentation', 'demo', 'showcase'],
        'lab': ['lab', 'laboratory', 'lab report', 'experiment'],
        'homework': ['homework', 'hw', 'take-home', 'practice problems'],
        'discussion': ['discussion', 'forum post', 'participation', 'seminar']
      },
      grade_weight_extraction: true,
      instructor_info_extraction: true,
      ...config
    };

    this.initializePatterns();
  }

  /**
   * Parse syllabus from file content
   */
  async parseSyllabusFromFile(
    fileContent: string,
    fileType: SyllabusFileType,
    fileName: string,
    userId: string
  ): Promise<SyllabusParsingResult> {
    try {
      // Clean and preprocess content
      const cleanedContent = this.preprocessContent(fileContent, fileType);
      
      // Extract course information
      const courseInfo = this.extractCourseInfo(cleanedContent, fileName);
      
      // Extract assignments and due dates
      const assignments = this.extractAssignments(cleanedContent);
      
      // Extract exam information
      const exams = this.extractExams(cleanedContent);
      
      // Extract important dates
      const importantDates = this.extractImportantDates(cleanedContent);
      
      // Extract grading scale
      const gradingScale = this.extractGradingScale(cleanedContent);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore({
        courseInfo,
        assignments,
        exams,
        importantDates,
        gradingScale
      });

      // Build parsed syllabus
      const parsedData: ParsedSyllabus = {
        course_info: courseInfo,
        assignments,
        exams,
        important_dates: importantDates,
        grading_scale: gradingScale
      };

      // Generate warnings and suggestions
      const warnings = this.generateWarnings(parsedData, confidenceScore);
      const suggestions = this.generateSuggestions(parsedData);

      // Auto-create items if enabled
      const autoCreatedItems = await this.autoCreateItems(parsedData, userId);

      return {
        success: confidenceScore >= this.config.confidence_threshold,
        confidence_score: confidenceScore,
        parsed_data: parsedData,
        warnings,
        errors: [], // Errors would be populated if parsing fails
        suggestions,
        auto_created_items: autoCreatedItems
      };

    } catch (error) {
      return {
        success: false,
        confidence_score: 0,
        parsed_data: {
          course_info: { name: '', code: '', instructor: '', semester: '' },
          assignments: [],
          exams: [],
          important_dates: []
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        suggestions: ['Try a different file format or check if the syllabus is properly formatted'],
        auto_created_items: { subjects: 0, assignments: 0, semesters: 0 }
      };
    }
  }

  /**
   * Parse syllabus from URL (for online syllabi)
   */
  async parseSyllabusFromUrl(url: string, userId: string): Promise<SyllabusParsingResult> {
    try {
      // This would fetch content from URL
      // For now, we'll return a placeholder
      throw new Error('URL parsing not yet implemented');
    } catch (error) {
      return {
        success: false,
        confidence_score: 0,
        parsed_data: {
          course_info: { name: '', code: '', instructor: '', semester: '' },
          assignments: [],
          exams: [],
          important_dates: []
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'URL parsing error'],
        suggestions: ['Try uploading the syllabus as a file instead'],
        auto_created_items: { subjects: 0, assignments: 0, semesters: 0 }
      };
    }
  }

  /**
   * Batch parse multiple syllabi
   */
  async batchParseSyllabi(
    files: Array<{ content: string; type: SyllabusFileType; name: string }>,
    userId: string
  ): Promise<SyllabusParsingResult[]> {
    const results: SyllabusParsingResult[] = [];

    for (const file of files) {
      const result = await this.parseSyllabusFromFile(file.content, file.type, file.name, userId);
      results.push(result);
    }

    return results;
  }

  /**
   * Initialize parsing patterns
   */
  private initializePatterns(): void {
    // Date patterns for various formats
    this.datePatterns = [
      {
        pattern: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})\b/g,
        format: 'MM/DD/YYYY',
        confidence: 0.9,
        examples: ['01/15/2024', '12/31/2023']
      },
      {
        pattern: /\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
        format: 'YYYY-MM-DD',
        confidence: 0.9,
        examples: ['2024-01-15', '2023-12-31']
      },
      {
        pattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
        format: 'Month DD, YYYY',
        confidence: 1.0,
        examples: ['January 15, 2024', 'December 31, 2023']
      },
      {
        pattern: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi,
        format: 'Mon DD, YYYY',
        confidence: 0.8,
        examples: ['Jan 15, 2024', 'Dec. 31, 2023']
      }
    ];

    // Assignment type patterns
    this.assignmentPatterns = Object.entries(this.config.assignment_type_keywords).map(([type, keywords]) => ({
      type: type as AssignmentType,
      keywords,
      patterns: keywords.map(keyword => new RegExp(`\\b${keyword}\\b`, 'gi')),
      context_clues: this.getContextCluesForType(type as AssignmentType),
      weight: this.getWeightForType(type as AssignmentType)
    }));

    // Course information patterns
    this.coursePatterns = [
      {
        field: 'name',
        patterns: [
          /course\s*title:?\s*(.+)/gi,
          /class\s*name:?\s*(.+)/gi,
          /subject:?\s*(.+)/gi
        ],
        priority: 1
      },
      {
        field: 'code',
        patterns: [
          /course\s*code:?\s*([A-Z]{2,4}\s*\d{2,4}[A-Z]?)/gi,
          /\b([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]?)\b/g,
          /class\s*number:?\s*([A-Z]{2,4}\s*\d{2,4})/gi
        ],
        priority: 1
      },
      {
        field: 'instructor',
        patterns: [
          /instructor:?\s*(.+)/gi,
          /professor:?\s*(.+)/gi,
          /teacher:?\s*(.+)/gi,
          /taught\s*by:?\s*(.+)/gi
        ],
        priority: 1
      },
      {
        field: 'semester',
        patterns: [
          /(fall|spring|summer|winter)\s+(\d{4})/gi,
          /semester:?\s*(fall|spring|summer|winter)\s+(\d{4})/gi,
          /term:?\s*(fall|spring|summer|winter)\s+(\d{4})/gi
        ],
        priority: 1
      },
      {
        field: 'credits',
        patterns: [
          /(\d+)\s*credits?/gi,
          /credit\s*hours?:?\s*(\d+)/gi,
          /units?:?\s*(\d+)/gi
        ],
        priority: 0.5
      }
    ];
  }

  /**
   * Preprocess content based on file type
   */
  private preprocessContent(content: string, fileType: SyllabusFileType): string {
    let cleaned = content;

    // Remove common artifacts based on file type
    switch (fileType) {
      case 'pdf':
        // Remove PDF-specific artifacts
        cleaned = cleaned.replace(/\f/g, '\n'); // Form feeds
        cleaned = cleaned.replace(/\s+/g, ' '); // Multiple whitespace
        break;
      
      case 'docx':
      case 'doc':
        // Remove Word-specific artifacts
        cleaned = cleaned.replace(/\r\n/g, '\n');
        cleaned = cleaned.replace(/\t/g, ' ');
        break;
      
      case 'html':
        // Remove HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, ' ');
        cleaned = cleaned.replace(/&[^;]+;/g, ' ');
        break;
    }

    // General cleaning
    cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Extract course information
   */
  private extractCourseInfo(content: string, fileName: string): ParsedSyllabus['course_info'] {
    const courseInfo: ParsedSyllabus['course_info'] = {
      name: '',
      code: '',
      instructor: '',
      semester: ''
    };

    // Try to extract from filename first
    const filenameCode = fileName.match(/([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]?)/i);
    if (filenameCode) {
      courseInfo.code = filenameCode[1].toUpperCase();
    }

    // Extract using patterns
    this.coursePatterns.forEach(pattern => {
      pattern.patterns.forEach(regex => {
        const matches = content.match(regex);
        if (matches) {
          const value = matches[1]?.trim();
          if (value) {
            switch (pattern.field) {
              case 'name':
                if (!courseInfo.name || value.length > courseInfo.name.length) {
                  courseInfo.name = value;
                }
                break;
              case 'code':
                if (!courseInfo.code) {
                  courseInfo.code = value.toUpperCase();
                }
                break;
              case 'instructor':
                if (!courseInfo.instructor) {
                  courseInfo.instructor = value;
                }
                break;
              case 'semester':
                if (!courseInfo.semester) {
                  courseInfo.semester = value;
                }
                break;
              case 'credits': {
                const credits = parseInt(value);
                if (!isNaN(credits)) {
                  courseInfo.credits = credits;
                }
                break;
              }
            }
          }
        }
      });
    });

    return courseInfo;
  }

  /**
   * Extract assignments from content
   */
  private extractAssignments(content: string): ParsedSyllabus['assignments'] {
    const assignments: ParsedSyllabus['assignments'] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Look for assignment indicators
      this.assignmentPatterns.forEach(pattern => {
        const hasKeyword = pattern.keywords.some(keyword => 
          line.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasKeyword) {
          // Extract date from this line or nearby lines
          const dateMatch = this.extractDateFromContext(lines, index, 2);
          
          if (dateMatch) {
            // Extract assignment title
            const title = this.extractAssignmentTitle(line, pattern.keywords);
            
            // Extract weight if present
            const weight = this.extractWeight(line);

            assignments.push({
              title: title || `${pattern.type} ${assignments.length + 1}`,
              type: pattern.type,
              due_date: dateMatch,
              description: this.extractDescription(lines, index),
              weight
            });
          }
        }
      });
    });

    // Remove duplicates and sort by date
    const uniqueAssignments = this.removeDuplicateAssignments(assignments);
    return uniqueAssignments.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
  }

  /**
   * Extract exams from content
   */
  private extractExams(content: string): ParsedSyllabus['exams'] {
    const exams: ParsedSyllabus['exams'] = [];
    const examKeywords = ['exam', 'test', 'midterm', 'final', 'examination'];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      examKeywords.forEach(keyword => {
        if (lowerLine.includes(keyword)) {
          const dateMatch = this.extractDateFromContext(lines, index, 2);
          
          if (dateMatch) {
            const title = this.extractExamTitle(line, keyword);
            const type = this.determineExamType(line);
            const coverage = this.extractCoverage(lines, index);

            exams.push({
              title: title || `${type} Exam`,
              type,
              date: dateMatch,
              coverage
            });
          }
        }
      });
    });

    return this.removeDuplicateExams(exams).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Extract important dates
   */
  private extractImportantDates(content: string): ParsedSyllabus['important_dates'] {
    const importantDates: ParsedSyllabus['important_dates'] = [];
    const dateKeywords = ['deadline', 'due', 'break', 'holiday', 'no class', 'registration'];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains date keywords
      const hasDateKeyword = dateKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasDateKeyword) {
        const dateMatch = this.extractDateFromContext(lines, index, 1);
        
        if (dateMatch) {
          const description = line.trim();
          const type = this.determineDateType(lowerLine);

          importantDates.push({
            date: dateMatch,
            description,
            type
          });
        }
      }
    });

    return importantDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Extract grading scale
   */
  private extractGradingScale(content: string): ParsedSyllabus['grading_scale'] {
    const gradingScale: Record<string, number> = {};
    
    // Look for grading scale patterns
    const gradePatterns = [
      /([A-F][+-]?):?\s*(\d{1,3})%?/gi,
      /(\d{1,3})%?[-–]\s*([A-F][+-]?)/gi
    ];

    gradePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const grade = match[1].toUpperCase();
        const percentage = parseInt(match[2]);
        
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          gradingScale[grade] = percentage;
        }
      }
    });

    return Object.keys(gradingScale).length > 0 ? gradingScale : undefined;
  }

  /**
   * Helper methods for extraction
   */
  private extractDateFromContext(lines: string[], centerIndex: number, range: number): Date | null {
    const startIndex = Math.max(0, centerIndex - range);
    const endIndex = Math.min(lines.length, centerIndex + range + 1);
    
    for (let i = startIndex; i < endIndex; i++) {
      const line = lines[i];
      
      for (const pattern of this.datePatterns) {
        const match = line.match(pattern.pattern);
        if (match) {
          const dateStr = match[0];
          const parsedDate = this.parseDate(dateStr, pattern.format);
          if (parsedDate) {
            return parsedDate;
          }
        }
      }
    }
    
    return null;
  }

  private parseDate(dateStr: string, format: string): Date | null {
    try {
      // This is a simplified date parser
      // In production, you'd want to use a library like date-fns or moment.js
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private extractAssignmentTitle(line: string, keywords: string[]): string {
    let title = line.trim();
    
    // Remove common prefixes
    keywords.forEach(keyword => {
      const regex = new RegExp(`^${keyword}\\s*\\d*:?\\s*`, 'gi');
      title = title.replace(regex, '');
    });
    
    // Clean up the title
    title = title.replace(/^[-–:]\s*/, '');
    title = title.split('(')[0].trim(); // Remove parenthetical info
    
    return title || 'Assignment';
  }

  private extractExamTitle(line: string, keyword: string): string {
    let title = line.trim();
    
    // Keep the keyword but clean up around it
    title = title.replace(/^[-–:]\s*/, '');
    title = title.split('(')[0].trim();
    
    return title || keyword;
  }

  private determineExamType(line: string): 'midterm' | 'final' | 'quiz' {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('final')) return 'final';
    if (lowerLine.includes('midterm')) return 'midterm';
    if (lowerLine.includes('quiz')) return 'quiz';
    
    return 'midterm'; // default
  }

  private determineDateType(line: string): 'assignment' | 'exam' | 'holiday' | 'break' {
    if (line.includes('assignment') || line.includes('homework') || line.includes('due')) {
      return 'assignment';
    }
    if (line.includes('exam') || line.includes('test')) {
      return 'exam';
    }
    if (line.includes('holiday') || line.includes('no class')) {
      return 'holiday';
    }
    if (line.includes('break')) {
      return 'break';
    }
    
    return 'assignment'; // default
  }

  private extractWeight(line: string): number | undefined {
    const weightPatterns = [
      /(\d{1,3})%/g,
      /worth\s+(\d{1,3})\s*points?/gi,
      /(\d{1,3})\s*points?/gi
    ];

    for (const pattern of weightPatterns) {
      const match = line.match(pattern);
      if (match) {
        const weight = parseInt(match[1]);
        if (!isNaN(weight) && weight > 0 && weight <= 100) {
          return weight;
        }
      }
    }

    return undefined;
  }

  private extractDescription(lines: string[], index: number): string | undefined {
    // Look for description in the next few lines
    const nextLines = lines.slice(index + 1, index + 3);
    const description = nextLines
      .filter(line => line.trim().length > 0)
      .join(' ')
      .trim();

    return description.length > 10 ? description : undefined;
  }

  private extractCoverage(lines: string[], index: number): string | undefined {
    // Look for coverage information near the exam mention
    const contextLines = lines.slice(Math.max(0, index - 1), index + 3);
    
    const coverageKeywords = ['chapters?', 'units?', 'sections?', 'material', 'topics?'];
    
    for (const line of contextLines) {
      const lowerLine = line.toLowerCase();
      if (coverageKeywords.some(keyword => lowerLine.includes(keyword))) {
        return line.trim();
      }
    }

    return undefined;
  }

  private removeDuplicateAssignments(assignments: ParsedSyllabus['assignments']): ParsedSyllabus['assignments'] {
    const seen = new Set<string>();
    return assignments.filter(assignment => {
      const key = `${assignment.title}_${assignment.due_date.toISOString()}_${assignment.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private removeDuplicateExams(exams: ParsedSyllabus['exams']): ParsedSyllabus['exams'] {
    const seen = new Set<string>();
    return exams.filter(exam => {
      const key = `${exam.title}_${exam.date.toISOString()}_${exam.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateConfidenceScore(data: {
    courseInfo: ParsedSyllabus['course_info'];
    assignments: ParsedSyllabus['assignments'];
    exams: ParsedSyllabus['exams'];
    importantDates: ParsedSyllabus['important_dates'];
    gradingScale?: ParsedSyllabus['grading_scale'];
  }): number {
    let score = 0;
    let maxScore = 0;

    // Course info score (30% of total)
    maxScore += 30;
    if (data.courseInfo.name) score += 10;
    if (data.courseInfo.code) score += 10;
    if (data.courseInfo.instructor) score += 10;

    // Assignments score (40% of total)
    maxScore += 40;
    if (data.assignments.length > 0) {
      score += Math.min(40, data.assignments.length * 8);
    }

    // Exams score (20% of total)
    maxScore += 20;
    if (data.exams.length > 0) {
      score += Math.min(20, data.exams.length * 10);
    }

    // Additional info score (10% of total)
    maxScore += 10;
    if (data.gradingScale) score += 5;
    if (data.importantDates.length > 0) score += 5;

    return maxScore > 0 ? score / maxScore : 0;
  }

  private generateWarnings(data: ParsedSyllabus, confidence: number): string[] {
    const warnings: string[] = [];

    if (confidence < 0.8) {
      warnings.push('Low confidence in parsing results. Please review extracted information carefully.');
    }

    if (!data.course_info.name) {
      warnings.push('Course name could not be extracted. Please enter manually.');
    }

    if (!data.course_info.code) {
      warnings.push('Course code could not be extracted. Please enter manually.');
    }

    if (data.assignments.length === 0) {
      warnings.push('No assignments were detected. The syllabus may not contain clear assignment information.');
    }

    if (data.exams.length === 0) {
      warnings.push('No exams were detected. Please verify if this course has exams.');
    }

    return warnings;
  }

  private generateSuggestions(data: ParsedSyllabus): string[] {
    const suggestions: string[] = [];

    if (data.assignments.length > 0) {
      suggestions.push('Review extracted assignments and adjust titles, types, or due dates as needed.');
    }

    if (data.exams.length > 0) {
      suggestions.push('Verify exam dates and add any additional exam preparation time to your calendar.');
    }

    if (data.grading_scale) {
      suggestions.push('Grading scale was extracted. You can use this to set grade targets for assignments.');
    }

    suggestions.push('Consider setting up reminders for important dates and deadlines.');

    return suggestions;
  }

  private async autoCreateItems(data: ParsedSyllabus, userId: string): Promise<{
    subjects: number;
    assignments: number;
    semesters: number;
  }> {
    const result = { subjects: 0, assignments: 0, semesters: 0 };

    try {
      // Auto-create subject if enabled
      let subjectId: string | undefined;
      if (this.config.auto_create_subjects && data.course_info.name && data.course_info.code) {
        const subject = await subjectsService.createSubject({
          name: data.course_info.name,
          code: data.course_info.code,
          description: `Auto-created from syllabus: ${data.course_info.instructor}`,
          user_id: userId
        });
        subjectId = subject.id;
        result.subjects = 1;
      }

      // Auto-create assignments if enabled
      if (this.config.auto_create_assignments && data.assignments.length > 0) {
        for (const assignment of data.assignments) {
          await assignmentsService.createAssignment({
            user_id: userId,
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date.toISOString(),
            assignment_type: assignment.type,
            subject_id: subjectId,
            priority: 'Medium',
            status: 'Not Started',
            study_time_estimate: this.estimateStudyTime(assignment.type),
            academic_metadata: {
              source_calendar: 'syllabus_import',
              detection_reasons: ['Extracted from syllabus'],
              instructor_info: {
                name: data.course_info.instructor,
                course: data.course_info.name
              }
            }
          });
          result.assignments++;
        }
      }

    } catch (error) {
      console.error('Error auto-creating items:', error);
    }

    return result;
  }

  private getContextCluesForType(type: AssignmentType): string[] {
    const clues: Record<AssignmentType, string[]> = {
      'assignment': ['due', 'submit', 'turn in'],
      'exam': ['test date', 'exam room', 'bring calculator'],
      'quiz': ['pop quiz', 'short', 'quick'],
      'project': ['final project', 'group work', 'presentation'],
      'paper': ['pages', 'words', 'citations', 'bibliography'],
      'presentation': ['oral', 'slides', 'demo'],
      'lab': ['laboratory', 'experiment', 'results'],
      'homework': ['practice', 'problems', 'exercises'],
      'discussion': ['forum', 'participation', 'post']
    };

    return clues[type] || [];
  }

  private getWeightForType(type: AssignmentType): number {
    const weights: Record<AssignmentType, number> = {
      'assignment': 0.8,
      'exam': 1.0,
      'quiz': 0.6,
      'project': 0.9,
      'paper': 0.9,
      'presentation': 0.7,
      'lab': 0.8,
      'homework': 0.7,
      'discussion': 0.5
    };

    return weights[type] || 0.7;
  }

  private estimateStudyTime(type: AssignmentType): number {
    const estimates: Record<AssignmentType, number> = {
      'assignment': 120,
      'exam': 300,
      'quiz': 60,
      'project': 480,
      'paper': 360,
      'presentation': 240,
      'lab': 180,
      'homework': 90,
      'discussion': 45
    };

    return estimates[type] || 120;
  }
}

// Export singleton instance
export const syllabusParserService = new SyllabusParserService();