/**
 * Dependency Stability Matrix Generator - Phase 0.2 Completion
 * 
 * Generates comprehensive analysis reports of useEffect dependency stability
 * across all payment flow components. Provides actionable insights and 
 * recommendations for optimizing dependency management.
 * 
 * This creates the final dependency stability matrix with cross-component
 * analysis, risk assessment, and priority-based fix recommendations.
 */

import { 
  dependencyAuditor, 
  generateDependencyMatrix, 
  type DependencyStabilityMatrix,
  type EffectDependencyAnalysis,
  PAYMENT_FLOW_COMPONENTS
} from '@/utils/dependencyAudit';
import { logger } from '@/utils/logger';

interface ComponentDependencyReport {
  componentName: string;
  filePath: string;
  category: 'CRITICAL_PATH' | 'CONTEXTS' | 'SUPPORTING';
  effectCount: number;
  totalDependencies: number;
  avgStabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Stability metrics
  stableEffects: number;
  unstableEffects: number;
  problematicDependencies: number;
  
  // Pattern analysis
  hasInlineDependencies: boolean;
  hasObjectDependencies: boolean;
  hasFunctionDependencies: boolean;
  missesMemoization: boolean;
  
  // Issues and recommendations
  criticalIssues: string[];
  topRecommendations: string[];
  
  // Execution metrics
  avgExecutionFrequency: number;
  maxExecutionFrequency: number;
  burstEvents: number;
}

interface PaymentFlowDependencyMatrix extends DependencyStabilityMatrix {
  // Payment flow specific analysis
  paymentFlowComponents: ComponentDependencyReport[];
  criticalPathStability: number;
  contextStability: number;
  supportingStability: number;
  
  // Flow-specific risks
  authFlowRisks: string[];
  paymentCallbackRisks: string[];
  subscriptionFlowRisks: string[];
  
  // Implementation priorities
  quickWins: Array<{
    component: string;
    fix: string;
    impact: string;
    estimatedEffort: 'minutes' | 'hours' | 'days';
  }>;
  
  architecturalChanges: Array<{
    area: string;
    issue: string;
    solution: string;
    impact: string;
    effort: 'medium' | 'high';
  }>;
}

class PaymentFlowDependencyAnalyzer {
  private static instance: PaymentFlowDependencyAnalyzer;
  
  static getInstance(): PaymentFlowDependencyAnalyzer {
    if (!PaymentFlowDependencyAnalyzer.instance) {
      PaymentFlowDependencyAnalyzer.instance = new PaymentFlowDependencyAnalyzer();
    }
    return PaymentFlowDependencyAnalyzer.instance;
  }

  /**
   * Generate comprehensive payment flow dependency matrix
   */
  generatePaymentFlowMatrix(): PaymentFlowDependencyMatrix {
    const baseMatrix = generateDependencyMatrix();
    
    // Analyze payment flow components specifically
    const paymentFlowComponents = this.analyzePaymentFlowComponents(baseMatrix);
    
    // Calculate flow-specific stability scores
    const { criticalPathStability, contextStability, supportingStability } = 
      this.calculateFlowStability(paymentFlowComponents);
    
    // Identify flow-specific risks
    const flowRisks = this.identifyFlowSpecificRisks(baseMatrix, paymentFlowComponents);
    
    // Generate implementation priorities
    const priorities = this.generateImplementationPriorities(paymentFlowComponents, baseMatrix);
    
    const paymentFlowMatrix: PaymentFlowDependencyMatrix = {
      ...baseMatrix,
      paymentFlowComponents,
      criticalPathStability,
      contextStability,
      supportingStability,
      ...flowRisks,
      ...priorities
    };
    
    this.logPaymentFlowMatrix(paymentFlowMatrix);
    
    return paymentFlowMatrix;
  }

