# Grade Tracking System Implementation Plan

## Overview
This document outlines the comprehensive grade tracking and analytics system that will be implemented in a future phase of the Curious Dashboard. The system will provide sophisticated academic performance monitoring, trend analysis, and predictive insights.

## Core Features Planned

### 1. Grade Management
- **Assignment Grade Entry**: Manual input with validation
- **Grade Scale Configuration**: Support for different grading systems (4.0, 100-point, letter grades)
- **Weight Distribution**: Percentage-based weighting for different assignment types
- **Grade Overrides**: Manual adjustments with audit trail
- **Pass/Fail Assignments**: Support for non-graded assignments

### 2. GPA Calculation Engine
```typescript
interface GPACalculator {
  calculateSubjectGPA(subjectId: string, semesterId: string): number;
  calculateSemesterGPA(semesterId: string): number;
  calculateCumulativeGPA(userId: string): number;
  calculateTrendingGPA(userId: string, periods: number): GPATrend;
}
```

### 3. Analytics & Insights
- **Performance Trends**: Visual charts showing grade progression over time
- **Subject Comparisons**: Identify strengths and weaknesses across subjects
- **Predictive Modeling**: Estimate final grades based on current performance
- **Risk Assessment**: Early warning system for courses at risk
- **Study Efficiency Analysis**: Correlation between time spent and grades received

### 4. Reporting Dashboard
- **Grade Distribution Charts**: Visual representation of performance
- **Academic Calendar Integration**: Grade deadlines and submission tracking
- **Progress Reports**: Automated semester and term summaries
- **Parent/Advisor Sharing**: Optional grade sharing with designated users

## Database Schema (Future Implementation)

### Enhanced Assignments Table
```sql
-- Add grade-related fields to assignments table
ALTER TABLE assignments ADD COLUMN:
- max_grade DECIMAL(5,2)                    -- Maximum possible grade
- received_grade DECIMAL(5,2)               -- Actual grade received
- grade_percentage DECIMAL(5,2)             -- Calculated percentage
- weight_percentage DECIMAL(5,2) DEFAULT 0  -- Weight in final grade
- grade_scale VARCHAR(20) DEFAULT 'points'  -- 'points', 'percentage', 'letter', 'gpa'
- is_extra_credit BOOLEAN DEFAULT FALSE     -- Extra credit assignments
- grade_notes TEXT                          -- Instructor feedback
- graded_at TIMESTAMP WITH TIME ZONE        -- When grade was entered
- grade_entered_by UUID                     -- Who entered the grade
```

### Grade Analytics Table
```sql
CREATE TABLE grade_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
    calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Basic Metrics
    total_assignments INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    graded_assignments INTEGER DEFAULT 0,
    
    -- Grade Calculations
    current_points DECIMAL(8,2),
    possible_points DECIMAL(8,2),
    current_percentage DECIMAL(5,2),
    letter_grade VARCHAR(2),
    gpa_value DECIMAL(3,2),
    
    -- Weighted Calculations
    weighted_current DECIMAL(5,2),
    weighted_possible DECIMAL(5,2),
    weighted_percentage DECIMAL(5,2),
    
    -- Trend Analysis
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('improving', 'declining', 'stable', 'insufficient_data')),
    trend_percentage DECIMAL(5,2),
    trend_confidence DECIMAL(3,2),
    
    -- Predictions
    prediction_final_grade DECIMAL(5,2),
    prediction_letter_grade VARCHAR(2),
    prediction_confidence DECIMAL(3,2),
    
    -- Performance Metrics
    consistency_score DECIMAL(3,2),        -- How consistent grades are
    improvement_rate DECIMAL(5,2),         -- Rate of improvement per week
    difficulty_adaptation DECIMAL(3,2),    -- How well user adapts to harder assignments
    
    -- Time Management Correlation
    avg_time_per_point DECIMAL(8,2),       -- Minutes spent per grade point earned
    efficiency_score DECIMAL(3,2),         -- Time spent vs grades correlation
    procrastination_impact DECIMAL(3,2),   -- Impact of late submissions on grades
    
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analytics_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, subject_id, semester_id, calculation_date)
);
```

### Grade History Table
```sql
CREATE TABLE grade_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Grade Information
    grade_value DECIMAL(5,2),
    grade_scale VARCHAR(20),
    max_possible DECIMAL(5,2),
    percentage DECIMAL(5,2),
    letter_grade VARCHAR(2),
    
    -- Context
    change_type VARCHAR(20) CHECK (change_type IN ('initial', 'correction', 'regrade', 'extra_credit')),
    previous_grade DECIMAL(5,2),
    change_reason TEXT,
    
    -- Audit Trail
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);
```

