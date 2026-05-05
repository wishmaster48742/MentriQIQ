/**
 * Seed Script
 * Creates admin user and sample tests for development
 * Run: node utils/seedData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mentriqiq');
    console.log('Connected to MongoDB');

    // ─── Create Admin ──────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mentriqiq.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: adminEmail,
        contactNumber: '8890301264',
        password: adminPassword,
        role: 'admin'
      });
      console.log('✅ Admin created:', admin.email);
    } else if (admin.role !== 'admin') {
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
      console.log('✅ Existing user promoted to admin:', admin.email);
    } else {
      console.log('ℹ️  Admin already exists:', admin.email);
    }

    // ─── Create Sample Test ────────────────────────────────────────────────
    const existing = await Test.findOne({ title: 'JavaScript Basics' });
    if (!existing) {
      await Test.create({
        title: 'JavaScript Basics',
        description: 'Test your knowledge of JavaScript fundamentals including variables, functions, and ES6+ features.',
        category: 'Programming',
        duration: 15,
        passingMarks: 6,
        isPublished: true,
        isScheduled: false,
        allowRetake: false,
        shuffleQuestions: true,
        createdBy: admin._id,
        questions: [
          {
            questionText: 'Which keyword is used to declare a constant in JavaScript?',
            options: [
              { label: 'A', text: 'var' },
              { label: 'B', text: 'let' },
              { label: 'C', text: 'const' },
              { label: 'D', text: 'static' }
            ],
            correctAnswer: 'C',
            marks: 1
          },
          {
            questionText: 'What does "===" check in JavaScript?',
            options: [
              { label: 'A', text: 'Only value equality' },
              { label: 'B', text: 'Only type equality' },
              { label: 'C', text: 'Both value and type equality' },
              { label: 'D', text: 'Reference equality' }
            ],
            correctAnswer: 'C',
            marks: 1
          },
          {
            questionText: 'Which method removes the last element from an array?',
            options: [
              { label: 'A', text: 'shift()' },
              { label: 'B', text: 'pop()' },
              { label: 'C', text: 'splice()' },
              { label: 'D', text: 'slice()' }
            ],
            correctAnswer: 'B',
            marks: 1
          },
          {
            questionText: 'What is the output of typeof null in JavaScript?',
            options: [
              { label: 'A', text: '"null"' },
              { label: 'B', text: '"undefined"' },
              { label: 'C', text: '"object"' },
              { label: 'D', text: '"boolean"' }
            ],
            correctAnswer: 'C',
            marks: 1
          },
          {
            questionText: 'Which of these is a correct arrow function syntax?',
            options: [
              { label: 'A', text: 'const fn = function => {}' },
              { label: 'B', text: 'const fn = () => {}' },
              { label: 'C', text: 'const fn -> {}' },
              { label: 'D', text: 'const fn = => {}' }
            ],
            correctAnswer: 'B',
            marks: 2
          },
          {
            questionText: 'What does the Array.map() method return?',
            options: [
              { label: 'A', text: 'A filtered array' },
              { label: 'B', text: 'The original array modified in place' },
              { label: 'C', text: 'A new array with transformed elements' },
              { label: 'D', text: 'A single accumulated value' }
            ],
            correctAnswer: 'C',
            marks: 1
          },
          {
            questionText: 'Which statement correctly creates a Promise?',
            options: [
              { label: 'A', text: 'new Promise(resolve, reject)' },
              { label: 'B', text: 'Promise.new((res, rej) => {})' },
              { label: 'C', text: 'new Promise((resolve, reject) => {})' },
              { label: 'D', text: 'Promise.create(() => {})' }
            ],
            correctAnswer: 'C',
            marks: 2
          },
          {
            questionText: 'What does the "async" keyword do to a function?',
            options: [
              { label: 'A', text: 'Makes it run in a separate thread' },
              { label: 'B', text: 'Makes it return a Promise automatically' },
              { label: 'C', text: 'Speeds up function execution' },
              { label: 'D', text: 'Prevents the function from throwing errors' }
            ],
            correctAnswer: 'B',
            marks: 1
          }
        ]
      });
      console.log('✅ Sample test created: JavaScript Basics');
    }

    console.log('\n🎉 Seed completed!');
    console.log(`Admin Login: ${admin.email} / ${adminPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seed();
