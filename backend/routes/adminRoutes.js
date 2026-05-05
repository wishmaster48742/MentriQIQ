/**
 * Admin Routes (Admin only — protected by adminOnly middleware)
 * Tests CRUD, Student management, Data export
 */

const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const User = require('../models/User');
const Result = require('../models/Result');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes here require admin auth
router.use(protect, adminOnly);

// ════════════════════════════════════════════════════════════
// TEST MANAGEMENT
// ════════════════════════════════════════════════════════════

// GET /api/admin/tests — Get all tests (with full data including answers)
router.get('/tests', async (req, res) => {
  try {
    const tests = await Test.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    // Count attempts for each test
    const testsWithStats = await Promise.all(tests.map(async (test) => {
      const attemptCount = await Result.countDocuments({ test: test._id });
      const avgScore = await Result.aggregate([
        { $match: { test: test._id } },
        { $group: { _id: null, avg: { $avg: '$percentage' } } }
      ]);
      return {
        ...test.toObject(),
        attemptCount,
        avgScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : 0
      };
    }));

    res.json({ tests: testsWithStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests.' });
  }
});

// POST /api/admin/tests — Create a new test
router.post('/tests', async (req, res) => {
  try {
    const { title, description, category, duration, questions, passingMarks,
            isScheduled, scheduledStart, scheduledEnd, allowRetake, shuffleQuestions, isPublished } = req.body;

    if (!title || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title, duration, and questions are required.' });
    }

    const test = await Test.create({
      title, description, category, duration, questions, passingMarks: passingMarks || 0,
      isScheduled: isScheduled || false,
      scheduledStart: isScheduled ? scheduledStart : null,
      scheduledEnd: isScheduled ? scheduledEnd : null,
      allowRetake: allowRetake || false,
      shuffleQuestions: shuffleQuestions || false,
      isPublished: Boolean(isPublished),
      createdBy: req.user._id
    });

    res.status(201).json({ message: 'Test created successfully!', test });
  } catch (err) {
    console.error('Create Test Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create test.' });
  }
});

// PUT /api/admin/tests/:id — Update a test
router.put('/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found.' });

    const updates = { ...req.body };
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    Object.assign(test, updates);
    await test.save();

    res.json({ message: 'Test updated!', test });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update test.' });
  }
});

// PATCH /api/admin/tests/:id/publish — Toggle publish status
router.patch('/tests/:id/publish', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found.' });
    test.isPublished = !test.isPublished;
    await test.save();
    res.json({ message: `Test ${test.isPublished ? 'published' : 'unpublished'}.`, isPublished: test.isPublished });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update test.' });
  }
});

// DELETE /api/admin/tests/:id — Delete a test
router.delete('/tests/:id', async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ test: req.params.id });  // Remove related results
    res.json({ message: 'Test deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test.' });
  }
});

// ════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ════════════════════════════════════════════════════════════

