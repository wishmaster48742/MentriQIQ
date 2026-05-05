/**
 * Result Model
 * Stores test attempt results for students
 * NOTE: We store only score totals — not individual answer details per user
 */

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  // ─── Score Info ─────────────────────────────────────────────────────────
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  // ─── Attempt Meta ────────────────────────────────────────────────────────
  timeTaken: {
    type: Number,  // in seconds
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isAutoSubmitted: {
    type: Boolean,  // True if timer ran out
    default: false
  },
  proctoring: {
    integrityScore: {
      type: Number,
      default: 100
    },
    suspicious: {
      type: Boolean,
      default: false
    },
    eventCounts: {
      tabSwitch: { type: Number, default: 0 },
      windowBlur: { type: Number, default: 0 },
      copyPaste: { type: Number, default: 0 },
      rightClick: { type: Number, default: 0 },
      fullscreenExit: { type: Number, default: 0 },
      noFaceDetected: { type: Number, default: 0 },
      multipleFaces: { type: Number, default: 0 },
      faceDrift: { type: Number, default: 0 },
      mobileDeviceDetected: { type: Number, default: 0 }
    },
    events: [{
      type: {
        type: String,
        enum: [
          'tabSwitch',
          'windowBlur',
          'copyPaste',
          'rightClick',
          'fullscreenExit',
          'noFaceDetected',
          'multipleFaces',
          'faceDrift',
          'mobileDeviceDetected'
        ]
      },
      message: { type: String, default: '' },
      severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      at: { type: Date, default: Date.now },
      _id: false
    }]
  },
  // ─── Answers (stored internally for admin analytics, NOT shown to students) ─
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: { type: String, enum: ['A', 'B', 'C', 'D', null] },
    isCorrect: Boolean,
    _id: false
  }]
}, {
  timestamps: true
});

// ─── Prevent duplicate attempts (unless retake is allowed) ───────────────────
resultSchema.index({ student: 1, test: 1 });

module.exports = mongoose.model('Result', resultSchema);
