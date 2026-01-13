'use client';

import { useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface FeedbackFormProps {
  reservationId: string;
  studentId: string;
  lessonInfo: {
    subject: string;
    level: number;
    date: string;
    time: string;
  };
  onComplete: () => void;
  onSkip: () => void;
  onClose?: () => void;
}

export default function FeedbackForm({ 
  reservationId, 
  studentId, 
  lessonInfo, 
  onComplete, 
  onSkip,
  onClose 
}: FeedbackFormProps) {
  const [ratings, setRatings] = useState({
    overall: 0,
    connection: 0,
    pace: 0,
    clarity: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<{ category: string; value: number } | null>(null);

  const categories = [
    { key: 'overall', label: 'Overall', icon: '⭐' },
    { key: 'connection', label: 'Internet', icon: '📶' },
    { key: 'pace', label: 'Pace', icon: '🏃' },
    { key: 'clarity', label: 'Clarity', icon: '💡' },
  ];

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      alert('Please rate the overall experience');
      return;
    }

    setSubmitting(true);
    try {
      const { error: feedbackError } = await supabase
        .from('feedbacks')
        .insert({
          reservation_id: reservationId,
          student_id: studentId,
          rating_overall: ratings.overall,
          rating_connection: ratings.connection || null,
          rating_pace: ratings.pace || null,
          rating_clarity: ratings.clarity || null,
          comment: comment || null,
        });

      if (feedbackError) throw feedbackError;

      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ 
          status: 'attended',
          completed_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (reservationError) throw reservationError;

      onComplete();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'attended',
          completed_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;
      onSkip();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to skip. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onSkip();
    }
  };

  const renderStars = (category: string, currentValue: number) => {
    const stars = [];
    const displayValue = hoveredRating?.category === category 
      ? hoveredRating.value 
      : currentValue;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setRatings(prev => ({ ...prev, [category]: i }))}
          onMouseEnter={() => setHoveredRating({ category, value: i })}
          onMouseLeave={() => setHoveredRating(null)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
        >
          {i <= displayValue ? '★' : '☆'}
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Lesson Complete!</h2>
          <p className="text-slate-500 mt-1">
            {lessonInfo.subject === 'math' ? 'Math' : 'English'} Level {lessonInfo.level}
          </p>
          <p className="text-sm text-slate-400">{lessonInfo.date} • {lessonInfo.time}</p>
        </div>

        {/* 評価フォーム */}
        <div className="space-y-4 mb-6">
          {categories.map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <span className="font-medium text-slate-700">{label}</span>
                {key === 'overall' && <span className="text-red-500">*</span>}
              </div>
              <div className="flex text-amber-400">
                {renderStars(key, ratings[key as keyof typeof ratings])}
              </div>
            </div>
          ))}
        </div>

        {/* コメント */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            💬 Comments (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any feedback for the teacher?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-black"
            rows={3}
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 transition-opacity"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          You can rate this lesson later from the calendar
        </p>
      </div>
    </div>
  );
}