  /**
   * Analyze specific payment flow components
   */
  private analyzePaymentFlowComponents(matrix: DependencyStabilityMatrix): ComponentDependencyReport[] {
    const reports: ComponentDependencyReport[] = [];
    
    // Analyze each category
    for (const [category, componentNames] of Object.entries(PAYMENT_FLOW_COMPONENTS)) {
      for (const componentName of componentNames) {
        const analyses = Array.from(matrix.componentAnalyses.get(componentName) || []);
        
        if (analyses.length === 0) continue; // Component not found in analysis
        
        const report = this.createComponentReport(
          componentName, 
          analyses, 
          category as keyof typeof PAYMENT_FLOW_COMPONENTS
        );
        reports.push(report);
      }
    }
    
    // Sort by risk level and stability score
    return reports.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return a.avgStabilityScore - b.avgStabilityScore;
    });
  }

  /**
   * Create detailed report for a component
   */
  private createComponentReport(
    componentName: string, 
    analyses: EffectDependencyAnalysis[],
    category: keyof typeof PAYMENT_FLOW_COMPONENTS
  ): ComponentDependencyReport {
    // Aggregate metrics
    const totalDependencies = analyses.reduce((sum, a) => sum + a.dependencyCount, 0);
    const avgStabilityScore = analyses.reduce((sum, a) => sum + a.stabilityScore, 0) / analyses.length;
    const avgExecutionFrequency = analyses.reduce((sum, a) => sum + a.executionFrequency, 0) / analyses.length;
    const maxExecutionFrequency = Math.max(...analyses.map(a => a.executionFrequency));
    const burstEvents = analyses.reduce((sum, a) => sum + a.burstExecutions, 0);
    
    // Stability classification
    const stableEffects = analyses.filter(a => a.stabilityScore >= 70).length;
    const unstableEffects = analyses.filter(a => a.stabilityScore < 70).length;
    const problematicDependencies = analyses.reduce((sum, a) => 
      sum + a.dependencies.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length, 0
    );
    
    // Pattern detection
    const hasInlineDependencies = analyses.some(a => a.hasInlineDependencies);
    const hasObjectDependencies = analyses.some(a => a.hasObjectDependencies);
    const hasFunctionDependencies = analyses.some(a => a.hasFunctionDependencies);
    const missesMemoization = analyses.some(a => a.missesMemoization);
    
    // Risk assessment
    const riskLevel = this.assessComponentRisk(
      avgStabilityScore, 
      avgExecutionFrequency, 
      problematicDependencies,
      category
    );
    
    // Critical issues
    const criticalIssues = analyses.flatMap(a => 
      a.issues.filter(issue => issue.includes('Critical'))
    );
    
    // Top recommendations
    const allRecommendations = analyses.flatMap(a => a.recommendations);
    const topRecommendations = [...new Set(allRecommendations)].slice(0, 3);
    
    // Determine file path based on component type
    const filePath = this.getComponentFilePath(componentName, category);
    
    return {
      componentName,
      filePath,
      category: category as 'CRITICAL_PATH' | 'CONTEXTS' | 'SUPPORTING',
      effectCount: analyses.length,
      totalDependencies,
      avgStabilityScore: Math.round(avgStabilityScore),
      riskLevel,
      stableEffects,
      unstableEffects,
      problematicDependencies,
      hasInlineDependencies,
      hasObjectDependencies,
      hasFunctionDependencies,
      missesMemoization,
      criticalIssues: criticalIssues.slice(0, 3),
      topRecommendations,
      avgExecutionFrequency,
      maxExecutionFrequency,
      burstEvents
    };
  }

  /**
   * Get file path for component
   */
  private getComponentFilePath(componentName: string, category: keyof typeof PAYMENT_FLOW_COMPONENTS): string {
    const pathMap: Record<string, string> = {
      'AuthScreen': '/src/pages/AuthScreen.tsx',
      'AuthCallback': '/src/pages/AuthCallback.tsx',
      'PaymentCallback': '/src/pages/PaymentCallback.tsx',
      'Pricing': '/src/pages/Pricing.tsx',
      'AuthContext': '/src/contexts/AuthContext.tsx',
      'PaymentIntentContext': '/src/contexts/PaymentIntentContext.tsx',
      'SubscriptionContext': '/src/contexts/SubscriptionContext.tsx',
      'useAutoTrial': '/src/hooks/useAutoTrial.ts',
      'AutoTrialWrapper': '/src/components/auth/AutoTrialWrapper.tsx',
      'TrialWelcomeMessage': '/src/components/auth/TrialWelcomeMessage.tsx',
      'SubscriptionTab': '/src/components/settings/SubscriptionTab.tsx'
    };
    
    return pathMap[componentName] || `/src/components/${componentName}.tsx`;
  }

  /**
   * Assess risk level for component
   */
  private assessComponentRisk(
    avgStabilityScore: number,
    avgExecutionFrequency: number,
    problematicDependencies: number,
    category: keyof typeof PAYMENT_FLOW_COMPONENTS
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Critical path components have higher risk thresholds
    const isCriticalPath = category === 'CRITICAL_PATH';
    const executionThreshold = isCriticalPath ? 3 : 5;
    const stabilityThreshold = isCriticalPath ? 80 : 70;

    // Check execution frequency
    if (avgExecutionFrequency > executionThreshold * 2) {
      riskLevel = 'critical';
    } else if (avgExecutionFrequency > executionThreshold) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    }

    // Check stability score
    if (avgStabilityScore < stabilityThreshold - 30) {
      riskLevel = 'critical';
    } else if (avgStabilityScore < stabilityThreshold - 15) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    } else if (avgStabilityScore < stabilityThreshold) {
      riskLevel = Math.max(riskLevel as any, 'medium' as any);
    }

    // Check problematic dependencies
    if (problematicDependencies > 5) {
      riskLevel = Math.max(riskLevel as any, 'high' as any);
    } else if (problematicDependencies > 2) {
      riskLevel = Math.max(riskLevel as any, 'medium' as any);
    }

    return riskLevel;
  }

  /**
   * Calculate stability scores for different flow categories
   */
  private calculateFlowStability(components: ComponentDependencyReport[]): {
    criticalPathStability: number;
    contextStability: number;
    supportingStability: number;
  } {
    const criticalPath = components.filter(c => c.category === 'CRITICAL_PATH');
    const contexts = components.filter(c => c.category === 'CONTEXTS');
    const supporting = components.filter(c => c.category === 'SUPPORTING');

    const calculateAvg = (comps: ComponentDependencyReport[]) => 
      comps.length > 0 ? comps.reduce((sum, c) => sum + c.avgStabilityScore, 0) / comps.length : 100;

    return {
      criticalPathStability: Math.round(calculateAvg(criticalPath)),
      contextStability: Math.round(calculateAvg(contexts)),
      supportingStability: Math.round(calculateAvg(supporting))
    };
  }

  /**
   * Identify flow-specific risks
   */
  private identifyFlowSpecificRisks(
    matrix: DependencyStabilityMatrix,
    components: ComponentDependencyReport[]
  ): {
    authFlowRisks: string[];
    paymentCallbackRisks: string[];
    subscriptionFlowRisks: string[];
  } {
    const authFlowRisks: string[] = [];
    const paymentCallbackRisks: string[] = [];
    const subscriptionFlowRisks: string[] = [];

    // Analyze auth flow risks
    const authComponents = components.filter(c => 
      c.componentName.includes('Auth') || c.componentName.includes('auth')
    );
    for (const comp of authComponents) {
      if (comp.riskLevel === 'critical' || comp.riskLevel === 'high') {
        authFlowRisks.push(`${comp.componentName}: ${comp.criticalIssues[0] || 'High dependency instability'}`);
      }
      if (comp.hasInlineDependencies && comp.avgExecutionFrequency > 3) {
        authFlowRisks.push(`${comp.componentName}: Inline dependencies causing frequent re-renders during auth`);
      }
    }

    // Analyze payment callback risks
    const paymentComponents = components.filter(c => 
      c.componentName.includes('Payment') || c.componentName.includes('payment')
    );
    for (const comp of paymentComponents) {
      if (comp.burstEvents > 0) {
        paymentCallbackRisks.push(`${comp.componentName}: ${comp.burstEvents} burst execution events detected`);
      }
      if (comp.maxExecutionFrequency > 10) {
        paymentCallbackRisks.push(`${comp.componentName}: Potential infinite loop risk - ${comp.maxExecutionFrequency} executions/min`);
      }
    }

    // Analyze subscription flow risks
    const subscriptionComponents = components.filter(c => 
      c.componentName.includes('Subscription') || c.componentName.includes('subscription') || 
      c.componentName.includes('Trial') || c.componentName.includes('trial')
    );
    for (const comp of subscriptionComponents) {
      if (comp.problematicDependencies > 3) {
        subscriptionFlowRisks.push(`${comp.componentName}: ${comp.problematicDependencies} problematic dependencies`);
      }
      if (comp.missesMemoization) {
        subscriptionFlowRisks.push(`${comp.componentName}: Missing memoization leading to subscription refetches`);
      }
    }

    return { authFlowRisks, paymentCallbackRisks, subscriptionFlowRisks };
  }

  /**
   * Generate implementation priorities
   */
  private generateImplementationPriorities(
    components: ComponentDependencyReport[],
    matrix: DependencyStabilityMatrix
  ): {
    quickWins: Array<{
      component: string;
      fix: string;
      impact: string;
      estimatedEffort: 'minutes' | 'hours' | 'days';
    }>;
    architecturalChanges: Array<{
      area: string;
      issue: string;
      solution: string;
      impact: string;
      effort: 'medium' | 'high';
    }>;
  } {
    const quickWins: Array<{
      component: string;
      fix: string;
      impact: string;
      estimatedEffort: 'minutes' | 'hours' | 'days';
    }> = [];

    const architecturalChanges: Array<{
      area: string;
      issue: string;
      solution: string;
      impact: string;
      effort: 'medium' | 'high';
    }> = [];

    // Identify quick wins
    for (const comp of components) {
      // Inline function fixes
      if (comp.hasInlineDependencies && comp.hasFunctionDependencies) {
        quickWins.push({
          component: comp.componentName,
          fix: 'Wrap inline functions with useCallback',
          impact: 'Reduce re-renders by 30-50%',
          estimatedEffort: 'minutes'
        });
      }

      // Object dependency fixes
      if (comp.hasObjectDependencies && comp.avgExecutionFrequency > 5) {
        quickWins.push({
          component: comp.componentName,
          fix: 'Wrap object dependencies with useMemo',
          impact: 'Improve stability score by 20-30 points',
          estimatedEffort: 'minutes'
        });
      }

      // High execution frequency fixes
      if (comp.maxExecutionFrequency > 15) {
        quickWins.push({
          component: comp.componentName,
          fix: 'Add dependency guards or debouncing',
          impact: 'Prevent potential infinite loops',
          estimatedEffort: 'hours'
        });
      }
    }

    // Identify architectural changes
    const criticalComponents = components.filter(c => c.riskLevel === 'critical');
    if (criticalComponents.length > 2) {
      architecturalChanges.push({
        area: 'Dependency Management',
        issue: `${criticalComponents.length} components with critical dependency issues`,
        solution: 'Implement centralized dependency injection pattern',
        impact: 'Reduce overall system instability by 40-60%',
        effort: 'high'
      });
    }

    // Context optimization
    const contextComponents = components.filter(c => c.category === 'CONTEXTS');
    const avgContextStability = contextComponents.reduce((sum, c) => sum + c.avgStabilityScore, 0) / contextComponents.length;
    if (avgContextStability < 60) {
      architecturalChanges.push({
        area: 'Context Architecture',
        issue: 'Context dependencies causing cascading re-renders',
        solution: 'Implement context selectors and split large contexts',
        impact: 'Improve context stability by 30-40 points',
        effort: 'medium'
      });
    }

    // Payment flow optimization
    const paymentPathComponents = components.filter(c => 
      c.componentName.includes('Payment') || c.componentName.includes('Auth')
    );
    const highRiskPaymentComponents = paymentPathComponents.filter(c => 
      c.riskLevel === 'high' || c.riskLevel === 'critical'
    );
    if (highRiskPaymentComponents.length > 1) {
      architecturalChanges.push({
        area: 'Payment Flow',
        issue: 'Critical payment components have unstable dependencies',
        solution: 'Implement payment state machine with stable transitions',
        impact: 'Eliminate payment flow re-render loops',
        effort: 'high'
      });
    }

    return {
      quickWins: quickWins.slice(0, 8), // Top 8 quick wins
      architecturalChanges: architecturalChanges.slice(0, 5) // Top 5 architectural changes
    };
  }

  /**
   * Log comprehensive payment flow matrix
   */
  private logPaymentFlowMatrix(matrix: PaymentFlowDependencyMatrix): void {
    const healthIcon = matrix.overallStabilityScore >= 80 ? '✅' : 
                      matrix.overallStabilityScore >= 60 ? '⚠️' : '🚨';

    console.log(`🔍 PAYMENT FLOW DEPENDENCY MATRIX ${healthIcon} [Report ID: ${matrix.reportId}]:`, {
      summary: {
        overallStability: `${matrix.overallStabilityScore}/100`,
        criticalPathStability: `${matrix.criticalPathStability}/100`,
        contextStability: `${matrix.contextStability}/100`,
        supportingStability: `${matrix.supportingStability}/100`,
        componentsAnalyzed: matrix.paymentFlowComponents.length,
        criticalIssues: matrix.criticalIssueCount,
        quickWins: matrix.quickWins.length,
        architecturalChanges: matrix.architecturalChanges.length
      },
      flowRisks: {
        authFlow: matrix.authFlowRisks.length,
        paymentCallback: matrix.paymentCallbackRisks.length,
        subscriptionFlow: matrix.subscriptionFlowRisks.length
      }
    });

    // Log critical components
    const criticalComponents = matrix.paymentFlowComponents.filter(c => c.riskLevel === 'critical');
    if (criticalComponents.length > 0) {
      console.log(`🚨 CRITICAL COMPONENTS REQUIRING IMMEDIATE ATTENTION:`, 
        criticalComponents.map(c => ({
          component: c.componentName,
          stability: `${c.avgStabilityScore}/100`,
          issues: c.criticalIssues.length,
          executionFreq: `${c.avgExecutionFrequency.toFixed(1)}/min`
        }))
      );
    }

    // Log quick wins
    if (matrix.quickWins.length > 0) {
      console.log(`💡 TOP QUICK WINS:`, 
        matrix.quickWins.slice(0, 5).map(qw => ({
          component: qw.component,
          fix: qw.fix.slice(0, 50),
          effort: qw.estimatedEffort,
          impact: qw.impact.slice(0, 30) + '...'
        }))
      );
    }

    // Log architectural changes
    if (matrix.architecturalChanges.length > 0) {
      console.log(`🏗️ RECOMMENDED ARCHITECTURAL CHANGES:`,
        matrix.architecturalChanges.slice(0, 3).map(ac => ({
          area: ac.area,
          issue: ac.issue.slice(0, 50) + '...',
          effort: ac.effort
        }))
      );
    }

    // Log flow-specific risks
    const totalFlowRisks = matrix.authFlowRisks.length + 
                          matrix.paymentCallbackRisks.length + 
                          matrix.subscriptionFlowRisks.length;
    
    if (totalFlowRisks > 0) {
      console.log(`⚠️ PAYMENT FLOW RISKS:`, {
        authFlow: matrix.authFlowRisks.slice(0, 2),
        paymentCallback: matrix.paymentCallbackRisks.slice(0, 2),
        subscriptionFlow: matrix.subscriptionFlowRisks.slice(0, 2)
      });
    }

    // Log to structured logger
    logger.performance('Payment flow dependency matrix generated', {
      reportId: matrix.reportId,
      overallStability: matrix.overallStabilityScore,
      criticalPathStability: matrix.criticalPathStability,
      contextStability: matrix.contextStability,
      supportingStability: matrix.supportingStability,
      criticalComponentCount: criticalComponents.length,
      quickWinCount: matrix.quickWins.length,
      architecturalChangeCount: matrix.architecturalChanges.length,
      totalFlowRisks: totalFlowRisks
    });
  }
}

