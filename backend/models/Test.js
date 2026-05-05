/**
 * Test Model
 * Stores test/quiz configuration including questions and scheduling
 */

const mongoose = require('mongoose');

// ─── Sub-schema for each MCQ option ──────────────────────────────────────────
const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  label: { type: String, enum: ['A', 'B', 'C', 'D'], required: true }
}, { _id: false });

// ─── Sub-schema for each question ────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: {
    type: [optionSchema],
    validate: {
      validator: arr => arr.length === 4,
      message: 'Each question must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: [true, 'Correct answer is required']
  },
  marks: {
    type: Number,
    default: 1,
    min: [1, 'Marks must be at least 1']
  },
  explanation: {
    type: String,
    default: ''  // Optional explanation (only shown to admin)
  }
});

// ─── Main Test Schema ─────────────────────────────────────────────────────────
const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  duration: {
    type: Number,  // in minutes
    required: [true, 'Test duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: arr => arr.length > 0,
      message: 'Test must have at least 1 question'
    }
  },
  totalMarks: {
    type: Number,
    default: 0  // Auto-calculated
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  // ─── Scheduling ─────────────────────────────────────────────────────────
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledStart: {
    type: Date,
    default: null
  },
  scheduledEnd: {
    type: Date,
    default: null
  },
  // ─── Visibility ──────────────────────────────────────────────────────────
  isPublished: {
    type: Boolean,
    default: false
  },
  // ─── Settings ─────────────────────────────────────────────────────────────
  allowRetake: {
    type: Boolean,
    default: false
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// ─── Auto-calculate total marks before saving ────────────────────────────────
testSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
  }
  next();
});

// ─── Virtual: Is test currently available? ───────────────────────────────────
testSchema.virtual('isAvailable').get(function() {
  if (!this.isPublished) return false;
  if (!this.isScheduled) return true;  // No schedule = always available if published
  
  const now = new Date();
  const start = this.scheduledStart;
  const end = this.scheduledEnd;
  
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
});

module.exports = mongoose.model('Test', testSchema);