// GET /api/admin/students — Get all students with their results
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Attach result stats to each student
    const studentsWithStats = await Promise.all(students.map(async (student) => {
      const results = await Result.find({ student: student._id })
        .populate('test', 'title');
      
      return {
        ...student.toObject(),
        totalAttempts: results.length,
        results: results.map(r => ({
          testTitle: r.test?.title || 'Deleted Test',
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          submittedAt: r.submittedAt,
          proctoring: {
            integrityScore: r.proctoring?.integrityScore ?? 100,
            suspicious: r.proctoring?.suspicious ?? false,
            eventCounts: r.proctoring?.eventCounts || {},
            eventCount: (r.proctoring?.events || []).length
          }
        }))
      };
    }));

    res.json({ students: studentsWithStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════

// GET /api/admin/analytics — Dashboard stats
router.get('/analytics', async (req, res) => {
  try {
    const [totalStudents, totalTests, totalAttempts, recentResults, suspiciousAttempts] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Test.countDocuments(),
      Result.countDocuments(),
      Result.find()
        .populate('student', 'name')
        .populate('test', 'title')
        .select('score percentage submittedAt')
        .sort({ submittedAt: -1 })
        .limit(10),
      Result.countDocuments({ 'proctoring.suspicious': true })
    ]);

    // Average score across all tests
    const avgScoreResult = await Result.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } }
    ]);
    const avgPercentage = Math.round(avgScoreResult[0]?.avgPercentage || 0);

    // Tests by category
    const testsByCategory = await Test.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Daily attempts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyAttempts = await Result.aggregate([
      { $match: { submittedAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      stats: { totalStudents, totalTests, totalAttempts, avgPercentage, suspiciousAttempts },
      recentResults,
      testsByCategory,
      dailyAttempts
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// GET /api/admin/proctoring-report — Suspicious attempts and risk leaderboard
router.get('/proctoring-report', async (req, res) => {
  try {
    const attempts = await Result.find()
      .populate('student', 'name email')
      .populate('test', 'title category')
      .sort({ submittedAt: -1 })
      .limit(500);

    const formattedAttempts = attempts.map((attempt) => ({
      id: attempt._id,
      studentId: attempt.student?._id,
      studentName: attempt.student?.name || 'Unknown Student',
      studentEmail: attempt.student?.email || '',
      testTitle: attempt.test?.title || 'Deleted Test',
      category: attempt.test?.category || 'General',
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
      integrityScore: attempt.proctoring?.integrityScore ?? 100,
      suspicious: Boolean(attempt.proctoring?.suspicious),
      eventCounts: attempt.proctoring?.eventCounts || {},
      events: attempt.proctoring?.events || []
    }));

    const byStudent = {};
    for (const a of formattedAttempts) {
      const key = (a.studentId || a.studentEmail || a.studentName || '').toString();
      if (!byStudent[key]) {
        byStudent[key] = {
          studentId: a.studentId,
          studentName: a.studentName,
          studentEmail: a.studentEmail,
          attempts: 0,
          suspiciousAttempts: 0,
          avgIntegrityScore: 0
        };
      }
      byStudent[key].attempts += 1;
      byStudent[key].avgIntegrityScore += a.integrityScore;
      if (a.suspicious) byStudent[key].suspiciousAttempts += 1;
    }

    const riskLeaderboard = Object.values(byStudent)
      .map((s) => ({
        ...s,
        avgIntegrityScore: Math.round(s.avgIntegrityScore / Math.max(s.attempts, 1)),
        riskScore: Math.max(0, (s.suspiciousAttempts * 20) + (100 - Math.round(s.avgIntegrityScore / Math.max(s.attempts, 1))))
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    res.json({
      attempts: formattedAttempts,
      riskLeaderboard,
      summary: {
        totalAttempts: formattedAttempts.length,
        suspiciousAttempts: formattedAttempts.filter(a => a.suspicious).length,
        avgIntegrity: formattedAttempts.length
          ? Math.round(formattedAttempts.reduce((sum, a) => sum + a.integrityScore, 0) / formattedAttempts.length)
          : 100
      }
    });
  } catch (err) {
    console.error('Proctoring report error:', err);
    res.status(500).json({ error: 'Failed to fetch proctoring report.' });
  }
});

// ════════════════════════════════════════════════════════════
// DATA EXPORT
// ════════════════════════════════════════════════════════════

// GET /api/admin/export/students — Export student data as CSV
router.get('/export/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    const results = await Result.find().populate('test', 'title');

    // Build flat data for CSV: Name, Email, Phone, Test, Score
    const rows = [];
    for (const student of students) {
      const studentResults = results.filter(r => r.student.toString() === student._id.toString());
      
      if (studentResults.length === 0) {
        rows.push({
          Name: student.name,
          Email: student.email,
          'Contact Number': student.contactNumber,
          'Test Name': 'N/A',
          Score: 'N/A',
          'Total Marks': 'N/A',
          Percentage: 'N/A',
          'Submitted At': 'N/A'
        });
      } else {
        for (const result of studentResults) {
          rows.push({
            Name: student.name,
            Email: student.email,
            'Contact Number': student.contactNumber,
            'Test Name': result.test?.title || 'Deleted Test',
            Score: result.score,
            'Total Marks': result.totalMarks,
            Percentage: `${result.percentage}%`,
            'Submitted At': result.submittedAt.toISOString()
          });
        }
      }
    }

    // Convert to CSV manually (avoids library dependency issues)
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ];
    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="mentriqiq-students-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: 'Failed to export data.' });
  }
});

module.exports = router;
