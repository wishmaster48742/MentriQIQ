/**
 * Result Routes (Student-facing)
 * GET /api/results/my      - Get logged-in student's results
 * GET /api/results/leaderboard/:testId - Get leaderboard for a test
 */

const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const { protect } = require('../middleware/authMiddleware');

// ─── GET /api/results/my — Student's own results ──────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const results = await Result.find({ student: req.user._id })
      .populate('test', 'title category totalMarks duration')
      .select('-answers')  // Never expose answer details
      .sort({ submittedAt: -1 });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
});

// ─── GET /api/results/leaderboard/:testId — Public leaderboard ────────────────
router.get('/leaderboard/:testId', protect, async (req, res) => {
  try {
    const leaderboard = await Result.find({ test: req.params.testId })
      .populate('student', 'name')  // Only show student name, not email/phone
      .select('student score percentage timeTaken submittedAt -answers')
      .sort({ score: -1, timeTaken: 1 })  // Sort by score desc, then time asc
      .limit(20);

    // Add rank numbers
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      name: entry.student.name,
      score: entry.score,
      percentage: entry.percentage,
      timeTaken: entry.timeTaken,
      isCurrentUser: entry.student._id.toString() === req.user._id.toString()
    }));

    res.json({ leaderboard: rankedLeaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
