/**
 * Test Page — Main MCQ test-taking interface
 * Features: timer, auto-submit, anti-cheat tab warning, question navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiClock,
  FiLoader,
  FiMic,
  FiPlayCircle,
  FiSend,
  FiShield,
} from 'react-icons/fi';

export default function TestPage() {
  const { id } = useParams();
  const { API } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});  // { questionIndex: 'A'|'B'|'C'|'D' }
  const [timeLeft, setTimeLeft] = useState(0);  // in seconds
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [mediaStatus, setMediaStatus] = useState({ camera: 'pending', mic: 'pending' });
  const [tabWarnings, setTabWarnings] = useState(0);
  const [blinkOn, setBlinkOn] = useState(true);
  const timerRef = useRef(null);
  const isAutoSubmitted = useRef(false);
  const mediaStreamRef = useRef(null);
  const startTimeRef = useRef(null);
  const previewVideoRef = useRef(null);
  const proctoringEventsRef = useRef([]);
  const proctoringCountsRef = useRef({
    tabSwitch: 0,
    windowBlur: 0,
    copyPaste: 0,
    rightClick: 0,
    fullscreenExit: 0,
    noFaceDetected: 0,
    multipleFaces: 0,
    faceDrift: 0,
    mobileDeviceDetected: 0,
  });

  // ─── Load test ──────────────────────────────────────────────────────────────
  useEffect(() => {
    API.get(`/tests/${id}`)
      .then(({ data }) => {
        setTest(data.test);
        setTimeLeft(data.test.duration * 60);
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to load test');
        navigate('/tests');
      })
      .finally(() => setLoading(false));
  }, [id, API, navigate]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestMediaAccess = async () => {
    setPrecheckLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      setMediaStatus({ camera: 'granted', mic: 'granted' });
      return true;
    } catch (err) {
      setMediaStatus({ camera: 'blocked', mic: 'blocked' });
      toast.error('Camera/Mic access denied. Please allow access to continue.');
      return false;
    } finally {
      setPrecheckLoading(false);
    }
  };

  const logProctoringEvent = useCallback((type, message, severity = 'low') => {
    if (!proctoringCountsRef.current[type] && proctoringCountsRef.current[type] !== 0) return;
    proctoringCountsRef.current[type] += 1;
    proctoringEventsRef.current.push({
      type,
      message,
      severity,
      at: new Date().toISOString(),
    });
  }, []);

  const handleStartTest = async () => {
    const accessGranted = await requestMediaAccess();
    if (!accessGranted) return;
    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // user may deny fullscreen; still allow test
      }
    }
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      logProctoringEvent('mobileDeviceDetected', 'Test attempted on mobile device.', 'medium');
    }
    startTimeRef.current = Date.now();
    setTestStarted(true);
    toast.success('Pre-check complete. Test started.');
  };

  // ─── Submit test ─────────────────────────────────────────────────────────────
  const submitTest = useCallback(async (auto = false) => {
    if (submitting || !test) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    const formattedAnswers = Object.entries(answers).map(([qIdx, selectedAnswer]) => ({
      questionId: test.questions[parseInt(qIdx)]._id,
      selectedAnswer
    }));

    const timeTaken = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);

    try {
      const { data } = await API.post(`/tests/${id}/submit`, {
        answers: formattedAnswers,
        timeTaken,
        isAutoSubmitted: auto,
        proctoringReport: {
          eventCounts: proctoringCountsRef.current,
          events: proctoringEventsRef.current
        }
      });
      toast.success(auto ? 'Time up! Test auto-submitted.' : 'Test submitted successfully.');
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      navigate(`/result/${data.result.id}`, { state: { result: data.result, testTitle: test.title } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
      setSubmitting(false);
    }
  }, [answers, test, id, API, navigate, submitting]);

  // ─── Timer countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!test || !testStarted || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!isAutoSubmitted.current) {
            isAutoSubmitted.current = true;
            submitTest(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [test, testStarted, submitTest, timeLeft]);

  useEffect(() => {
    if (!testStarted) return undefined;
    const blinkTimer = setInterval(() => setBlinkOn(prev => !prev), 650);
    return () => clearInterval(blinkTimer);
  }, [testStarted]);

  // ─── Anti-cheat: Tab visibility detection ────────────────────────────────────
  useEffect(() => {
    if (!testStarted) return undefined;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringEvent('tabSwitch', 'Student switched tab/window during test.', 'high');
        setTabWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast.error('Multiple tab switches detected. Test will be submitted.');
            setTimeout(() => submitTest(true), 1500);
          } else {
            toast('Warning: Do not switch tabs. This may invalidate your test.', { icon: '⚠️', duration: 4000 });
          }
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitTest, testStarted]);

  useEffect(() => {
    if (!testStarted) return undefined;

    const handleWindowBlur = () => {
      logProctoringEvent('windowBlur', 'Browser window lost focus during test.', 'medium');
    };
    const handleCopyPaste = (e) => {
      e.preventDefault();
      logProctoringEvent('copyPaste', 'Copy or paste attempt detected.', 'medium');
      toast.error('Copy/Paste is not allowed during the test.');
    };
    const handleContextMenu = (e) => {
      e.preventDefault();
      logProctoringEvent('rightClick', 'Right click detected during test.', 'low');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logProctoringEvent('fullscreenExit', 'Fullscreen mode exited during test.', 'high');
        toast.error('Fullscreen exited. Please return to test window.');
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [logProctoringEvent, testStarted]);

  useEffect(() => {
    if (!testStarted) return undefined;
    let stopped = false;
    let intervalId = null;

    const detectFaces = async () => {
      try {
        if (!('FaceDetector' in window) || !previewVideoRef.current || previewVideoRef.current.readyState < 2) return;
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(previewVideoRef.current);
        if (stopped) return;

        if (!faces.length) {
          logProctoringEvent('noFaceDetected', 'No face detected in camera view.', 'high');
          toast.error('Face not visible. Keep your face in frame.');
          return;
        }
        if (faces.length > 1) {
          logProctoringEvent('multipleFaces', 'Multiple faces detected in camera frame.', 'high');
          toast.error('Multiple faces detected. Ensure only one person is visible.');
          return;
        }

        const box = faces[0].boundingBox;
        const vw = previewVideoRef.current.videoWidth || 1;
        const vh = previewVideoRef.current.videoHeight || 1;
        const centerX = (box.x + box.width / 2) / vw;
        const centerY = (box.y + box.height / 2) / vh;
        if (centerX < 0.2 || centerX > 0.8 || centerY < 0.15 || centerY > 0.85) {
          logProctoringEvent('faceDrift', 'Face moved away from center view.', 'medium');
        }
      } catch {
        // Silently ignore unsupported detector/runtime issues.
      }
    };

    intervalId = setInterval(detectFaces, 12000);
    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [logProctoringEvent, testStarted]);

  // ─── Format time display ──────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><FiLoader /></div>
          <p>Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test) return null;

  const question = test.questions[currentQ];
  const answered = Object.keys(answers).length;
  const timerDanger = timeLeft <= 60;

  if (!testStarted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FiShield color="#6366f1" /> Test Proctoring Pre-check
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                  Complete this quick camera and microphone check before starting your test.
                </p>
              </div>
              <button
                onClick={() => navigate('/tests')}
                style={{ border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
              >
                <FiArrowLeft /> Back to Tests
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiCamera /> Live Camera Preview
                </div>
                <div style={{ height: '260px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: mediaStatus.camera === 'granted' ? 1 : 0.3 }}
                  />
                  {mediaStatus.camera !== 'granted' && (
                    <div style={{ position: 'absolute', color: 'white', textAlign: 'center' }}>
                      <FiCamera size={28} />
                      <div style={{ marginTop: '8px', fontSize: '13px' }}>Camera preview will appear after permission.</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'camera', label: 'Camera Access', icon: <FiCamera /> },
                  { key: 'mic', label: 'Microphone Access', icon: <FiMic /> },
                ].map(item => {
                  const status = mediaStatus[item.key];
                  const statusColor = status === 'granted' ? '#10b981' : status === 'blocked' ? '#ef4444' : '#f59e0b';
                  const statusLabel = status === 'granted' ? 'Granted' : status === 'blocked' ? 'Blocked' : 'Pending';
                  return (
                    <div key={item.key} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>{item.icon} {item.label}</div>
                        <span style={{ color: statusColor, fontWeight: '700', fontSize: '13px' }}>{statusLabel}</span>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleStartTest}
                  disabled={precheckLoading}
                  style={{ marginTop: '8px', border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: precheckLoading ? 0.75 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {precheckLoading ? <FiLoader /> : <FiPlayCircle />}
                  {precheckLoading ? 'Checking permissions...' : 'Allow Access & Start Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed Header with timer */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>{test.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{answered}/{test.questions.length} answered</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', opacity: blinkOn ? 1 : 0.35, transition: 'opacity 0.3s' }} />
            <FiCamera size={12} /> Cam Active
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiMic size={12} /> Mic Active
          </span>
          {tabWarnings > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#ef4444', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FiAlertTriangle size={12} /> {tabWarnings} warning{tabWarnings > 1 ? 's' : ''}
            </span>
          )}
          {/* Timer */}
          <div style={{ background: timerDanger ? '#fee2e2' : 'rgba(99,102,241,0.1)', color: timerDanger ? '#ef4444' : '#6366f1', padding: '8px 18px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '20px', fontWeight: '800', transition: 'all 0.3s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <FiClock /> {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => { if (window.confirm(`Submit test now? You've answered ${answered}/${test.questions.length} questions.`)) submitTest(false); }}
            disabled={submitting}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: '700', fontSize: '14px', opacity: submitting ? 0.7 : 1, border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <FiSend />
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1, display: 'flex', gap: '24px' }}>
        
        {/* Question Panel */}
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Question {currentQ + 1} of {test.questions.length}
              </span>
              <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
                {question.marks} mark{question.marks > 1 ? 's' : ''}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--border)', borderRadius: '4px', height: '4px', marginBottom: '24px' }}>
              <div style={{ width: `${((currentQ + 1) / test.questions.length) * 100}%`, height: '4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '700', lineHeight: '1.6', marginBottom: '28px' }}>
              {question.questionText}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {question.options.map(option => {
                const selected = answers[currentQ] === option.label;
                return (
                  <button
                    key={option.label}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: option.label }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                      borderRadius: '10px', border: `2px solid ${selected ? '#6366f1' : 'var(--border)'}`,
                      background: selected ? 'rgba(99,102,241,0.08)' : 'var(--bg)',
                      color: 'var(--text)', fontSize: '15px', textAlign: 'left',
                      transition: 'all 0.2s', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? '#6366f1' : 'var(--border)', color: selected ? 'white' : 'var(--text-muted)', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                      {option.label}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button
                onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                disabled={currentQ === 0}
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: '600', opacity: currentQ === 0 ? 0.4 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FiArrowLeft /> Previous
              </button>
              <button
                onClick={() => setCurrentQ(p => Math.min(test.questions.length - 1, p + 1))}
                disabled={currentQ === test.questions.length - 1}
                style={{ padding: '10px 24px', borderRadius: '8px', background: '#6366f1', color: 'white', fontWeight: '600', opacity: currentQ === test.questions.length - 1 ? 0.4 : 1, border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                Next <FiArrowRight />
              </button>
            </div>
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {test.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  style={{
                    padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                    border: idx === currentQ ? '2px solid #6366f1' : '1px solid var(--border)',
                    background: answers[idx] ? '#10b981' : idx === currentQ ? 'rgba(99,102,241,0.1)' : 'var(--bg)',
                    color: answers[idx] ? 'white' : 'var(--text)',
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                Answered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--border)' }} />
                Unanswered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