### Grade Scale Configuration
```sql
CREATE TABLE grade_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    scale_type VARCHAR(20) CHECK (scale_type IN ('percentage', 'points', 'letter', 'gpa')),
    
    -- Scale Definition
    scale_config JSONB NOT NULL, -- Flexible JSON configuration for different scales
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Example scale configurations:
-- Percentage: {"ranges": [{"min": 97, "max": 100, "letter": "A+", "gpa": 4.0}, ...]}
-- Points: {"total_points": 1000, "letter_mappings": {...}}
-- Letter: {"A+": 4.0, "A": 4.0, "A-": 3.7, ...}
```

## Advanced Analytics Features

### 1. Predictive Modeling
```typescript
interface GradePrediction {
  predictFinalGrade(assignmentHistory: Assignment[], remainingAssignments: Assignment[]): {
    predicted_grade: number;
    confidence: number;
    scenarios: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
  };
  
  predictRiskLevel(subjectAnalytics: SubjectAnalytics): RiskLevel;
  suggestImprovementActions(analytics: GradeAnalytics): ImprovementSuggestion[];
}
```

### 2. Performance Insights
- **Grade Distribution Analysis**: Identify if grades follow normal distribution
- **Assignment Type Performance**: Which types of assignments perform best/worst
- **Time vs Grade Correlation**: Optimal study time recommendations
- **Deadline Impact Analysis**: How proximity to deadlines affects performance
- **Difficulty Progression**: Track performance as course difficulty increases

### 3. Comparative Analytics
- **Semester Comparisons**: Compare performance across different terms
- **Subject Benchmarking**: Performance relative to historical data
- **Workload Impact**: How assignment density affects grades
- **Study Pattern Optimization**: Best times and methods for different subjects

## User Interface Components

### 1. Grade Entry Interface
```typescript
interface GradeEntryComponent {
  // Quick grade entry with validation
  // Support for different grade scales
  // Batch entry for multiple assignments
  // Grade calculation preview
  // Automatic GPA updates
}
```

### 2. Analytics Dashboard
```typescript
interface GradeAnalyticsDashboard {
  // Current GPA display with trends
  // Subject performance comparison charts
  // Grade prediction visualizations
  // Risk alerts and recommendations
  // Time-based performance charts
}
```

### 3. Reports Generator
```typescript
interface ReportsGenerator {
  // Semester summary reports
  // Subject performance reports
  // Trend analysis reports
  // Predictive outlook reports
  // Exportable formats (PDF, CSV, etc.)
}
```

## Implementation Phases

### Phase 1: Basic Grade Entry
- Add grade fields to assignments table
- Create simple grade input interface
- Basic GPA calculation
- Grade history tracking

### Phase 2: Analytics Engine
- Implement grade analytics table
- Build trend analysis algorithms
- Create performance metrics calculations
- Develop prediction models

### Phase 3: Advanced Features
- Comparative analytics
- Risk assessment system
- Study optimization recommendations
- Advanced reporting dashboard

### Phase 4: Integration & Polish
- Calendar integration for grade deadlines
- Mobile app grade entry
- Sharing and collaboration features
- Performance optimizations

## Security & Privacy Considerations

### Data Protection
- Encryption of sensitive grade data
- Audit trail for all grade changes
- Role-based access control
- Secure grade sharing mechanisms

### Academic Integrity
- Grade tampering detection
- Change history preservation
- Authorized user validation
- Backup and recovery systems

## Success Metrics

### User Engagement
- Grade entry frequency and completeness
- Dashboard usage patterns
- Report generation statistics
- Feature adoption rates

### Academic Impact
- Improved grade awareness
- Better academic planning
- Increased on-time assignment completion
- Enhanced study time optimization

### System Performance
- Real-time calculation accuracy
- Prediction model reliability
- Dashboard load times
- Data integrity maintenance

## Integration Points

### Calendar System
- Grade deadlines synchronization
- Study session planning based on grade goals
- Assignment priority weighting
- Deadline impact predictions

### Existing Features
- Assignment management integration
- Subject organization enhancement
- Note-taking correlation with performance
- Schedule optimization based on grade patterns

## Future Enhancements

### AI/ML Features
- Personalized study recommendations
- Automated grade predictions
- Learning pattern recognition
- Performance optimization suggestions

### Collaborative Features
- Study group grade sharing
- Peer performance comparisons
- Tutor/advisor access
- Parent/guardian reporting

This comprehensive grade tracking system will transform the assignments feature into a complete academic performance management platform, providing students with deep insights into their academic progress and actionable recommendations for improvement.