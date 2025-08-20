/**
 * Dependency Audit Utilities - Phase 0.2 Enhancement
 * 
 * Comprehensive useEffect dependency analysis and stability monitoring
 * for payment flow components. Tracks dependency changes, stability patterns,
 * and potential infinite loop risks across the payment and auth ecosystem.
 * 
 * This utility creates a dependency stability matrix to identify
 * problematic dependency patterns that could cause render loops or
 * performance degradation in critical payment flows.
 */

import { logger } from '@/utils/logger';

// Payment flow component categories for targeted analysis
export const PAYMENT_FLOW_COMPONENTS = {
  CRITICAL_PATH: [
    'AuthScreen',
    'AuthCallback', 
    'PaymentCallback',
    'Pricing'
  ],
  CONTEXTS: [
    'AuthContext',
    'PaymentIntentContext', 
    'SubscriptionContext'
  ],
  SUPPORTING: [
    'AutoTrialWrapper',
    'TrialWelcomeMessage',
    'SubscriptionTab',
    'useAutoTrial'
  ]
} as const;

export interface DependencyInfo {
  name: string;
  type: 'primitive' | 'object' | 'array' | 'function' | 'hook_result' | 'context_value' | 'state' | 'ref' | 'unknown';
  isStable: boolean;
  changeFrequency: number; // Changes per minute
  lastChanged: number;
  source: 'props' | 'state' | 'context' | 'hook' | 'imported' | 'inline' | 'computed';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  potentialIssues: string[];
}

export interface EffectDependencyAnalysis {
  effectId: string;
  effectName: string;
  componentName: string;
  filePath: string;
  dependencies: DependencyInfo[];
  dependencyCount: number;
  stabilityScore: number; // 0-100, higher is more stable
  executionFrequency: number; // Executions per minute
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  recommendations: string[];
  lastAnalyzed: number;
  
  // Pattern analysis
  hasObjectDependencies: boolean;
  hasInlineDependencies: boolean;
  hasFunctionDependencies: boolean;
  hasDeepObjectAccess: boolean;
  missesMemoization: boolean;
  
  // Execution tracking
  totalExecutions: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  burstExecutions: number;
}

export interface DependencyStabilityMatrix {
  timestamp: number;
  reportId: string;
  componentAnalyses: Map<string, EffectDependencyAnalysis[]>;
  
  // Global stability metrics
  overallStabilityScore: number;
  criticalIssueCount: number;
  highRiskEffectCount: number;
  
  // Pattern analysis
  commonInstabilityPatterns: Map<string, number>;
  mostProblematicDependencies: DependencyInfo[];
  crossComponentIssues: string[];
  
  // Recommendations
  globalRecommendations: string[];
  priorityFixes: Array<{
    component: string;
    effectName: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }>;
}

// Dependency stability patterns to detect
const INSTABILITY_PATTERNS = {
  INLINE_OBJECT: /\{[^}]+\}/,
  INLINE_ARRAY: /\[[^\]]*\]/,
  DEEP_ACCESS: /\w+\.\w+\.\w+/,
  FUNCTION_CALL: /\w+\([^)]*\)/,
  COMPUTED_VALUE: /\w+\s*[\+\-\*\/\%]\s*\w+/,
  OBJECT_SPREAD: /\.\.\.[\w\.]+/
} as const;

// Risk assessment criteria
const RISK_THRESHOLDS = {
  EXECUTION_FREQUENCY: {
    LOW: 1,    // < 1 execution per minute
    MEDIUM: 5, // 1-5 executions per minute  
    HIGH: 15,  // 5-15 executions per minute
    CRITICAL: 15 // > 15 executions per minute
  },
  DEPENDENCY_COUNT: {
    LOW: 3,
    MEDIUM: 6,
    HIGH: 10,
    CRITICAL: 10
  },
  STABILITY_SCORE: {
    CRITICAL: 30,
    HIGH: 50,
    MEDIUM: 70,
    LOW: 70
  }
} as const;

