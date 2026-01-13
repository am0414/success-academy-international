'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  class_id: string;
  subject: string;
  level: number;
  level_name: string;
  day_of_week: number;
  reservation_count?: number;
}

export default function AdminCalendar() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLessons();
  }, [currentDate, viewMode]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          date,
          start_time,
          class_id,
          classes (
            subject,
            level,
            level_name,
            day_of_week
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');

      if (error) throw error;

      // Get reservation counts
      const lessonsWithCounts = await Promise.all(
        (data || []).map(async (lesson: any) => {
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lesson.id)
            .in('status', ['reserved', 'attended']);

          return {
            id: lesson.id,
            date: lesson.date,
            start_time: lesson.start_time,
            class_id: lesson.class_id,
            subject: lesson.classes?.subject || '',
            level: lesson.classes?.level || 0,
            level_name: lesson.classes?.level_name || '',
            day_of_week: lesson.classes?.day_of_week || 0,
            reservation_count: count || 0,
          };
        })
      );

      setLessons(lessonsWithCounts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getLessonsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return lessons.filter(l => l.date === dateStr);
  };

  const deleteLesson = async () => {
    if (!selectedLesson) return;

    try {
      // Check for reservations
      if (selectedLesson.reservation_count && selectedLesson.reservation_count > 0) {
        setMessage({ type: 'error', text: `Cannot delete: ${selectedLesson.reservation_count} reservations exist` });
        setShowDeleteConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', selectedLesson.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Lesson deleted successfully' });
      setSelectedLesson(null);
      setShowDeleteConfirm(false);
      fetchLessons();
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to delete lesson' });
    }
  };

  const deleteLessonsForDate = async (date: string) => {
    const dateLessons = lessons.filter(l => l.date === date);
    const hasReservations = dateLessons.some(l => l.reservation_count && l.reservation_count > 0);

    if (hasReservations) {
      setMessage({ type: 'error', text: 'Cannot delete: Some lessons have reservations' });
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('date', date);

      if (error) throw error;

      setMessage({ type: 'success', text: `Deleted ${dateLessons.length} lessons for ${date}` });
      fetchLessons();
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to delete lessons' });
    }
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const weekDays = getWeekDays();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Calendar Management</h1>
        <p className="text-slate-500">View and manage all lessons</p>
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-6 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-4 text-sm underline">Dismiss</button>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">←</button>
          <span className="font-medium text-slate-800">
            {viewMode === 'week' 
              ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
          </span>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-lg">→</button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-slate-100 rounded-lg text-sm">Today</button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {lessons.length} lessons
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        /* Week View */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {weekDays.map((day, i) => {
              const dayLessons = getLessonsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className="text-sm text-slate-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</p>
                  <p className="text-xs text-slate-400">{dayLessons.length} lessons</p>
                  {dayLessons.length > 0 && (
                    <button
                      onClick={() => deleteLessonsForDate(day.toISOString().split('T')[0])}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Delete all
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 min-h-[500px]">
            {weekDays.map((day, i) => {
              const dayLessons = getLessonsForDate(day);
              return (
                <div key={i} className="border-r last:border-r-0 p-2 space-y-1">
                  {dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 ${
                        lesson.subject === 'math' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <p className="font-medium">{formatTime(lesson.start_time)}</p>
                      <p>{lesson.subject === 'math' ? 'Math' : 'Eng'} L{lesson.level}</p>
                      {lesson.reservation_count ? (
                        <p className="text-xs opacity-70">👥 {lesson.reservation_count}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Lesson Details</h2>
              <button onClick={() => setSelectedLesson(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Subject</span>
                <span className="font-medium text-slate-800">
                  {selectedLesson.subject === 'math' ? '🔢 Math' : '📚 English'} Level {selectedLesson.level}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">{selectedLesson.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-800">{formatTime(selectedLesson.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reservations</span>
                <span className="font-medium text-slate-800">{selectedLesson.reservation_count || 0}</span>
              </div>
            </div>

            {showDeleteConfirm ? (
              <div className="bg-red-50 p-4 rounded-xl mb-4">
                <p className="text-red-800 text-sm mb-3">Are you sure you want to delete this lesson?</p>
                <div className="flex gap-2">
                  <button
                    onClick={deleteLesson}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedLesson.reservation_count && selectedLesson.reservation_count > 0}
                className="w-full py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedLesson.reservation_count && selectedLesson.reservation_count > 0
                  ? `Cannot delete (${selectedLesson.reservation_count} reservations)`
                  : '🗑️ Delete Lesson'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
