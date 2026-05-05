/**
 * Test Routes (Student-facing)
 * GET  /api/tests         - Get all available/published tests
 * GET  /api/tests/:id     - Get single test (without correct answers!)
 * POST /api/tests/:id/start - Start a test attempt
 */

const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const Result = require('../models/Result');
const { protect } = require('../middleware/authMiddleware');
const { sendTestResultEmail } = require('../utils/emailService');

// ─── GET /api/tests — List all available tests ────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();

    // Find all published tests that are currently available
    const tests = await Test.find({
      isPublished: true,
      $or: [
        { isScheduled: false },
        {
          isScheduled: true,
          scheduledStart: { $lte: now },
          $or: [
            { scheduledEnd: null },
            { scheduledEnd: { $gte: now } }
          ]
        }
      ]
    })
    .select('-questions.correctAnswer -questions.explanation') // Hide answers from list
    .sort({ createdAt: -1 });

    // For each test, check if student already attempted it
    const studentResults = await Result.find({ student: req.user._id })
      .select('test score percentage');

    const testsWithStatus = tests.map(test => {
      const result = studentResults.find(r => r.test.toString() === test._id.toString());
      return {
        ...test.toObject(),
        attempted: !!result,
        myScore: result ? result.score : null,
        myPercentage: result ? result.percentage : null
      };
    });

    res.json({ tests: testsWithStatus });
  } catch (err) {
    console.error('Get Tests Error:', err);
    res.status(500).json({ error: 'Failed to fetch tests.' });
  }
});

// ─── GET /api/tests/:id — Get single test for taking ─────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .select('-questions.correctAnswer -questions.explanation'); // NEVER send answers to frontend

    if (!test) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    if (!test.isPublished) {
      return res.status(403).json({ error: 'This test is not available.' });
    }

    // Check if student already attempted (and retake not allowed)
    if (!test.allowRetake) {
      const existingResult = await Result.findOne({ student: req.user._id, test: test._id });
      if (existingResult) {
        return res.status(400).json({ error: 'You have already attempted this test.' });
      }
    }

    // Shuffle questions if setting enabled (create a copy to not modify DB)
    let testData = test.toObject();
    if (test.shuffleQuestions) {
      testData.questions = testData.questions.sort(() => Math.random() - 0.5);
    }

    res.json({ test: testData });
  } catch (err) {
    console.error('Get Test Error:', err);
    res.status(500).json({ error: 'Failed to fetch test.' });
  }
});

// ─── POST /api/tests/:id/submit — Submit test answers ────────────────────────
router.post('/:id/submit', protect, async (req, res) => {
  const { answers, timeTaken, isAutoSubmitted, proctoringReport } = req.body;
  // answers = [{ questionId: "...", selectedAnswer: "A" }, ...]

  try {
    // Get the test WITH correct answers (server-side only)
    const test = await Test.findById(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    // Prevent re-submission if retake not allowed
    if (!test.allowRetake) {
      const existing = await Result.findOne({ student: req.user._id, test: test._id });
      if (existing) {
        return res.status(400).json({ error: 'You have already submitted this test.' });
      }
    }

    // ─── Calculate score server-side (NEVER trust client score) ──────────
    let score = 0;
    const detailedAnswers = test.questions.map(question => {
      const studentAnswer = answers?.find(a => a.questionId === question._id.toString());
      const selectedAnswer = studentAnswer?.selectedAnswer || null;
      const isCorrect = selectedAnswer === question.correctAnswer;

      if (isCorrect) score += question.marks;

      return {
        questionId: question._id,
        selectedAnswer,
        isCorrect
      };
    });

    const percentage = Math.round((score / test.totalMarks) * 100);
    const isPassed = percentage >= (test.passingMarks / test.totalMarks * 100);

    const safeEvents = Array.isArray(proctoringReport?.events)
      ? proctoringReport.events.slice(0, 200).map(e => ({
          type: e.type,
          message: (e.message || '').toString().slice(0, 300),
          severity: ['low', 'medium', 'high'].includes(e.severity) ? e.severity : 'low',
          at: e.at ? new Date(e.at) : new Date()
        }))
      : [];

    const eventCounts = {
      tabSwitch: Number(proctoringReport?.eventCounts?.tabSwitch || 0),
      windowBlur: Number(proctoringReport?.eventCounts?.windowBlur || 0),
      copyPaste: Number(proctoringReport?.eventCounts?.copyPaste || 0),
      rightClick: Number(proctoringReport?.eventCounts?.rightClick || 0),
      fullscreenExit: Number(proctoringReport?.eventCounts?.fullscreenExit || 0),
      noFaceDetected: Number(proctoringReport?.eventCounts?.noFaceDetected || 0),
      multipleFaces: Number(proctoringReport?.eventCounts?.multipleFaces || 0),
      faceDrift: Number(proctoringReport?.eventCounts?.faceDrift || 0),
      mobileDeviceDetected: Number(proctoringReport?.eventCounts?.mobileDeviceDetected || 0)
    };

    const weightedViolations =
      (eventCounts.tabSwitch * 8) +
      (eventCounts.windowBlur * 6) +
      (eventCounts.copyPaste * 5) +
      (eventCounts.rightClick * 3) +
      (eventCounts.fullscreenExit * 8) +
      (eventCounts.noFaceDetected * 10) +
      (eventCounts.multipleFaces * 14) +
      (eventCounts.faceDrift * 4) +
      (eventCounts.mobileDeviceDetected * 6);

    const integrityScore = Math.max(0, 100 - weightedViolations);
    const suspicious = integrityScore < 70 || safeEvents.some(e => e.severity === 'high');

    // Save result
    const result = await Result.create({
      student: req.user._id,
      test: test._id,
      score,
      totalMarks: test.totalMarks,
      percentage,
      isPassed,
      timeTaken: timeTaken || 0,
      isAutoSubmitted: isAutoSubmitted || false,
      proctoring: {
        integrityScore,
        suspicious,
        eventCounts,
        events: safeEvents
      },
      answers: detailedAnswers  // Stored but not returned to student
    });

    // Send email notification (async, don't await to avoid blocking response)
    sendTestResultEmail(req.user, test, { score, totalMarks: test.totalMarks, percentage })
      .catch(err => console.error('Email send failed:', err));

    // Return ONLY score — no answer breakdown for students
    res.json({
      message: 'Test submitted successfully!',
      result: {
        id: result._id,
        score,
        totalMarks: test.totalMarks,
        percentage,
        isPassed,
        timeTaken
      }
    });
  } catch (err) {
    console.error('Submit Test Error:', err);
    res.status(500).json({ error: 'Failed to submit test.' });
  }
});

module.exports = router;
