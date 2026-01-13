'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';

interface Class {
  id: string;
  subject: string;
  level: number;
  level_name: string;
  day_of_week: number;
  start_time: string;
}

interface GeneratedLesson {
  class_id: string;
  date: string;
  start_time: string;
  subject: string;
  level: number;
}

export default function AdminLessons() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [preview, setPreview] = useState<GeneratedLesson[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingLessons, setExistingLessons] = useState<{ minDate: string; maxDate: string; count: number } | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchExistingLessons();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('subject')
        .order('level');

      if (error) throw error;
      setClasses(data || []);
      setSelectedClasses((data || []).map(c => c.id));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingLessons = async () => {
    try {
      const { data } = await supabase
        .from('lessons')
        .select('date')
        .order('date', { ascending: true });

      if (data && data.length > 0) {
        setExistingLessons({
          minDate: data[0].date,
          maxDate: data[data.length - 1].date,
          count: data.length,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

const formatTime = (time: string) => {
  if (!time) return 'N/A';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

  const toggleClass = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const selectAll = () => setSelectedClasses(classes.map(c => c.id));
  const deselectAll = () => setSelectedClasses([]);

  const generatePreview = () => {
    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select start and end dates' });
      return;
    }
    if (selectedClasses.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one class' });
      return;
    }

    const lessons: GeneratedLesson[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      classes
        .filter(c => selectedClasses.includes(c.id) && c.day_of_week === dayOfWeek)
        .forEach(c => {
          lessons.push({
            class_id: c.id,
            date: d.toISOString().split('T')[0],
            start_time: c.start_time,
            subject: c.subject,
            level: c.level,
          });
        });
    }

    lessons.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    setPreview(lessons);
    setMessage(null);
  };

  const generateLessons = async () => {
    if (preview.length === 0) {
      setMessage({ type: 'error', text: 'No lessons to generate' });
      return;
    }

    setGenerating(true);
    try {
      const { data: existingData } = await supabase
        .from('lessons')
        .select('class_id, date, start_time')
        .gte('date', startDate)
        .lte('date', endDate);

      const existingSet = new Set(
        (existingData || []).map(l => `${l.class_id}-${l.date}-${l.start_time}`)
      );

      const newLessons = preview
        .filter(l => !existingSet.has(`${l.class_id}-${l.date}-${l.start_time}`))
        .map(l => ({ class_id: l.class_id, date: l.date, start_time: l.start_time }));

      if (newLessons.length === 0) {
        setMessage({ type: 'error', text: 'All lessons already exist' });
        setGenerating(false);
        return;
      }

      const { error } = await supabase.from('lessons').insert(newLessons);
      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `Successfully created ${newLessons.length} lessons!${preview.length - newLessons.length > 0 ? ` (${preview.length - newLessons.length} duplicates skipped)` : ''}` 
      });
      setPreview([]);
      fetchExistingLessons();
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to generate lessons' });
    } finally {
      setGenerating(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-slate-800">Lesson Management</h1>
        <p className="text-slate-500">Generate lessons in bulk</p>
      </div>

      {existingLessons && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-800">
            📅 Existing lessons: <strong>{existingLessons.count}</strong> lessons from{' '}
            <strong>{existingLessons.minDate}</strong> to <strong>{existingLessons.maxDate}</strong>
          </p>
        </div>
      )}

      {message && (
        <div className={`rounded-xl p-4 mb-6 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">📆 Date Range</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">📚 Select Classes</h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
                <span className="text-slate-300">|</span>
                <button onClick={deselectAll} className="text-sm text-blue-600 hover:underline">Deselect All</button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {classes.map((cls) => (
                <label key={cls.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedClasses.includes(cls.id)
                      ? cls.subject === 'math' ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-50 border border-emerald-200'
                      : 'bg-slate-50 border border-slate-200'
                  }`}>
                  <input type="checkbox" checked={selectedClasses.includes(cls.id)} onChange={() => toggleClass(cls.id)} className="w-5 h-5 rounded" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">
                      {cls.subject === 'math' ? '🔢' : '📚'} {cls.subject === 'math' ? 'Math' : 'English'} Level {cls.level}
                    </p>
                    <p className="text-sm text-slate-500">{getDayName(cls.day_of_week)} @ {formatTime(cls.start_time)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button onClick={generatePreview} className="w-full py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-lg">
            🔍 Preview Lessons
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">👁️ Preview ({preview.length} lessons)</h2>
          {preview.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p className="text-4xl mb-2">📅</p>
              <p>Select dates and classes, then click Preview</p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                {preview.map((lesson, index) => (
                  <div key={index} className={`p-3 rounded-lg text-sm ${lesson.subject === 'math' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lesson.subject === 'math' ? '🔢 Math' : '📚 English'} L{lesson.level}</span>
                      <span className="text-slate-500">{lesson.date} @ {formatTime(lesson.start_time)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={generateLessons} disabled={generating}
                className="w-full py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium text-lg">
                {generating ? '⏳ Generating...' : `✅ Create ${preview.length} Lessons`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}