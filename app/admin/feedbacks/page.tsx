'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';

interface Feedback {
  id: string;
  rating_overall: number;
  rating_connection: number | null;
  rating_pace: number | null;
  rating_clarity: number | null;
  comment: string | null;
  created_at: string;
  student_name: string;
  lesson_date: string;
  lesson_time: string;
  subject: string;
  level: number;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select(`
          id,
          rating_overall,
          rating_connection,
          rating_pace,
          rating_clarity,
          comment,
          created_at,
          students (name),
          reservations (
            lessons (
              date,
              start_time,
              classes (subject, level)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFeedbacks = (data || []).map((f: any) => ({
        id: f.id,
        rating_overall: f.rating_overall,
        rating_connection: f.rating_connection,
        rating_pace: f.rating_pace,
        rating_clarity: f.rating_clarity,
        comment: f.comment,
        created_at: f.created_at,
        student_name: f.students?.name || 'Unknown',
        lesson_date: f.reservations?.lessons?.date || '',
        lesson_time: f.reservations?.lessons?.start_time || '',
        subject: f.reservations?.lessons?.classes?.subject || '',
        level: f.reservations?.lessons?.classes?.level || 0,
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-slate-300">—</span>;
    return (
      <span className="text-amber-400">
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    );
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesRating = filterRating === null || f.rating_overall === filterRating;
    const matchesSubject = filterSubject === 'all' || f.subject === filterSubject;
    return matchesRating && matchesSubject;
  });

  const avgOverall = feedbacks.length > 0
    ? Math.round(feedbacks.reduce((sum, f) => sum + f.rating_overall, 0) / feedbacks.length * 10) / 10
    : 0;

  const avgConnection = feedbacks.filter(f => f.rating_connection).length > 0
    ? Math.round(feedbacks.filter(f => f.rating_connection).reduce((sum, f) => sum + (f.rating_connection || 0), 0) / feedbacks.filter(f => f.rating_connection).length * 10) / 10
    : 0;

  const avgPace = feedbacks.filter(f => f.rating_pace).length > 0
    ? Math.round(feedbacks.filter(f => f.rating_pace).reduce((sum, f) => sum + (f.rating_pace || 0), 0) / feedbacks.filter(f => f.rating_pace).length * 10) / 10
    : 0;

  const avgClarity = feedbacks.filter(f => f.rating_clarity).length > 0
    ? Math.round(feedbacks.filter(f => f.rating_clarity).reduce((sum, f) => sum + (f.rating_clarity || 0), 0) / feedbacks.filter(f => f.rating_clarity).length * 10) / 10
    : 0;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Feedback Overview</h1>
        <p className="text-slate-500">Total: {feedbacks.length} feedbacks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm">Overall</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{avgOverall}</span>
            <span className="text-amber-400">⭐</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm">Internet</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{avgConnection}</span>
            <span className="text-blue-400">📶</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm">Pace</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{avgPace}</span>
            <span className="text-green-400">🏃</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm">Clarity</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{avgClarity}</span>
            <span className="text-purple-400">💡</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterRating(null)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterRating === null ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRating(r)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    filterRating === r ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}⭐
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterSubject('all')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterSubject === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterSubject('math')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterSubject === 'math' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔢 Math
              </button>
              <button
                onClick={() => setFilterSubject('english')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filterSubject === 'english' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📚 English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedbacks List */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center text-slate-500">
            No feedbacks found
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    feedback.subject === 'math' ? 'bg-blue-100' : 'bg-emerald-100'
                  }`}>
                    <span className="text-xl">{feedback.subject === 'math' ? '🔢' : '📚'}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{feedback.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {feedback.subject === 'math' ? 'Math' : 'English'} Level {feedback.level} • {formatDate(feedback.lesson_date)} {formatTime(feedback.lesson_time)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-amber-400">
                    {'★'.repeat(feedback.rating_overall)}{'☆'.repeat(5 - feedback.rating_overall)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Rating Details */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📶 Internet:</span>
                  {renderStars(feedback.rating_connection)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">🏃 Pace:</span>
                  {renderStars(feedback.rating_pace)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">💡 Clarity:</span>
                  {renderStars(feedback.rating_clarity)}
                </div>
              </div>

              {/* Comment */}
              {feedback.comment && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-600">💬 {feedback.comment}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
