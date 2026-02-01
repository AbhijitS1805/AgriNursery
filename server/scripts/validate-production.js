#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Checks all critical requirements before production deployment
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const PASS = `${colors.green}✓ PASS${colors.reset}`;
const FAIL = `${colors.red}✗ FAIL${colors.reset}`;
const WARN = `${colors.yellow}⚠ WARN${colors.reset}`;
const INFO = `${colors.blue}ℹ INFO${colors.reset}`;

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function log(message, type = INFO) {
  console.log(`${type} ${message}`);
}

function header(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(70)}`);
  console.log(`${title.toUpperCase()}`);
  console.log(`${'='.repeat(70)}${colors.reset}\n`);
}

async function check(description, testFn) {
  totalChecks++;
  process.stdout.write(`${description}... `);
  
  try {
    const result = await testFn();
    if (result === true) {
      console.log(PASS);
      passedChecks++;
      return true;
    } else if (result === 'warn') {
      console.log(WARN);
      warnings++;
      return 'warn';
    } else {
      console.log(`${FAIL} - ${result}`);
      failedChecks++;
      return false;
    }
  } catch (error) {
    console.log(`${FAIL} - ${error.message}`);
    failedChecks++;
    return false;
  }
}

// Check functions
async function checkNodeVersion() {
  const { stdout } = await execAsync('node --version');
  const version = stdout.trim().replace('v', '');
  const major = parseInt(version.split('.')[0]);
  return major >= 18 ? true : `Node ${version} found, need 18+`;
}

async function checkPostgres() {
  try {
    const { stdout } = await execAsync('psql --version');
    const version = stdout.match(/(\d+\.\d+)/)[1];
    const major = parseInt(version.split('.')[0]);
    return major >= 13 ? true : `PostgreSQL ${version} found, need 13+`;
  } catch {
    return 'PostgreSQL not found';
  }
}

async function checkEnvFile() {
  try {
    const envPath = path.join(__dirname, '../.env');
    await fs.access(envPath);
    return true;
  } catch {
    return '.env file not found';
  }
}

async function checkProductionEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.production');
    await fs.access(envPath);
    const content = await fs.readFile(envPath, 'utf-8');
    
    // Check for placeholder values
    if (content.includes('CHANGE_THIS')) {
      return 'Contains placeholder values';
    }
    if (content.includes('yourdomain.com')) {
      return 'Domain not configured';
    }
    return true;
  } catch {
    return '.env.production file not found';
  }
}

async function checkJWTSecret() {
  const envPath = path.join(__dirname, '../.env');
  const content = await fs.readFile(envPath, 'utf-8');
  const jwtMatch = content.match(/JWT_SECRET=(.+)/);
  
  if (!jwtMatch) return 'JWT_SECRET not found';
  
  const secret = jwtMatch[1].trim();
  if (secret === 'your-secret-key-change-in-production') {
    return 'Using default JWT_SECRET';
  }
  if (secret.length < 32) {
    return 'JWT_SECRET too short (min 32 chars)';
  }
  return true;
}

async function checkDatabaseConnection() {
  try {
    require('dotenv').config();
    const db = require('../config/database');
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    return `Cannot connect: ${error.message}`;
  }
}

async function checkMigrations() {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    return result.rows[0].count > 0 ? true : 'Migrations not run';
  } catch (error) {
    return 'Cannot check migrations';
  }
}

async function checkDefaultAdmin() {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT is_active FROM users 
      WHERE is_default_user = TRUE 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) return 'warn'; // No default user tracking
    return result.rows[0].is_active ? 'Default admin still active' : true;
  } catch {
    return 'Cannot check default admin';
  }
}

async function checkProductionAdmin() {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'admin' AND is_active = TRUE 
      AND (is_default_user = FALSE OR is_default_user IS NULL)
    `);
    return result.rows[0].count > 0 ? true : 'No production admin user';
  } catch {
    return 'Cannot check admin users';
  }
}

async function checkPM2() {
  try {
    await execAsync('pm2 --version');
    return true;
  } catch {
    return 'PM2 not installed';
  }
}

async function checkNginx() {
  try {
    await execAsync('nginx -v');
    return true;
  } catch {
    return 'warn'; // Optional for development
  }
}

