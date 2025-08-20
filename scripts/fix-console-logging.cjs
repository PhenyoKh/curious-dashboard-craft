#!/usr/bin/env node

/**
 * Console Logging Fix Script
 * Automatically replaces console.log/error/warn/info calls with secure logger utility
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function getAllTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      getAllTsxFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function hasLoggerImport(content) {
  return content.includes("import { logger }") || content.includes("from '@/utils/logger'");
}

function addLoggerImport(content) {
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('from \'react\'')) {
      lastImportIndex = i;
    }
  }
  
  const loggerImport = "import { logger } from '@/utils/logger';";
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // No imports found, add at the top after any comments
    let insertIndex = 0;
    while (insertIndex < lines.length && 
           (lines[insertIndex].trim().startsWith('//') || 
            lines[insertIndex].trim().startsWith('/*') || 
            lines[insertIndex].trim().startsWith('*') || 
            lines[insertIndex].trim() === '')) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, loggerImport, '');
  }
  
  return lines.join('\n');
}

function replaceConsoleCalls(content) {
  let modified = false;
  let replacements = 0;

  // Replace console.log with logger.log
  content = content.replace(/console\.log\(/g, () => {
    modified = true;
    replacements++;
    return 'logger.log(';
  });

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, () => {
    modified = true;
    replacements++;
    return 'logger.error(';
  });

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, () => {
    modified = true;
    replacements++;
    return 'logger.warn(';
  });

  // Replace console.info with logger.info
  content = content.replace(/console\.info\(/g, () => {
    modified = true;
    replacements++;
    return 'logger.info(';
  });

  // Replace console.debug with logger.debug
  content = content.replace(/console\.debug\(/g, () => {
    modified = true;
    replacements++;
    return 'logger.debug(';
  });

  return { content, modified, replacements };
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, modified, replacements } = replaceConsoleCalls(content);
    
    if (modified) {
      // Add logger import if needed and not already present
      if (!hasLoggerImport(newContent)) {
        content = addLoggerImport(newContent);
      } else {
        content = newContent;
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      return { modified: true, replacements };
    }
    
    return { modified: false, replacements: 0 };
  } catch (error) {
    logError(`Error processing ${filePath}: ${error.message}`);
    return { modified: false, replacements: 0 };
  }
}

function main() {
  log(`${colors.bold}${colors.blue}Console Logging Fix Script${colors.reset}`);
  log('Replacing console calls with secure logger utility...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    logError('src directory not found. Run this script from the project root.');
    process.exit(1);
  }
  
  const files = getAllTsxFiles(srcDir);
  let totalModified = 0;
  let totalReplacements = 0;
  
  log(`Found ${files.length} TypeScript files to process...\n`);
  
  files.forEach(filePath => {
    const { modified, replacements } = processFile(filePath);
    if (modified) {
      totalModified++;
      totalReplacements += replacements;
      logSuccess(`${path.relative(process.cwd(), filePath)} - ${replacements} replacements`);
    }
  });
  
  log(`\n${colors.bold}Summary:${colors.reset}`);
  logSuccess(`Modified ${totalModified} files`);
  logSuccess(`Made ${totalReplacements} console call replacements`);
  
  if (totalModified > 0) {
    logWarning('Remember to run your linter and tests to verify the changes!');
  } else {
    logSuccess('No console calls found to replace!');
  }
}

if (require.main === module) {
  main();
}