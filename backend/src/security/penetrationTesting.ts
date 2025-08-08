import { Request, Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';

interface SecurityTest {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  test: () => Promise<TestResult>;
}

// Test result details can be various types of diagnostic information
export type TestDetails = 
  | { headers: Record<string, string>; status: number }
  | { error: string; code?: string | number }
  | { timing: number; response_size: number }
  | { vulnerabilities: string[] }
  | { config: Record<string, string | number | boolean> }
  | Record<string, unknown>;

interface TestResult {
  passed: boolean;
  message: string;
  details?: TestDetails;
  recommendation?: string;
}

interface PenTestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  results: Array<{
    test: string;
    severity: string;
    status: 'PASS' | 'FAIL';
    message: string;
    recommendation?: string;
  }>;
}

class PenetrationTester {
  private baseUrl: string;
  private testResults: PenTestReport;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testResults = this.initializeReport();
  }

  private initializeReport(): PenTestReport {
    return {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      results: []
    };
  }

  private async makeRequest(path: string, options: Partial<AxiosRequestConfig> = {}) {
    try {
      const response = await axios({
        url: `${this.baseUrl}${path}`,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on error status codes
        ...options
      });
      return response;
    } catch (error: any) {
      return {
        status: 0,
        data: null,
        error: error.message
      };
    }
  }

  private getSecurityTests(): SecurityTest[] {
    return [
      {
        name: 'SQL Injection Test',
        description: 'Test for SQL injection vulnerabilities in login endpoint',
        severity: 'critical',
        test: async () => {
          const maliciousPayloads = [
            "admin' OR '1'='1",
            "admin'; DROP TABLE users; --",
            "admin' UNION SELECT * FROM users --"
          ];

          for (const payload of maliciousPayloads) {
            const response = await this.makeRequest('/api/auth/login', {
              method: 'POST',
              data: {
                email: payload,
                password: 'test'
              }
            });

            if (response.status === 200 && response.data?.success) {
              return {
                passed: false,
                message: 'SQL injection vulnerability detected in login endpoint',
                details: { payload, response: response.data },
                recommendation: 'Use parameterized queries and input validation'
              };
            }
          }

          return {
            passed: true,
            message: 'No SQL injection vulnerabilities detected'
          };
        }
      },

      {
        name: 'XSS Test',
        description: 'Test for Cross-Site Scripting vulnerabilities',
        severity: 'high',
        test: async () => {
          const xssPayloads = [
            '<script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '<img src=x onerror=alert("XSS")>',
            '<svg onload=alert("XSS")>'
          ];

          // Test note creation endpoint
          for (const payload of xssPayloads) {
            const response = await this.makeRequest('/api/notes', {
              method: 'POST',
              data: {
                title: payload,
                content: payload,
                subject_id: 1
              },
              headers: {
                'Authorization': 'Bearer fake-token'
              }
            });

            // Check if the payload is reflected without sanitization
            if (response.data && JSON.stringify(response.data).includes(payload)) {
              return {
                passed: false,
                message: 'XSS vulnerability detected - unsanitized input reflection',
                details: { payload, response: response.data },
                recommendation: 'Implement proper input sanitization and output encoding'
              };
            }
          }

          return {
            passed: true,
            message: 'No XSS vulnerabilities detected'
          };
        }
      },

      {
        name: 'Rate Limiting Test',
        description: 'Test rate limiting effectiveness',
        severity: 'medium',
        test: async () => {
          const requests = [];
          const maxRequests = 20;

          // Send multiple requests rapidly
          for (let i = 0; i < maxRequests; i++) {
            requests.push(this.makeRequest('/api/auth/login', {
              method: 'POST',
              data: {
                email: 'test@example.com',
                password: 'wrongpassword'
              }
            }));
          }

          const responses = await Promise.all(requests);
          const rateLimitedResponses = responses.filter(r => r.status === 429);

          if (rateLimitedResponses.length === 0) {
            return {
              passed: false,
              message: 'Rate limiting not properly implemented',
              details: { totalRequests: maxRequests, rateLimited: 0 },
              recommendation: 'Implement proper rate limiting middleware'
            };
          }

          return {
            passed: true,
            message: `Rate limiting working - ${rateLimitedResponses.length}/${maxRequests} requests blocked`
          };
        }
      },

      {
        name: 'HTTPS Redirect Test',
        description: 'Test if HTTP requests are redirected to HTTPS',
        severity: 'medium',
        test: async () => {
          if (process.env.NODE_ENV !== 'production') {
            return {
              passed: true,
              message: 'HTTPS test skipped in development environment'
            };
          }

          const httpUrl = this.baseUrl.replace('https://', 'http://');
          const response = await this.makeRequest('/', {
            url: httpUrl,
            maxRedirects: 0
          });

          if (response.status !== 301 && response.status !== 302) {
            return {
              passed: false,
              message: 'HTTP to HTTPS redirect not implemented',
              recommendation: 'Configure server to redirect HTTP traffic to HTTPS'
            };
          }

          return {
            passed: true,
            message: 'HTTPS redirect properly configured'
          };
        }
      },

      {
        name: 'Security Headers Test',
        description: 'Test for proper security headers',
        severity: 'medium',
        test: async () => {
          const response = await this.makeRequest('/');
          const headers = (response as any).headers || {};

          const requiredHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
            'strict-transport-security'
          ];

          const missingHeaders = requiredHeaders.filter(header => !headers[header]);

          if (missingHeaders.length > 0) {
            return {
              passed: false,
              message: `Missing security headers: ${missingHeaders.join(', ')}`,
              details: { missingHeaders, presentHeaders: Object.keys(headers) },
              recommendation: 'Configure proper security headers using helmet.js'
            };
          }

          return {
            passed: true,
            message: 'All required security headers are present'
          };
        }
      },

      {
        name: 'Directory Traversal Test',
        description: 'Test for directory traversal vulnerabilities',
        severity: 'high',
        test: async () => {
          const traversalPayloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
          ];

          for (const payload of traversalPayloads) {
            const response = await this.makeRequest(`/api/files/${payload}`);

            if (response.status === 200 && response.data) {
              return {
                passed: false,
                message: 'Directory traversal vulnerability detected',
                details: { payload, responseLength: response.data.length },
                recommendation: 'Implement proper path validation and sanitization'
              };
            }
          }

          return {
            passed: true,
            message: 'No directory traversal vulnerabilities detected'
          };
        }
      },

      {
        name: 'Authentication Bypass Test',
        description: 'Test for authentication bypass vulnerabilities',
        severity: 'critical',
        test: async () => {
          const bypassAttempts = [
            { headers: { 'Authorization': 'Bearer null' } },
            { headers: { 'Authorization': 'Bearer undefined' } },
            { headers: { 'Authorization': '' } },
            { headers: { 'X-Original-URL': '/api/admin' } },
            { headers: { 'X-Rewrite-URL': '/api/admin' } }
          ];

          for (const attempt of bypassAttempts) {
            const response = await this.makeRequest('/api/notes', {
              method: 'GET',
              headers: attempt.headers
            });

            if (response.status === 200 && response.data?.success) {
              return {
                passed: false,
                message: 'Authentication bypass vulnerability detected',
                details: { bypassMethod: attempt.headers },
                recommendation: 'Strengthen authentication middleware validation'
              };
            }
          }

          return {
            passed: true,
            message: 'No authentication bypass vulnerabilities detected'
          };
        }
      }
    ];
  }

  async runAllTests(): Promise<PenTestReport> {
    console.log('🔍 Starting automated penetration tests...');
    
    const tests = this.getSecurityTests();
    this.testResults = this.initializeReport();
    this.testResults.totalTests = tests.length;

    for (const test of tests) {
      try {
        console.log(`Running: ${test.name}`);
        const result = await test.test();
        
        this.testResults.results.push({
          test: test.name,
          severity: test.severity,
          status: result.passed ? 'PASS' : 'FAIL',
          message: result.message,
          recommendation: result.recommendation
        });

        if (result.passed) {
          this.testResults.passed++;
        } else {
          this.testResults.failed++;
          this.testResults.vulnerabilities[test.severity]++;
        }

      } catch (error) {
        console.error(`Test ${test.name} failed with error:`, error);
        this.testResults.results.push({
          test: test.name,
          severity: test.severity,
          status: 'FAIL',
          message: `Test execution failed: ${(error as any).message}`,
          recommendation: 'Fix test execution environment'
        });
        this.testResults.failed++;
      }
    }

    this.generateReport();
    return this.testResults;
  }

  private generateReport() {
    console.log('\n📊 PENETRATION TEST REPORT');
    console.log('================================');
    console.log(`Timestamp: ${this.testResults.timestamp}`);
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log('\nVulnerabilities by Severity:');
    console.log(`  Critical: ${this.testResults.vulnerabilities.critical}`);
    console.log(`  High: ${this.testResults.vulnerabilities.high}`);
    console.log(`  Medium: ${this.testResults.vulnerabilities.medium}`);
    console.log(`  Low: ${this.testResults.vulnerabilities.low}`);
    
    console.log('\nDetailed Results:');
    this.testResults.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} [${result.severity.toUpperCase()}] ${result.test}: ${result.message}`);
      if (result.recommendation) {
        console.log(`   💡 Recommendation: ${result.recommendation}`);
      }
    });
  }
}

// API endpoint for manual testing
export const runPenetrationTests = async (req: Request, res: Response) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const tester = new PenetrationTester(baseUrl);
    const report = await tester.runAllTests();

    res.json({
      success: true,
      data: report,
      message: 'Penetration tests completed'
    });
  } catch (error) {
    console.error('Penetration test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run penetration tests',
      details: (error as any).message
    });
  }
};

// Scheduled testing function
export const scheduledSecurityScan = async () => {
  const tester = new PenetrationTester();
  const report = await tester.runAllTests();
  
  // Log critical vulnerabilities
  if (report.vulnerabilities.critical > 0 || report.vulnerabilities.high > 0) {
    console.error('🚨 CRITICAL SECURITY VULNERABILITIES DETECTED:', {
      critical: report.vulnerabilities.critical,
      high: report.vulnerabilities.high,
      timestamp: report.timestamp
    });
  }
  
  return report;
};

export { PenetrationTester };