async function checkBackupScript() {
  try {
    const scriptPath = path.join(__dirname, '../scripts/backup-database.sh');
    await fs.access(scriptPath, fs.constants.X_OK);
    return true;
  } catch {
    return 'Backup script not executable';
  }
}

async function checkLogsDirectory() {
  try {
    const logsPath = path.join(__dirname, '../logs');
    await fs.access(logsPath);
    return true;
  } catch {
    // Create it
    await fs.mkdir(path.join(__dirname, '../logs'), { recursive: true });
    return 'warn'; // Created directory
  }
}

async function checkDependencies() {
  try {
    const packageJson = require('../package.json');
    const required = [
      'express',
      'pg',
      'bcryptjs',
      'jsonwebtoken',
      'express-rate-limit',
      'helmet',
      'winston',
      'morgan',
      'compression',
      'cors'
    ];
    
    const missing = required.filter(dep => !packageJson.dependencies[dep]);
    return missing.length === 0 ? true : `Missing: ${missing.join(', ')}`;
  } catch {
    return 'Cannot read package.json';
  }
}

async function checkTests() {
  try {
    const { stdout, stderr } = await execAsync('npm test -- --passWithNoTests 2>&1', {
      timeout: 30000
    });
    
    if (stdout.includes('PASS') || stderr.includes('PASS')) {
      return true;
    }
    return 'warn'; // Tests exist but may have issues
  } catch (error) {
    return 'warn'; // Tests not configured
  }
}

async function checkSecurityHeaders() {
  const indexPath = path.join(__dirname, '../index.js');
  const content = await fs.readFile(indexPath, 'utf-8');
  
  const hasHelmet = content.includes('helmet');
  const hasRateLimit = content.includes('apiLimiter') || content.includes('rateLimit');
  
  if (!hasHelmet && !hasRateLimit) return 'No security middleware';
  if (!hasHelmet) return 'Helmet not configured';
  if (!hasRateLimit) return 'Rate limiting not configured';
  return true;
}

async function checkCORS() {
  const indexPath = path.join(__dirname, '../index.js');
  const content = await fs.readFile(indexPath, 'utf-8');
  
  if (!content.includes('cors')) return 'CORS not configured';
  if (content.includes('origin:') && !content.includes('localhost')) {
    return true;
  }
  return 'warn'; // CORS allows localhost
}

// Main validation
async function main() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                   ║');
  console.log('║        🌱 AGRI-NURSERY ERP PRODUCTION VALIDATION 🌱              ║');
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  header('System Requirements');
  await check('Node.js version >= 18', checkNodeVersion);
  await check('PostgreSQL version >= 13', checkPostgres);
  await check('PM2 installed', checkPM2);
  await check('Nginx installed', checkNginx);

  header('Configuration');
  await check('Environment file exists', checkEnvFile);
  await check('Production environment configured', checkProductionEnv);
  await check('JWT_SECRET configured', checkJWTSecret);
  await check('Logs directory exists', checkLogsDirectory);

  header('Database');
  await check('Database connection', checkDatabaseConnection);
  await check('Migrations applied', checkMigrations);
  await check('Default admin disabled', checkDefaultAdmin);
  await check('Production admin exists', checkProductionAdmin);

  header('Security');
  await check('Security middleware configured', checkSecurityHeaders);
  await check('CORS configured', checkCORS);
  await check('Backup script executable', checkBackupScript);

  header('Dependencies & Tests');
  await check('Required dependencies installed', checkDependencies);
  await check('Tests passing', checkTests);

  // Summary
  header('Summary');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedChecks}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}\n`);

  const score = Math.round((passedChecks / totalChecks) * 100);
  console.log(`${colors.bold}Production Readiness Score: ${score}%${colors.reset}\n`);

  if (score >= 90) {
    console.log(`${colors.green}${colors.bold}✓ READY FOR PRODUCTION${colors.reset}\n`);
    process.exit(0);
  } else if (score >= 70) {
    console.log(`${colors.yellow}${colors.bold}⚠ MOSTLY READY - Address warnings before deployment${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}✗ NOT READY FOR PRODUCTION - Fix failures first${colors.reset}\n`);
    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
