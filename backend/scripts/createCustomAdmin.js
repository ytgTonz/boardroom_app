// backend/scripts/createCustomAdmin.js
// Interactive script to create admin with custom details
// Run with: node scripts/createCustomAdmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('../src/models/User');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const createCustomAdmin = async () => {
  try {
    console.log('🔧 Interactive Admin User Creation');
    console.log('=====================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boardroom_booking');
    console.log('✅ Connected to MongoDB\n');

    // Get admin details from user input
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ All fields are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters long!');
      process.exit(1);
    }

    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User with this email already exists!');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('👤 Name:', name);
    console.log('🔐 Role: admin');
    console.log('\nYou can now login to the application!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
};

createCustomAdmin();