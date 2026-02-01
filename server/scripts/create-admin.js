#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates an admin user for AgriNursery ERP
 * Usage: node create-admin.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');
const db = require('../config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  try {
    console.log('\n=== AgriNursery ERP - Create Admin User ===\n');

    const username = await question('Username: ');
    const email = await question('Email: ');
    const fullName = await question('Full Name: ');
    const phone = await question('Phone (optional): ');
    const password = await question('Password (min 8 chars): ');
    const confirmPassword = await question('Confirm Password: ');

    // Validation
    if (!username || !email || !fullName || !password) {
      console.error('\n❌ Error: All fields except phone are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n❌ Error: Password must be at least 8 characters');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error('\n❌ Error: Passwords do not match');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.error('\n❌ Error: Username or email already exists');
      process.exit(1);
    }

    // Hash password
    console.log('\n🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    console.log('👤 Creating admin user...');
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active)
       VALUES ($1, $2, $3, $4, 'admin', $5, true)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, passwordHash, fullName, phone || null]
    );

    console.log('\n✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log('─────────────────────────────────');
    console.log(`ID:        ${result.rows[0].id}`);
    console.log(`Username:  ${result.rows[0].username}`);
    console.log(`Email:     ${result.rows[0].email}`);
    console.log(`Name:      ${result.rows[0].full_name}`);
    console.log(`Role:      ${result.rows[0].role}`);
    console.log(`Created:   ${result.rows[0].created_at}`);
    console.log('─────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await db.end();
  }
}

// Run the script
createAdminUser();
