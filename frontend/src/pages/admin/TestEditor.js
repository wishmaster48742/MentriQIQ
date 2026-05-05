/**
 * TestEditor — Create or edit a test with questions
 * Handles: test meta, add/edit/remove MCQ questions, scheduling, settings, bulk import
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FiUploadCloud, FiFileText, FiFile, FiCheckCircle, FiClock, FiTarget, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${getDocument.version || '4.10.38'}/legacy/build/pdf.worker.min.mjs`;

const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', marginBottom: '4px' };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' };
const actionBtn = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };

const BLANK_QUESTION = () => ({
  questionText: '',
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correctAnswer: 'A',
  marks: 1,
});

const normalizeQuestion = (rawQuestion, idx) => {
  const questionText = (
    rawQuestion?.questionText ||
    rawQuestion?.question ||
    rawQuestion?.text ||
    ''
  ).toString().trim();

  if (!questionText) {
    throw new Error(`Question ${idx + 1} is missing question text`);
  }

  const optionMap = { A: '', B: '', C: '', D: '' };
  if (Array.isArray(rawQuestion?.options)) {
    rawQuestion.options.forEach((opt, i) => {
      const label = (opt?.label || ['A', 'B', 'C', 'D'][i] || '').toString().toUpperCase();
      if (optionMap[label] !== undefined) {
        optionMap[label] = (opt?.text || opt || '').toString().trim();
      }
    });
  } else {
    optionMap.A = (rawQuestion?.A || rawQuestion?.optionA || rawQuestion?.option1 || '').toString().trim();
    optionMap.B = (rawQuestion?.B || rawQuestion?.optionB || rawQuestion?.option2 || '').toString().trim();
    optionMap.C = (rawQuestion?.C || rawQuestion?.optionC || rawQuestion?.option3 || '').toString().trim();
    optionMap.D = (rawQuestion?.D || rawQuestion?.optionD || rawQuestion?.option4 || '').toString().trim();
  }

  if (!optionMap.A || !optionMap.B || !optionMap.C || !optionMap.D) {
    throw new Error(`Question ${idx + 1} must include A, B, C and D options`);
  }

  const answerRaw = (rawQuestion?.correctAnswer || rawQuestion?.answer || rawQuestion?.correct || 'A').toString().trim();
  const answerUpper = answerRaw.toUpperCase();
  let correctAnswer = ['A', 'B', 'C', 'D'].includes(answerUpper) ? answerUpper : 'A';

  if (!['A', 'B', 'C', 'D'].includes(answerUpper)) {
    const answerByText = Object.entries(optionMap).find(([, optionText]) => optionText.toLowerCase() === answerRaw.toLowerCase());
    if (answerByText) correctAnswer = answerByText[0];
  }

  const marks = Math.max(1, Number(rawQuestion?.marks || 1));
  return {
    questionText,
    options: [
      { label: 'A', text: optionMap.A },
      { label: 'B', text: optionMap.B },
      { label: 'C', text: optionMap.C },
      { label: 'D', text: optionMap.D },
    ],
    correctAnswer,
    marks,
  };
};

const parsePdfQuestions = async (file) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  let fullText = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    fullText += `${textContent.items.map(item => item.str).join(' ')}\n`;
  }

  // Expected PDF pattern:
  // Q1. Question text
  // A) option
  // B) option
  // C) option
  // D) option
  // Answer: B
  const blocks = fullText.split(/\bQ\d+[\.\): -]/i).filter(Boolean);
  const parsed = blocks.map((block, idx) => {
    const a = block.match(/A[\)\.\-:]\s*([\s\S]*?)\s*B[\)\.\-:]/i);
    const b = block.match(/B[\)\.\-:]\s*([\s\S]*?)\s*C[\)\.\-:]/i);
    const c = block.match(/C[\)\.\-:]\s*([\s\S]*?)\s*D[\)\.\-:]/i);
    const d = block.match(/D[\)\.\-:]\s*([\s\S]*?)(?:\s*Answer[\s:-]|$)/i);
    const answer = block.match(/Answer[\s:-]*([ABCD])/i);

    return normalizeQuestion({
      questionText: block.split(/A[\)\.\-:]/i)[0]?.trim(),
      A: a?.[1]?.trim(),
      B: b?.[1]?.trim(),
      C: c?.[1]?.trim(),
      D: d?.[1]?.trim(),
      correctAnswer: answer?.[1]?.toUpperCase() || 'A',
      marks: 1,
    }, idx);
  });

  if (!parsed.length) throw new Error('No valid questions found in PDF');
  return parsed;
};

export default function TestEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const { API } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [activeQ, setActiveQ] = useState(0);  // which question is expanded
  const [importing, setImporting] = useState(false);

  // Test meta
  const [meta, setMeta] = useState({
    title: '', description: '', category: 'General', duration: 30,
    passingMarks: 0, allowRetake: false, shuffleQuestions: false,
    isScheduled: false, scheduledStart: '', scheduledEnd: '',
  });

  // Questions array
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);

  // If editing, load existing test
  useEffect(() => {
    if (!isEdit) return;
    API.get(`/admin/tests`)
      .then(({ data }) => {
        const t = data.tests.find(t => t._id === id);
        if (!t) { toast.error('Test not found'); navigate('/admin/tests'); return; }
        setMeta({
          title: t.title, description: t.description || '', category: t.category || 'General',
          duration: t.duration, passingMarks: t.passingMarks || 0,
          allowRetake: t.allowRetake, shuffleQuestions: t.shuffleQuestions,
          isScheduled: t.isScheduled,
          scheduledStart: t.scheduledStart ? new Date(t.scheduledStart).toISOString().slice(0, 16) : '',
          scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd).toISOString().slice(0, 16) : '',
        });
        setQuestions(t.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks,
        })));
      })
      .catch(() => toast.error('Failed to load test'));
  }, [id, isEdit, API, navigate]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setMField = (k, v) => setMeta(p => ({ ...p, [k]: v }));

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, label, text) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.map(o => o.label === label ? { ...o, text } : o) };
    }));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, BLANK_QUESTION()]);
    setActiveQ(questions.length);
    toast('Question added', { icon: '➕' });
  };

  const removeQuestion = (idx) => {
    if (questions.length === 1) { toast.error('At least 1 question required'); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setActiveQ(prev => Math.min(prev, questions.length - 2));
  };

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsedRows = [];

      if (ext === 'csv') {
        const csvText = await file.text();
        const csvResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        if (csvResult.errors.length) throw new Error('CSV parsing failed');
        parsedRows = csvResult.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      } else if (ext === 'json') {
        const content = JSON.parse(await file.text());
        parsedRows = Array.isArray(content) ? content : (content.questions || []);
      } else if (ext === 'pdf') {
        parsedRows = await parsePdfQuestions(file);
      } else {
        throw new Error('Unsupported file format. Use CSV, XLSX, XLS, PDF, or JSON');
      }

      const normalized = parsedRows.map((item, index) => normalizeQuestion(item, index));
      setQuestions(prev => [...prev, ...normalized]);
      setActiveQ(questions.length);
      toast.success(`${normalized.length} questions imported successfully`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleSave = async (publish = false) => {
    // Validation
    if (!meta.title.trim()) { toast.error('Test title is required'); return; }
    if (meta.duration < 1) { toast.error('Duration must be ≥ 1 minute'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) { toast.error(`Question ${i + 1}: text is required`); setActiveQ(i); return; }
      for (const o of q.options) {
        if (!o.text.trim()) { toast.error(`Question ${i + 1}: all 4 options required`); setActiveQ(i); return; }
      }
    }

    setSaving(true);
    const payload = { ...meta, questions, isPublished: publish || (isEdit ? undefined : false) };

    try {
      if (isEdit) {
        await API.put(`/admin/tests/${id}`, payload);
        toast.success('Test updated!');
      } else {
        await API.post('/admin/tests', payload);
        toast.success('Test created!');
      }
      navigate('/admin/tests');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const totalMarks = questions.reduce((s, q) => s + Number(q.marks || 1), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800' }}>{isEdit ? 'Edit Test' : 'Create New Test'}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: '14px' }}>
              {questions.length} questions · {totalMarks} total marks
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/admin/tests')} style={{ ...actionBtn, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>
              <FiFileText />
              Cancel
            </button>
            <button onClick={() => handleSave(false)} disabled={saving} style={{ ...actionBtn, border: '1.5px solid #6366f1', background: 'transparent', color: '#6366f1', opacity: saving ? 0.7 : 1 }}>
              <FiCheckCircle />
              Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} style={{ ...actionBtn, padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', opacity: saving ? 0.7 : 1 }}>
              <FiTarget />
              {saving ? 'Saving...' : isEdit ? 'Save & Publish' : 'Create & Publish'}
            </button>
          </div>
        </div>

        <div style={{ ...card, marginBottom: '20px', border: '1px solid rgba(99,102,241,0.25)', background: 'linear-gradient(180deg,rgba(99,102,241,0.05),transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUploadCloud /> Bulk Question Import
              </h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>
                Upload `.csv`, `.xlsx`, `.xls`, `.pdf`, or `.json` to add multiple questions quickly.
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '12px' }}>
                Required fields: questionText/question, A, B, C, D, correctAnswer, marks(optional).
              </p>
            </div>
            <label style={{ ...actionBtn, border: '1px dashed #6366f1', color: '#6366f1', background: 'rgba(99,102,241,0.08)' }}>
              <FiFile />
              {importing ? 'Importing...' : 'Upload Questions'}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.json"
                onChange={handleBulkImport}
                style={{ display: 'none' }}
                disabled={importing}
              />
            </label>
          </div>
        </div>

        {/* ── Test Meta ────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Test Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Test Title *</label>
              <input style={inputStyle} placeholder="e.g. JavaScript Fundamentals" value={meta.title} onChange={e => setMField('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <input style={inputStyle} placeholder="e.g. Programming, Aptitude..." value={meta.category} onChange={e => setMField('category', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Duration (minutes) *</label>
              <input style={inputStyle} type="number" min="1" max="180" value={meta.duration} onChange={e => setMField('duration', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label style={labelStyle}>Passing Marks (0 = no pass/fail)</label>
              <input style={inputStyle} type="number" min="0" value={meta.passingMarks} onChange={e => setMField('passingMarks', parseInt(e.target.value) || 0)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', marginBottom: 0 }} placeholder="Brief description for students..." value={meta.description} onChange={e => setMField('description', e.target.value)} />
            </div>
          </div>

          {/* Settings row */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
            {[
              { key: 'allowRetake', label: 'Allow Retake' },
              { key: 'shuffleQuestions', label: 'Shuffle Questions' },
              { key: 'isScheduled', label: 'Schedule Availability' },
            ].map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                <input type="checkbox" checked={meta[s.key]} onChange={e => setMField(s.key, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} />
                {s.label}
              </label>
            ))}
          </div>

          {/* Schedule inputs */}
          {meta.isScheduled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <label style={labelStyle}>Start Date & Time</label>
                <input style={inputStyle} type="datetime-local" value={meta.scheduledStart} onChange={e => setMField('scheduledStart', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Date & Time (optional)</label>
                <input style={inputStyle} type="datetime-local" value={meta.scheduledEnd} onChange={e => setMField('scheduledEnd', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* ── Questions ────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Questions ({questions.length})</h2>
            <button onClick={addQuestion} style={{ ...actionBtn, padding: '8px 16px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none' }}>
              <FiPlusCircle />
              Add Question
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q, idx) => {
              const expanded = activeQ === idx;
              return (
                <div key={idx} style={{ border: `1.5px solid ${expanded ? '#6366f1' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {/* Question header bar */}
                  <div
                    onClick={() => setActiveQ(expanded ? -1 : idx)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: expanded ? 'rgba(99,102,241,0.05)' : 'var(--bg)', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: expanded ? '#6366f1' : 'var(--border)', color: expanded ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: expanded ? '600' : '400', color: q.questionText ? 'var(--text)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.questionText || 'Click to edit question...'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>{q.marks} mk</span>
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Ans: {q.correctAnswer}</span>
                      <button onClick={e => { e.stopPropagation(); removeQuestion(idx); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}><FiTrash2 /> Delete</button>
                      <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {expanded && (
                    <div style={{ padding: '20px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <label style={labelStyle}>Question Text *</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: '16px' }}
                        placeholder="Type your question here..."
                        value={q.questionText}
                        onChange={e => updateQuestion(idx, 'questionText', e.target.value)}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                        {q.options.map(opt => (
                          <div key={opt.label}>
                            <label style={labelStyle}>Option {opt.label}</label>
                            <input
                              style={inputStyle}
                              placeholder={`Option ${opt.label}...`}
                              value={opt.text}
                              onChange={e => updateOption(idx, opt.label, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>Correct Answer *</label>
                          <select style={inputStyle} value={q.correctAnswer} onChange={e => updateQuestion(idx, 'correctAnswer', e.target.value)}>
                            {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>Option {l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Marks for this question</label>
                          <input style={inputStyle} type="number" min="1" max="10" value={q.marks} onChange={e => updateQuestion(idx, 'marks', parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={addQuestion} style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            + Add Another Question
          </button>
        </div>

        {/* Summary */}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '28px' }}>
            <div><p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><FiFileText /> QUESTIONS</p><p style={{ fontSize: '22px', fontWeight: '800', color: '#6366f1' }}>{questions.length}</p></div>
            <div><p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><FiTarget /> TOTAL MARKS</p><p style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b' }}>{totalMarks}</p></div>
            <div><p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><FiClock /> DURATION</p><p style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>{meta.duration}m</p></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: '12px 22px', borderRadius: '10px', border: '1.5px solid #6366f1', background: 'transparent', color: '#6366f1', fontWeight: '700', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
              Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} style={{ padding: '12px 22px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : isEdit ? 'Save & Publish' : 'Create & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