class DependencyAuditManager {
  private static instance: DependencyAuditManager;
  private effectAnalyses: Map<string, EffectDependencyAnalysis> = new Map();
  private dependencyChangeHistory: Map<string, number[]> = new Map();
  private executionHistory: Map<string, number[]> = new Map();
  
  static getInstance(): DependencyAuditManager {
    if (!DependencyAuditManager.instance) {
      DependencyAuditManager.instance = new DependencyAuditManager();
    }
    return DependencyAuditManager.instance;
  }

  /**
   * Analyze effect dependencies for stability and risk
   */
  analyzeEffect(
    effectId: string,
    effectName: string,
    componentName: string,
    filePath: string,
    dependencyList: any[],
    executionTime?: number
  ): EffectDependencyAnalysis {
    const currentTime = Date.now();
    
    // Analyze each dependency
    const dependencies = dependencyList.map((dep, index) => 
      this.analyzeDependency(dep, index, effectId)
    );
    
    // Calculate stability score
    const stabilityScore = this.calculateStabilityScore(dependencies);
    
    // Determine execution frequency
    const executionFrequency = this.calculateExecutionFrequency(effectId);
    
    // Assess risk level
    const riskLevel = this.assessRiskLevel(dependencies.length, executionFrequency, stabilityScore);
    
    // Detect patterns and issues
    const issues = this.detectIssues(dependencies, executionFrequency, stabilityScore);
    const recommendations = this.generateRecommendations(dependencies, issues);
    
    // Pattern detection
    const patterns = this.detectPatterns(dependencies);
    
    const analysis: EffectDependencyAnalysis = {
      effectId,
      effectName,
      componentName,
      filePath,
      dependencies,
      dependencyCount: dependencies.length,
      stabilityScore,
      executionFrequency,
      riskLevel,
      issues,
      recommendations,
      lastAnalyzed: currentTime,
      ...patterns,
      totalExecutions: this.getTotalExecutions(effectId),
      averageExecutionTime: this.getAverageExecutionTime(effectId),
      maxExecutionTime: this.getMaxExecutionTime(effectId),
      burstExecutions: this.getBurstExecutions(effectId)
    };
    
    // Store analysis
    this.effectAnalyses.set(effectId, analysis);
    
    // Track execution if provided
    if (executionTime !== undefined) {
      this.recordExecution(effectId, executionTime);
    }
    
    // Log analysis
    this.logEffectAnalysis(analysis);
    
    return analysis;
  }

  /**
   * Analyze individual dependency for stability
   */
  private analyzeDependency(dependency: any, index: number, effectId: string): DependencyInfo {
    const name = this.getDependencyName(dependency, index);
    const type = this.getDependencyType(dependency);
    const source = this.getDependencySource(dependency, name);
    
    // Track dependency changes
    const changeFrequency = this.calculateChangeFrequency(effectId, name);
    const isStable = changeFrequency < 1; // Less than 1 change per minute
    
    // Assess risk
    const { riskLevel, potentialIssues } = this.assessDependencyRisk(dependency, type, source, changeFrequency);
    
    return {
      name,
      type,
      isStable,
      changeFrequency,
      lastChanged: Date.now(),
      source,
      riskLevel,
      potentialIssues
    };
  }

  /**
   * Extract dependency name for tracking
   */
  private getDependencyName(dependency: any, index: number): string {
    if (typeof dependency === 'string') return dependency;
    if (dependency && typeof dependency === 'object') {
      if (dependency.constructor?.name) return dependency.constructor.name;
      if (dependency._contextId) return `Context-${dependency._contextId}`;
      return `Object-${index}`;
    }
    if (typeof dependency === 'function') {
      return dependency.name || `Function-${index}`;
    }
    return `Dependency-${index}`;
  }

