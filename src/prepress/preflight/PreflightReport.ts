/**
 * GPCS CodeStudio - Preflight Report Generator
 * 
 * Generates formatted preflight reports in various formats
 */

import type {
  PreflightResult,
  PreflightIssue,
  PreflightCategory,
  PDFDocumentInfo,
} from '../types/PrepressTypes'

/**
 * Report format options
 */
export type ReportFormat = 'HTML' | 'PDF' | 'JSON' | 'TEXT'

/**
 * Report options
 */
export interface ReportOptions {
  format: ReportFormat
  includeDetails: boolean
  includeThumbnails: boolean
  groupByCategory: boolean
  groupByPage: boolean
  showPassed: boolean
  companyName?: string
  companyLogo?: string
}

/**
 * Default report options
 */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  format: 'HTML',
  includeDetails: true,
  includeThumbnails: true,
  groupByCategory: true,
  groupByPage: false,
  showPassed: false
}

/**
 * Preflight Report Generator
 */
export class PreflightReportGenerator {
  /**
   * Generate report
   */
  generateReport(
    result: PreflightResult,
    documentInfo: PDFDocumentInfo,
    options: Partial<ReportOptions> = {}
  ): string {
    const opts = { ...DEFAULT_REPORT_OPTIONS, ...options }
    
    switch (opts.format) {
      case 'HTML':
        return this.generateHTMLReport(result, documentInfo, opts)
      case 'JSON':
        return this.generateJSONReport(result, documentInfo, opts)
      case 'TEXT':
        return this.generateTextReport(result, documentInfo, opts)
      default:
        return this.generateHTMLReport(result, documentInfo, opts)
    }
  }
  