// Export singleton instance
export const paymentFlowAnalyzer = PaymentFlowDependencyAnalyzer.getInstance();

// Utility functions
export const generatePaymentFlowDependencyMatrix = (): PaymentFlowDependencyMatrix => {
  return paymentFlowAnalyzer.generatePaymentFlowMatrix();
};

export const analyzePaymentFlowStability = (): {
  overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  criticalIssues: number;
  quickWins: number;
  recommendedActions: string[];
} => {
  const matrix = generatePaymentFlowDependencyMatrix();
  
  let overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical' = 'excellent';
  if (matrix.overallStabilityScore < 50) overallHealth = 'critical';
  else if (matrix.overallStabilityScore < 70) overallHealth = 'needs_attention';
  else if (matrix.overallStabilityScore < 85) overallHealth = 'good';
  
  const recommendedActions: string[] = [];
  
  // Top quick wins
  recommendedActions.push(...matrix.quickWins.slice(0, 3).map(qw => qw.fix));
  
  // Top architectural changes
  if (matrix.architecturalChanges.length > 0) {
    recommendedActions.push(matrix.architecturalChanges[0].solution);
  }
  
  return {
    overallHealth,
    criticalIssues: matrix.criticalIssueCount,
    quickWins: matrix.quickWins.length,
    recommendedActions: recommendedActions.slice(0, 5)
  };
};

// Auto-generate payment flow matrix every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const analyses = dependencyAuditor.getAllAnalyses();
    const paymentFlowAnalyses = analyses.filter(a => 
      Object.values(PAYMENT_FLOW_COMPONENTS).flat().includes(a.componentName as any)
    );
    
    if (paymentFlowAnalyses.length > 0) {
      generatePaymentFlowDependencyMatrix();
    }
  }, 300000); // 5 minutes
}

export type { PaymentFlowDependencyMatrix, ComponentDependencyReport };