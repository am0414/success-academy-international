'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  teacher_id: string | null;
  classes: {
    id: string;
    subject: string;
    level: number;
  };
  teachers: {
    id: string;
    name: string;
  } | null;
}

interface Teacher {
  id: string;
  name: string;
}

export default function AdminShifts() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [bulkTeacherId, setBulkTeacherId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextWeek.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('id, name')
        .order('name');
      setTeachers(teachersData || []);

      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          date,
          start_time,
          teacher_id,
          classes (
            id,
            subject,
            level
          ),
          teachers (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');

      if (error) throw error;
      setLessons(lessonsData || []);
      setSelectedLessons([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignTeacher = async (lessonId: string, teacherId: string | null) => {
    setSaving(lessonId);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ teacher_id: teacherId || null })
        .eq('id', lessonId);

      if (error) throw error;

      setLessons(prev => prev.map(l => {
        if (l.id === lessonId) {
          const teacher = teachers.find(t => t.id === teacherId);
          return {
            ...l,
            teacher_id: teacherId,
            teachers: teacher ? { id: teacher.id, name: teacher.name } : null
          };
        }
        return l;
      }));

      setMessage({ type: 'success', text: 'Teacher assigned!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to assign teacher' });
    } finally {
      setSaving(null);
    }
  };

  const bulkAssign = async () => {
    if (selectedLessons.length === 0) {
      setMessage({ type: 'error', text: 'Please select lessons first' });
      return;
    }
    if (!bulkTeacherId) {
      setMessage({ type: 'error', text: 'Please select a teacher' });
      return;
    }

    setBulkAssigning(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ teacher_id: bulkTeacherId })
        .in('id', selectedLessons);

      if (error) throw error;

      const teacher = teachers.find(t => t.id === bulkTeacherId);
      setLessons(prev => prev.map(l => {
        if (selectedLessons.includes(l.id)) {
          return {
            ...l,
            teacher_id: bulkTeacherId,
            teachers: teacher ? { id: teacher.id, name: teacher.name } : null
          };
        }
        return l;
      }));

      setMessage({ type: 'success', text: `Assigned ${selectedLessons.length} lessons to ${teacher?.name}!` });
      setSelectedLessons([]);
      setBulkTeacherId('');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to bulk assign' });
    } finally {
      setBulkAssigning(false);
    }
  };

  const toggleLesson = (lessonId: string) => {
    setSelectedLessons(prev =>
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  // 日付ごとに選択
  const toggleDateLessons = (date: string) => {
    const dateLessonIds = lessons.filter(l => l.date === date).map(l => l.id);
    const allSelected = dateLessonIds.every(id => selectedLessons.includes(id));
    
    if (allSelected) {
      // 全て選択されている場合は解除
      setSelectedLessons(prev => prev.filter(id => !dateLessonIds.includes(id)));
    } else {
      // 選択されていない場合は追加
      setSelectedLessons(prev => [...new Set([...prev, ...dateLessonIds])]);
    }
  };

  // 日付ごとに未割り当てのみ選択
  const selectDateUnassigned = (date: string) => {
    const unassignedIds = lessons.filter(l => l.date === date && !l.teacher_id).map(l => l.id);
    setSelectedLessons(prev => [...new Set([...prev, ...unassignedIds])]);
  };

  const selectAllUnassigned = () => {
    const unassigned = lessons.filter(l => !l.teacher_id).map(l => l.id);
    setSelectedLessons(unassigned);
  };

  const selectAll = () => {
    setSelectedLessons(lessons.map(l => l.id));
  };

  const deselectAll = () => {
    setSelectedLessons([]);
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const groupLessonsByDate = () => {
    const grouped: { [date: string]: Lesson[] } = {};
    lessons.forEach(lesson => {
      if (!grouped[lesson.date]) {
        grouped[lesson.date] = [];
      }
      grouped[lesson.date].push(lesson);
    });
    return grouped;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // その日付のレッスンが全て選択されているかチェック
  const isDateAllSelected = (date: string) => {
    const dateLessonIds = lessons.filter(l => l.date === date).map(l => l.id);
    return dateLessonIds.length > 0 && dateLessonIds.every(id => selectedLessons.includes(id));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const groupedLessons = groupLessonsByDate();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-slate-800">Shift Management</h1><a href="/admin/shifts/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">📅 Calendar</a></div>
        <p className="text-slate-500">Assign teachers to lessons</p>
      </div>

      {message && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="ml-auto text-sm text-slate-500">
            {lessons.length} lessons found
          </div>
        </div>
      </div>

      {/* Bulk Assign Panel */}
      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-200 mb-6">
        <h2 className="text-lg font-semibold text-indigo-800 mb-4">🚀 Bulk Assign</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Select All
            </button>
            <button onClick={selectAllUnassigned} className="px-3 py-2 text-sm bg-white border border-orange-200 rounded-lg hover:bg-orange-50 text-orange-700">
              Select All Unassigned
            </button>
            <button onClick={deselectAll} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Deselect All
            </button>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-indigo-700 mb-1">
              Assign {selectedLessons.length} selected lessons to:
            </label>
            <select
              value={bulkTeacherId}
              onChange={(e) => setBulkTeacherId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">-- Select Teacher --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={bulkAssign}
            disabled={bulkAssigning || selectedLessons.length === 0 || !bulkTeacherId}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {bulkAssigning ? '⏳ Assigning...' : `✅ Assign ${selectedLessons.length} Lessons`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Lessons</p>
          <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600">Assigned</p>
          <p className="text-2xl font-bold text-green-700">
            {lessons.filter(l => l.teacher_id).length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-600">Unassigned</p>
          <p className="text-2xl font-bold text-orange-700">
            {lessons.filter(l => !l.teacher_id).length}
          </p>
        </div>
      </div>

      {/* Lessons by Date */}
      <div className="space-y-6">
        {Object.entries(groupedLessons).map(([date, dateLessons]) => {
          const unassignedCount = dateLessons.filter(l => !l.teacher_id).length;
          const allSelected = isDateAllSelected(date);
          
          return (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleDateLessons(date)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <h2 className="font-semibold text-slate-800">{formatDate(date)}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {unassignedCount > 0 && (
                    <button
                      onClick={() => selectDateUnassigned(date)}
                      className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                    >
                      Select {unassignedCount} Unassigned
                    </button>
                  )}
                  <span className="text-sm text-slate-500">{dateLessons.length} lessons</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {dateLessons.map((lesson) => (
                  <div 
                    key={lesson.id} 
                    className={`px-6 py-4 flex items-center gap-4 ${
                      selectedLessons.includes(lesson.id) ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLessons.includes(lesson.id)}
                      onChange={() => toggleLesson(lesson.id)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="w-20 text-center">
                      <p className="font-bold text-indigo-600">{formatTime(lesson.start_time)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {lesson.classes?.subject === 'math' ? '🔢 Math' : '📚 English'} Level {lesson.classes?.level}
                      </p>
                    </div>
                    <div className="w-48">
                      <select
                        value={lesson.teacher_id || ''}
                        onChange={(e) => assignTeacher(lesson.id, e.target.value || null)}
                        disabled={saving === lesson.id}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          lesson.teacher_id
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-orange-300 bg-orange-50 text-orange-800'
                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50`}
                      >
                        <option value="">-- Unassigned --</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {Object.keys(groupedLessons).length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-slate-500">No lessons found for this date range</p>
          </div>
        )}
      </div>
    </div>
  );
}