  /**
   * Generate HTML report
   */
  private generateHTMLReport(
    result: PreflightResult,
    documentInfo: PDFDocumentInfo,
    options: ReportOptions
  ): string {
    const statusColor = result.status === 'PASSED' ? '#22c55e' : 
                       result.status === 'WARNINGS' ? '#f59e0b' : '#ef4444'
    const statusIcon = result.status === 'PASSED' ? '✓' : 
                      result.status === 'WARNINGS' ? '⚠' : '✗'
    
    let html = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preflight Report - ${documentInfo.filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f3f4f6;
      padding: 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      color: white;
      background: ${statusColor};
    }
    .status-icon { font-size: 18px; }
    .document-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    .info-item { }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .info-value { font-weight: 500; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-number { font-size: 32px; font-weight: bold; }
    .summary-label { font-size: 14px; color: #6b7280; }
    .errors .summary-number { color: #ef4444; }
    .warnings .summary-number { color: #f59e0b; }
    .info .summary-number { color: #3b82f6; }
    .passed .summary-number { color: #22c55e; }
    .section {
      background: white;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .section-header {
      padding: 16px 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-count {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
    }
    .issue-list { }
    .issue {
      padding: 16px 20px;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      gap: 12px;
    }
    .issue:last-child { border-bottom: none; }
    .issue-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .issue-error .issue-icon { background: #fef2f2; color: #ef4444; }
    .issue-warning .issue-icon { background: #fffbeb; color: #f59e0b; }
    .issue-info .issue-icon { background: #eff6ff; color: #3b82f6; }
    .issue-content { flex: 1; }
    .issue-message { font-weight: 500; margin-bottom: 4px; }
    .issue-details { font-size: 14px; color: #6b7280; }
    .issue-location { 
      font-size: 12px; 
      color: #9ca3af;
      margin-top: 4px;
    }
    .issue-fix {
      font-size: 12px;
      color: #22c55e;
      margin-top: 4px;
    }
    .category-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: #e5e7eb;
      color: #4b5563;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-size: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .section { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="logo">${options.companyName || 'GPCS CodeStudio'}</div>
        <div class="status">
          <span class="status-icon">${statusIcon}</span>
          ${result.status === 'PASSED' ? 'Passed' : result.status === 'WARNINGS' ? 'Warnings' : 'Errors Found'}
        </div>
      </div>
      <div class="document-info">
        <div class="info-item">
          <div class="info-label">Document</div>
          <div class="info-value">${documentInfo.filename}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Profile</div>
          <div class="info-value">${result.profileName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Pages</div>
          <div class="info-value">${documentInfo.pageCount}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${result.completedAt.toLocaleString('sk-SK')}</div>
        </div>
      </div>
    </div>
    
    <div class="summary">
      <div class="summary-card errors">
        <div class="summary-number">${result.errors.length}</div>
        <div class="summary-label">Errors</div>
      </div>
      <div class="summary-card warnings">
        <div class="summary-number">${result.warnings.length}</div>
        <div class="summary-label">Warnings</div>
      </div>
      <div class="summary-card info">
        <div class="summary-number">${result.info.length}</div>
        <div class="summary-label">Info</div>
      </div>
      <div class="summary-card passed">
        <div class="summary-number">${result.passedChecks}</div>
        <div class="summary-label">Passed</div>
      </div>
    </div>`
    
    // Errors section
    if (result.errors.length > 0) {
      html += this.generateIssueSection('Errors', result.errors, 'error', options)
    }
    
    // Warnings section
    if (result.warnings.length > 0) {
      html += this.generateIssueSection('Warnings', result.warnings, 'warning', options)
    }
    
    // Info section
    if (result.info.length > 0) {
      html += this.generateIssueSection('Information', result.info, 'info', options)
    }
    
    html += `
    <div class="footer">
      Generated by GPCS CodeStudio Preflight Engine<br>
      Duration: ${result.duration}ms | Checks: ${result.totalChecks}
    </div>
  </div>
</body>
</html>`
    
    return html
  }
  
  /**
   * Generate issue section HTML
   */
  private generateIssueSection(
    title: string,
    issues: PreflightIssue[],
    type: 'error' | 'warning' | 'info',
    options: ReportOptions
  ): string {
    const icon = type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'
    
    let html = `
    <div class="section">
      <div class="section-header">
        ${title}
        <span class="section-count">${issues.length}</span>
      </div>
      <div class="issue-list">`
    
    // Group by category if requested
    if (options.groupByCategory) {
      const grouped = this.groupByCategory(issues)
      
      for (const [category, categoryIssues] of Object.entries(grouped)) {
        for (const issue of categoryIssues) {
          html += this.generateIssueHTML(issue, type, icon, options)
        }
      }
    } else {
      for (const issue of issues) {
        html += this.generateIssueHTML(issue, type, icon, options)
      }
    }
    
    html += `
      </div>
    </div>`
    
    return html
  }
  
  /**
   * Generate single issue HTML
   */
  private generateIssueHTML(
    issue: PreflightIssue,
    type: string,
    icon: string,
    options: ReportOptions
  ): string {
    let html = `
        <div class="issue issue-${type}">
          <div class="issue-icon">${icon}</div>
          <div class="issue-content">
            <div class="issue-message">${issue.message}</div>`
    
    if (options.includeDetails) {
      html += `
            <div class="issue-details">
              <span class="category-badge">${issue.category}</span>
              ${issue.ruleName ? ` • ${issue.ruleName}` : ''}`
      
      if (issue.expectedValue !== undefined) {
        html += ` • Expected: ${issue.expectedValue}`
      }
      if (issue.actualValue !== undefined) {
        html += ` • Actual: ${issue.actualValue}`
      }
      
      html += `</div>`
      
      if (issue.pageNumber) {
        html += `<div class="issue-location">Page ${issue.pageNumber}`
        if (issue.location) {
          html += ` • Position: ${issue.location.x.toFixed(1)}, ${issue.location.y.toFixed(1)} mm`
        }
        html += `</div>`
      }
      
      if (issue.canAutoFix && issue.fixDescription) {
        html += `<div class="issue-fix">💡 Auto-fix available: ${issue.fixDescription}</div>`
      }
    }
    
    html += `
          </div>
        </div>`
    
    return html
  }
  
  /**
   * Generate JSON report
   */
  private generateJSONReport(
    result: PreflightResult,
    documentInfo: PDFDocumentInfo,
    options: ReportOptions
  ): string {
    const report = {
      generatedAt: new Date().toISOString(),
      generator: 'GPCS CodeStudio Preflight Engine',
      document: {
        filename: documentInfo.filename,
        pageCount: documentInfo.pageCount,
        pdfVersion: documentInfo.pdfVersion,
        fileSize: documentInfo.fileSize
      },
      profile: {
        id: result.profileId,
        name: result.profileName
      },
      summary: {
        status: result.status,
        totalChecks: result.totalChecks,
        passedChecks: result.passedChecks,
        failedChecks: result.failedChecks,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        infoCount: result.info.length,
        duration: result.duration
      },
      issues: {
        errors: result.errors,
        warnings: result.warnings,
        info: result.info
      }
    }
    
    return JSON.stringify(report, null, 2)
  }
  
  /**
   * Generate text report
   */
  private generateTextReport(
    result: PreflightResult,
    documentInfo: PDFDocumentInfo,
    options: ReportOptions
  ): string {
    let text = `
PREFLIGHT REPORT
================

Document: ${documentInfo.filename}
Profile: ${result.profileName}
Date: ${result.completedAt.toLocaleString()}
Status: ${result.status}

SUMMARY
-------
Total Checks: ${result.totalChecks}
Passed: ${result.passedChecks}
Errors: ${result.errors.length}
Warnings: ${result.warnings.length}
Info: ${result.info.length}
Duration: ${result.duration}ms

`
    
    if (result.errors.length > 0) {
      text += `ERRORS (${result.errors.length})\n${'='.repeat(40)}\n`
      for (const issue of result.errors) {
        text += this.formatTextIssue(issue)
      }
      text += '\n'
    }
    
    if (result.warnings.length > 0) {
      text += `WARNINGS (${result.warnings.length})\n${'='.repeat(40)}\n`
      for (const issue of result.warnings) {
        text += this.formatTextIssue(issue)
      }
      text += '\n'
    }
    
    if (result.info.length > 0) {
      text += `INFO (${result.info.length})\n${'='.repeat(40)}\n`
      for (const issue of result.info) {
        text += this.formatTextIssue(issue)
      }
    }
    
    text += `\n${'='.repeat(60)}\nGenerated by GPCS CodeStudio Preflight Engine\n`
    
    return text
  }
  
  /**
   * Format issue for text report
   */
  private formatTextIssue(issue: PreflightIssue): string {
    let text = `\n[${issue.category}] ${issue.message}\n`
    
    if (issue.pageNumber) {
      text += `  Page: ${issue.pageNumber}\n`
    }
    if (issue.expectedValue !== undefined) {
      text += `  Expected: ${issue.expectedValue}\n`
    }
    if (issue.actualValue !== undefined) {
      text += `  Actual: ${issue.actualValue}\n`
    }
    if (issue.canAutoFix) {
      text += `  Fix: ${issue.fixDescription}\n`
    }
    
    return text
  }
  
  /**
   * Group issues by category
   */
  private groupByCategory(issues: PreflightIssue[]): Record<string, PreflightIssue[]> {
    const grouped: Record<string, PreflightIssue[]> = {}
    
    for (const issue of issues) {
      if (!grouped[issue.category]) {
        grouped[issue.category] = []
      }
      grouped[issue.category].push(issue)
    }
    
    return grouped
  }
  
  /**
   * Group issues by page
   */
  private groupByPage(issues: PreflightIssue[]): Record<number, PreflightIssue[]> {
    const grouped: Record<number, PreflightIssue[]> = {}
    
    for (const issue of issues) {
      const page = issue.pageNumber || 0
      if (!grouped[page]) {
        grouped[page] = []
      }
      grouped[page].push(issue)
    }
    
    return grouped
  }
}

// Export singleton
export const preflightReportGenerator = new PreflightReportGenerator()