  /**
   * Determine dependency type
   */
  private getDependencyType(dependency: any): DependencyInfo['type'] {
    if (dependency === null || dependency === undefined) return 'primitive';
    
    const type = typeof dependency;
    if (type === 'string' || type === 'number' || type === 'boolean') return 'primitive';
    if (type === 'function') return 'function';
    if (Array.isArray(dependency)) return 'array';
    if (type === 'object') {
      // Check for specific patterns
      if (dependency._contextId) return 'context_value';
      if (dependency.current !== undefined) return 'ref';
      if (dependency.data !== undefined || dependency.isLoading !== undefined) return 'hook_result';
      return 'object';
    }
    
    return 'unknown';
  }

  /**
   * Determine dependency source
   */
  private getDependencySource(dependency: any, name: string): DependencyInfo['source'] {
    if (name.includes('Context')) return 'context';
    if (name.includes('useState') || name.includes('State')) return 'state';
    if (name.includes('useRef') || name.includes('Ref')) return 'state';
    if (name.includes('use') || name.includes('hook')) return 'hook';
    if (name.includes('props') || name.includes('Prop')) return 'props';
    if (typeof dependency === 'function' && !dependency.name) return 'inline';
    if (typeof dependency === 'object' && dependency && !dependency.constructor?.name) return 'inline';
    
    return 'imported';
  }

  /**
   * Calculate dependency change frequency
   */
  private calculateChangeFrequency(effectId: string, dependencyName: string): number {
    const key = `${effectId}-${dependencyName}`;
    const history = this.dependencyChangeHistory.get(key) || [];
    
    // Count changes in last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentChanges = history.filter(timestamp => timestamp > oneMinuteAgo);
    
    return recentChanges.length;
  }

  /**
   * Assess dependency risk level
   */
  private assessDependencyRisk(
    dependency: any, 
    type: DependencyInfo['type'], 
    source: DependencyInfo['source'],
    changeFrequency: number
  ): { riskLevel: DependencyInfo['riskLevel'], potentialIssues: string[] } {
    const issues: string[] = [];
    let riskLevel: DependencyInfo['riskLevel'] = 'low';

    // High change frequency
    if (changeFrequency > 10) {
      issues.push(`High change frequency: ${changeFrequency} changes/min`);
      riskLevel = 'critical';
    } else if (changeFrequency > 5) {
      issues.push(`Medium change frequency: ${changeFrequency} changes/min`);
      riskLevel = Math.max(riskLevel as any, 'high' as any) as DependencyInfo['riskLevel'];
    }

    // Inline dependencies
    if (source === 'inline') {
      issues.push('Inline dependency - created on every render');
      riskLevel = Math.max(riskLevel as any, 'high' as any) as DependencyInfo['riskLevel'];
    }

    // Object/Array dependencies without memoization
    if ((type === 'object' || type === 'array') && source !== 'context') {
      issues.push('Object/Array dependency - may cause unnecessary re-renders');
      riskLevel = Math.max(riskLevel as any, 'medium' as any) as DependencyInfo['riskLevel'];
    }

    // Function dependencies
    if (type === 'function' && source === 'inline') {
      issues.push('Inline function dependency - recreated on every render');
      riskLevel = Math.max(riskLevel as any, 'high' as any) as DependencyInfo['riskLevel'];
    }

    return { riskLevel, potentialIssues: issues };
  }

  /**
   * Calculate overall stability score for effect
   */
  private calculateStabilityScore(dependencies: DependencyInfo[]): number {
    if (dependencies.length === 0) return 100;

    let totalScore = 0;
    for (const dep of dependencies) {
      let depScore = 100;
      
      // Penalize high change frequency
      depScore -= Math.min(dep.changeFrequency * 10, 50);
      
      // Penalize unstable types
      if (dep.type === 'object' && dep.source === 'inline') depScore -= 30;
      if (dep.type === 'array' && dep.source === 'inline') depScore -= 25;
      if (dep.type === 'function' && dep.source === 'inline') depScore -= 40;
      
      // Penalize risk level
      if (dep.riskLevel === 'critical') depScore -= 40;
      else if (dep.riskLevel === 'high') depScore -= 30;
      else if (dep.riskLevel === 'medium') depScore -= 15;
      
      totalScore += Math.max(depScore, 0);
    }

    return Math.round(totalScore / dependencies.length);
  }

  /**
   * Calculate effect execution frequency
   */
  private calculateExecutionFrequency(effectId: string): number {
    const history = this.executionHistory.get(effectId) || [];
    const oneMinuteAgo = Date.now() - 60000;
    const recentExecutions = history.filter(timestamp => timestamp > oneMinuteAgo);
    
    return recentExecutions.length;
  }

  /**
   * Assess overall risk level for effect
   */
  private assessRiskLevel(
    dependencyCount: number,
    executionFrequency: number,
    stabilityScore: number
  ): EffectDependencyAnalysis['riskLevel'] {
    let riskLevel: EffectDependencyAnalysis['riskLevel'] = 'low';

    // Check execution frequency
    if (executionFrequency > RISK_THRESHOLDS.EXECUTION_FREQUENCY.CRITICAL) {
      riskLevel = 'critical';
    } else if (executionFrequency > RISK_THRESHOLDS.EXECUTION_FREQUENCY.HIGH) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    } else if (executionFrequency > RISK_THRESHOLDS.EXECUTION_FREQUENCY.MEDIUM) {
      riskLevel = Math.max(riskLevel as any, 'medium' as any);
    }

    // Check dependency count
    if (dependencyCount > RISK_THRESHOLDS.DEPENDENCY_COUNT.CRITICAL) {
      riskLevel = Math.max(riskLevel as any, 'critical' as any);
    } else if (dependencyCount > RISK_THRESHOLDS.DEPENDENCY_COUNT.HIGH) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    } else if (dependencyCount > RISK_THRESHOLDS.DEPENDENCY_COUNT.MEDIUM) {
      riskLevel = Math.max(riskLevel as any, 'medium' as any);
    }

    // Check stability score
    if (stabilityScore < RISK_THRESHOLDS.STABILITY_SCORE.CRITICAL) {
      riskLevel = 'critical';
    } else if (stabilityScore < RISK_THRESHOLDS.STABILITY_SCORE.HIGH) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    } else if (stabilityScore < RISK_THRESHOLDS.STABILITY_SCORE.MEDIUM) {
      riskLevel = Math.max(riskLevel as any, 'medium' as any);
    }

    return riskLevel;
  }

  /**
   * Detect issues with effect dependencies
   */
  private detectIssues(
    dependencies: DependencyInfo[],
    executionFrequency: number,
    stabilityScore: number
  ): string[] {
    const issues: string[] = [];

    // High execution frequency
    if (executionFrequency > 15) {
      issues.push(`Critical: Effect executing ${executionFrequency} times/min - potential infinite loop`);
    } else if (executionFrequency > 5) {
      issues.push(`High: Effect executing ${executionFrequency} times/min - check dependencies`);
    }

    // Low stability score
    if (stabilityScore < 30) {
      issues.push(`Critical: Very low stability score (${stabilityScore}/100) - dependencies changing frequently`);
    } else if (stabilityScore < 50) {
      issues.push(`High: Low stability score (${stabilityScore}/100) - unstable dependencies`);
    }

    // Too many dependencies
    if (dependencies.length > 10) {
      issues.push(`Medium: High dependency count (${dependencies.length}) - consider breaking into smaller effects`);
    }

    // Inline dependencies
    const inlineDeps = dependencies.filter(d => d.source === 'inline');
    if (inlineDeps.length > 0) {
      issues.push(`High: ${inlineDeps.length} inline dependencies - will cause unnecessary re-renders`);
    }

    // Critical individual dependencies
    const criticalDeps = dependencies.filter(d => d.riskLevel === 'critical');
    if (criticalDeps.length > 0) {
      issues.push(`Critical: ${criticalDeps.length} critical dependencies detected`);
    }

    return issues;
  }

  /**
   * Generate recommendations for effect optimization
   */
  private generateRecommendations(dependencies: DependencyInfo[], issues: string[]): string[] {
    const recommendations: string[] = [];

    // Inline dependency fixes
    const inlineDeps = dependencies.filter(d => d.source === 'inline');
    if (inlineDeps.length > 0) {
      if (inlineDeps.some(d => d.type === 'function')) {
        recommendations.push('Wrap inline functions with useCallback');
      }
      if (inlineDeps.some(d => d.type === 'object')) {
        recommendations.push('Wrap inline objects with useMemo');
      }
      if (inlineDeps.some(d => d.type === 'array')) {
        recommendations.push('Wrap inline arrays with useMemo');
      }
    }

    // High change frequency fixes
    const highChangeDeps = dependencies.filter(d => d.changeFrequency > 5);
    if (highChangeDeps.length > 0) {
      recommendations.push('Investigate why dependencies are changing frequently');
      recommendations.push('Consider debouncing or throttling dependency updates');
    }

    // Dependency count optimization
    if (dependencies.length > 6) {
      recommendations.push('Consider splitting effect into multiple smaller effects');
      recommendations.push('Extract derived values to separate useMemo hooks');
    }

    // Context dependency optimization
    const contextDeps = dependencies.filter(d => d.type === 'context_value');
    if (contextDeps.length > 1) {
      recommendations.push('Consider using context selector pattern to reduce re-renders');
    }

    // Critical issues
    if (issues.some(i => i.includes('Critical'))) {
      recommendations.push('URGENT: Address critical dependency issues to prevent performance problems');
    }

    return recommendations;
  }

  /**
   * Detect dependency patterns
   */
  private detectPatterns(dependencies: DependencyInfo[]): {
    hasObjectDependencies: boolean;
    hasInlineDependencies: boolean;
    hasFunctionDependencies: boolean;
    hasDeepObjectAccess: boolean;
    missesMemoization: boolean;
  } {
    return {
      hasObjectDependencies: dependencies.some(d => d.type === 'object'),
      hasInlineDependencies: dependencies.some(d => d.source === 'inline'),
      hasFunctionDependencies: dependencies.some(d => d.type === 'function'),
      hasDeepObjectAccess: dependencies.some(d => d.name.includes('.')),
      missesMemoization: dependencies.some(d => 
        d.source === 'inline' && (d.type === 'object' || d.type === 'array' || d.type === 'function')
      )
    };
  }

  /**
   * Record effect execution for frequency tracking
   */
  recordExecution(effectId: string, executionTime: number): void {
    const currentTime = Date.now();
    
    // Record execution timestamp
    if (!this.executionHistory.has(effectId)) {
      this.executionHistory.set(effectId, []);
    }
    const history = this.executionHistory.get(effectId)!;
    history.push(currentTime);
    
    // Keep only last 100 executions
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Record dependency change for stability tracking
   */
  recordDependencyChange(effectId: string, dependencyName: string): void {
    const key = `${effectId}-${dependencyName}`;
    const currentTime = Date.now();
    
    if (!this.dependencyChangeHistory.has(key)) {
      this.dependencyChangeHistory.set(key, []);
    }
    const history = this.dependencyChangeHistory.get(key)!;
    history.push(currentTime);
    
    // Keep only last 50 changes
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Get execution statistics for effect
   */
  private getTotalExecutions(effectId: string): number {
    return this.executionHistory.get(effectId)?.length || 0;
  }

  private getAverageExecutionTime(effectId: string): number {
    // This would need to be implemented with execution timing tracking
    return 0;
  }

  private getMaxExecutionTime(effectId: string): number {
    // This would need to be implemented with execution timing tracking
    return 0;
  }

  private getBurstExecutions(effectId: string): number {
    const history = this.executionHistory.get(effectId) || [];
    const fiveSecondsAgo = Date.now() - 5000;
    return history.filter(timestamp => timestamp > fiveSecondsAgo).length;
  }

  /**
   * Log effect analysis results
   */
  private logEffectAnalysis(analysis: EffectDependencyAnalysis): void {
    const riskIcon = analysis.riskLevel === 'critical' ? '🚨' : 
                    analysis.riskLevel === 'high' ? '⚠️' : 
                    analysis.riskLevel === 'medium' ? '🟡' : '✅';

    console.log(`📋 DEPENDENCY ANALYSIS ${riskIcon} [${analysis.componentName}] - ${analysis.effectName}:`, {
      stabilityScore: `${analysis.stabilityScore}/100`,
      riskLevel: analysis.riskLevel,
      executionFrequency: `${analysis.executionFrequency}/min`,
      dependencyCount: analysis.dependencyCount,
      patterns: {
        hasInline: analysis.hasInlineDependencies,
        hasObjects: analysis.hasObjectDependencies,
        hasFunctions: analysis.hasFunctionDependencies,
        missesMemo: analysis.missesMemoization
      },
      issues: analysis.issues.length,
      recommendations: analysis.recommendations.length,
      criticalDependencies: analysis.dependencies.filter(d => d.riskLevel === 'critical').length
    });

    if (analysis.issues.length > 0) {
      console.log(`🔍 DEPENDENCY ISSUES [${analysis.componentName}]:`, analysis.issues);
    }

    if (analysis.recommendations.length > 0) {
      console.log(`💡 DEPENDENCY RECOMMENDATIONS [${analysis.componentName}]:`, 
        analysis.recommendations.slice(0, 3)); // Top 3 recommendations
    }

    // Log to structured logger
    logger.performance('Dependency analysis completed', {
      component: analysis.componentName,
      effect: analysis.effectName,
      stabilityScore: analysis.stabilityScore,
      riskLevel: analysis.riskLevel,
      executionFrequency: analysis.executionFrequency,
      dependencyCount: analysis.dependencyCount,
      issueCount: analysis.issues.length,
      recommendationCount: analysis.recommendations.length
    });
  }

  /**
   * Generate comprehensive dependency stability matrix
   */
  generateStabilityMatrix(): DependencyStabilityMatrix {
    const currentTime = Date.now();
    const reportId = Math.random().toString(36).substr(2, 9);
    
    // Group analyses by component
    const componentAnalyses = new Map<string, EffectDependencyAnalysis[]>();
    for (const analysis of this.effectAnalyses.values()) {
      if (!componentAnalyses.has(analysis.componentName)) {
        componentAnalyses.set(analysis.componentName, []);
      }
      componentAnalyses.get(analysis.componentName)!.push(analysis);
    }

    // Calculate global metrics
    const allAnalyses = Array.from(this.effectAnalyses.values());
    const overallStabilityScore = allAnalyses.length > 0 
      ? allAnalyses.reduce((sum, a) => sum + a.stabilityScore, 0) / allAnalyses.length 
      : 100;
    
    const criticalIssueCount = allAnalyses.reduce((sum, a) => 
      sum + a.issues.filter(i => i.includes('Critical')).length, 0
    );
    
    const highRiskEffectCount = allAnalyses.filter(a => 
      a.riskLevel === 'high' || a.riskLevel === 'critical'
    ).length;

    // Analyze common patterns
    const commonPatterns = new Map<string, number>();
    const problematicDependencies: DependencyInfo[] = [];
    
    for (const analysis of allAnalyses) {
      // Count patterns
      if (analysis.hasInlineDependencies) {
        commonPatterns.set('inline-dependencies', (commonPatterns.get('inline-dependencies') || 0) + 1);
      }
      if (analysis.hasObjectDependencies) {
        commonPatterns.set('object-dependencies', (commonPatterns.get('object-dependencies') || 0) + 1);
      }
      if (analysis.hasFunctionDependencies) {
        commonPatterns.set('function-dependencies', (commonPatterns.get('function-dependencies') || 0) + 1);
      }
      if (analysis.missesMemoization) {
        commonPatterns.set('missing-memoization', (commonPatterns.get('missing-memoization') || 0) + 1);
      }
      
      // Collect problematic dependencies
      problematicDependencies.push(...analysis.dependencies.filter(d => 
        d.riskLevel === 'high' || d.riskLevel === 'critical'
      ));
    }

    // Generate cross-component issues
    const crossComponentIssues: string[] = [];
    if (criticalIssueCount > 5) {
      crossComponentIssues.push(`System-wide instability: ${criticalIssueCount} critical dependency issues`);
    }
    if (highRiskEffectCount > allAnalyses.length / 2) {
      crossComponentIssues.push(`High-risk effect concentration: ${highRiskEffectCount}/${allAnalyses.length} effects at risk`);
    }

    // Generate global recommendations
    const globalRecommendations = this.generateGlobalRecommendations(
      commonPatterns, 
      problematicDependencies, 
      allAnalyses
    );

    // Generate priority fixes
    const priorityFixes = this.generatePriorityFixes(allAnalyses);

    const matrix: DependencyStabilityMatrix = {
      timestamp: currentTime,
      reportId,
      componentAnalyses,
      overallStabilityScore: Math.round(overallStabilityScore),
      criticalIssueCount,
      highRiskEffectCount,
      commonInstabilityPatterns: commonPatterns,
      mostProblematicDependencies: problematicDependencies.slice(0, 10),
      crossComponentIssues,
      globalRecommendations,
      priorityFixes: priorityFixes.slice(0, 10) // Top 10 priority fixes
    };

    this.logStabilityMatrix(matrix);

    return matrix;
  }

  /**
   * Generate global recommendations based on patterns
   */
  private generateGlobalRecommendations(
    patterns: Map<string, number>,
    problematicDeps: DependencyInfo[],
    analyses: EffectDependencyAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Pattern-based recommendations
    if ((patterns.get('inline-dependencies') || 0) > analyses.length / 3) {
      recommendations.push('Implement consistent memoization strategy across components');
    }

    if ((patterns.get('object-dependencies') || 0) > analyses.length / 2) {
      recommendations.push('Consider using dependency injection or context selectors to reduce object dependencies');
    }

    if ((patterns.get('missing-memoization') || 0) > 5) {
      recommendations.push('Add ESLint rules to enforce useCallback and useMemo usage');
    }

    // Problematic dependency recommendations
    const contextDeps = problematicDeps.filter(d => d.type === 'context_value');
    if (contextDeps.length > 3) {
      recommendations.push('Optimize context usage - consider splitting large contexts or using selectors');
    }

    const functionDeps = problematicDeps.filter(d => d.type === 'function');
    if (functionDeps.length > 5) {
      recommendations.push('Review function dependencies - many can be memoized or moved outside components');
    }

    // System-wide recommendations
    const highRiskAnalyses = analyses.filter(a => a.riskLevel === 'critical' || a.riskLevel === 'high');
    if (highRiskAnalyses.length > 3) {
      recommendations.push('Implement dependency monitoring in CI/CD pipeline');
      recommendations.push('Consider architectural refactoring for better dependency isolation');
    }

    return recommendations;
  }

  /**
   * Generate priority fixes based on impact and effort
   */
  private generatePriorityFixes(analyses: EffectDependencyAnalysis[]): Array<{
    component: string;
    effectName: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }> {
    const fixes: Array<{
      component: string;
      effectName: string;
      issue: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'low' | 'medium' | 'high';
    }> = [];

    for (const analysis of analyses) {
      if (analysis.riskLevel === 'critical') {
        fixes.push({
          component: analysis.componentName,
          effectName: analysis.effectName,
          issue: 'Critical stability issues detected',
          impact: 'high',
          effort: analysis.hasInlineDependencies ? 'low' : 'medium'
        });
      }

      if (analysis.hasInlineDependencies && analysis.executionFrequency > 5) {
        fixes.push({
          component: analysis.componentName,
          effectName: analysis.effectName,
          issue: 'Inline dependencies causing frequent re-renders',
          impact: 'medium',
          effort: 'low'
        });
      }

      if (analysis.dependencyCount > 8) {
        fixes.push({
          component: analysis.componentName,
          effectName: analysis.effectName,
          issue: 'Too many dependencies - consider splitting effect',
          impact: 'medium',
          effort: 'high'
        });
      }
    }

    // Sort by impact (high first) then by effort (low first)
    return fixes.sort((a, b) => {
      if (a.impact !== b.impact) {
        return a.impact === 'high' ? -1 : b.impact === 'high' ? 1 : 0;
      }
      return a.effort === 'low' ? -1 : b.effort === 'low' ? 1 : 0;
    });
  }

  /**
   * Log comprehensive stability matrix
   */
  private logStabilityMatrix(matrix: DependencyStabilityMatrix): void {
    const healthIcon = matrix.overallStabilityScore >= 80 ? '✅' : 
                      matrix.overallStabilityScore >= 60 ? '⚠️' : '🚨';

    console.log(`📊 DEPENDENCY STABILITY MATRIX ${healthIcon} [Report ID: ${matrix.reportId}]:`, {
      summary: {
        components: matrix.componentAnalyses.size,
        totalEffects: Array.from(matrix.componentAnalyses.values()).flat().length,
        stabilityScore: `${matrix.overallStabilityScore}/100`,
        criticalIssues: matrix.criticalIssueCount,
        highRiskEffects: matrix.highRiskEffectCount
      },
      patterns: Object.fromEntries(matrix.commonInstabilityPatterns),
      topIssues: matrix.crossComponentIssues.slice(0, 3),
      topRecommendations: matrix.globalRecommendations.slice(0, 3),
      priorityFixes: matrix.priorityFixes.slice(0, 5).map(f => ({
        component: f.component,
        issue: f.issue.slice(0, 50) + '...',
        impact: f.impact,
        effort: f.effort
      }))
    });

    // Log individual component summaries
    for (const [component, analyses] of matrix.componentAnalyses) {
      const componentStability = analyses.reduce((sum, a) => sum + a.stabilityScore, 0) / analyses.length;
      const criticalCount = analyses.filter(a => a.riskLevel === 'critical').length;
      
      if (criticalCount > 0 || componentStability < 60) {
        console.log(`🔍 COMPONENT ANALYSIS [${component}]:`, {
          effects: analyses.length,
          stabilityScore: `${Math.round(componentStability)}/100`,
          criticalEffects: criticalCount,
          highRiskEffects: analyses.filter(a => a.riskLevel === 'high').length,
          avgExecutionFreq: `${(analyses.reduce((sum, a) => sum + a.executionFrequency, 0) / analyses.length).toFixed(1)}/min`
        });
      }
    }
  }

  /**
   * Get all effect analyses
   */
  getAllAnalyses(): EffectDependencyAnalysis[] {
    return Array.from(this.effectAnalyses.values());
  }

  /**
   * Get analysis for specific effect
   */
  getAnalysis(effectId: string): EffectDependencyAnalysis | null {
    return this.effectAnalyses.get(effectId) || null;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.effectAnalyses.clear();
    this.dependencyChangeHistory.clear();
    this.executionHistory.clear();
    console.log('🔄 Dependency audit manager reset');
  }
}

// Export singleton instance
export const dependencyAuditor = DependencyAuditManager.getInstance();

// Utility functions for easy integration
export const analyzeEffectDependencies = (
  effectId: string,
  effectName: string,
  componentName: string,
  filePath: string,
  dependencies: any[],
  executionTime?: number
): EffectDependencyAnalysis => {
  return dependencyAuditor.analyzeEffect(effectId, effectName, componentName, filePath, dependencies, executionTime);
};

export const recordEffectExecution = (effectId: string, executionTime: number): void => {
  dependencyAuditor.recordExecution(effectId, executionTime);
};

export const recordDependencyChange = (effectId: string, dependencyName: string): void => {
  dependencyAuditor.recordDependencyChange(effectId, dependencyName);
};

export const generateDependencyMatrix = (): DependencyStabilityMatrix => {
  return dependencyAuditor.generateStabilityMatrix();
};

// Auto-generate stability matrix every 3 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const analyses = dependencyAuditor.getAllAnalyses();
    if (analyses.length > 0) {
      generateDependencyMatrix();
    }
  }, 180000); // 3 minutes
}