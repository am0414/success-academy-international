'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';
import Link from 'next/link';

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  teacher_id: string | null;
  classes: {
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

export default function ShiftCalendar() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: teachersData } = await supabase
        .from('teachers')
        .select('id, name')
        .order('name');
      setTeachers(teachersData || []);

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select(`
          id,
          date,
          start_time,
          teacher_id,
          classes (
            subject,
            level
          ),
          teachers (
            id,
            name
          )
        `)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('start_time');

      setLessons(lessonsData || []);
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
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(null);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const getLessonsForDate = (date: Date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    let filtered = lessons.filter(l => l.date === dateStr);
    
    if (selectedTeacher !== 'all') {
      filtered = filtered.filter(l => l.teacher_id === selectedTeacher);
    }
    
    return filtered.sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getTeacherColor = (teacherId: string | null) => {
    if (!teacherId) return 'bg-orange-100 border-orange-300 text-orange-800';
    const index = teachers.findIndex(t => t.id === teacherId);
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-pink-100 border-pink-300 text-pink-800',
    ];
    return colors[index % colors.length];
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const selectedDateLessons = selectedDate ? getLessonsForDate(selectedDate) : [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Shift Calendar</h1>
          <p className="text-slate-500">Click a date to view and edit lessons</p>
        </div>
        <Link href="/admin/shifts" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          ← Back to List
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-xl">◀</button>
            <h2 className="text-xl font-semibold text-slate-800 w-48 text-center">
              {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-xl">▶</button>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">Filter:</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200"
            >
              <option value="all">All Teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 flex-wrap">
          <span className="text-sm text-slate-500">Legend:</span>
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${getTeacherColor(teacher.id).split(' ')[0]}`}></div>
              <span className="text-sm">{teacher.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100"></div>
            <span className="text-sm text-orange-700">Unassigned</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center font-semibold text-slate-600">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            const dayLessons = date ? getLessonsForDate(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
            const unassignedCount = dayLessons.filter(l => !l.teacher_id).length;

            return (
              <div
                key={index}
                onClick={() => date && setSelectedDate(date)}
                className={`min-h-[100px] border-b border-r border-slate-100 p-2 cursor-pointer transition-colors ${
                  !date ? 'bg-slate-50 cursor-default' : 'hover:bg-slate-50'
                } ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
              >
                {date && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                        {date.getDate()}
                      </span>
                      {dayLessons.length > 0 && (
                        <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                          {dayLessons.length}
                        </span>
                      )}
                    </div>
                    {unassignedCount > 0 && (
                      <div className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mb-1 inline-block">
                        {unassignedCount} unassigned
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {dayLessons.slice(0, 3).map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${getTeacherColor(lesson.teacher_id)}`}
                        >
                          {lesson.start_time.slice(0, 5)} {lesson.classes?.subject === 'math' ? '🔢' : '📚'}
                        </div>
                      ))}
                      {dayLessons.length > 3 && (
                        <div className="text-xs text-slate-500">+{dayLessons.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 日付詳細モーダル */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
                <p className="text-sm text-slate-500">{selectedDateLessons.length} lessons</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDateLessons.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No lessons on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateLessons.map((lesson) => (
                    <div key={lesson.id} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-indigo-600">{formatTime(lesson.start_time)}</span>
                          <span className="text-slate-800 font-medium">
                            {lesson.classes?.subject === 'math' ? '🔢 Math' : '📚 English'} Level {lesson.classes?.level}
                          </span>
                        </div>
                      </div>
                      <select
                        value={lesson.teacher_id || ''}
                        onChange={(e) => assignTeacher(lesson.id, e.target.value || null)}
                        disabled={saving === lesson.id}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          lesson.teacher_id
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-orange-300 bg-orange-50 text-orange-800'
                        }`}
                      >
                        <option value="">-- Unassigned --</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600">Assigned</p>
          <p className="text-2xl font-bold text-green-700">{lessons.filter(l => l.teacher_id).length}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-600">Unassigned</p>
          <p className="text-2xl font-bold text-orange-700">{lessons.filter(l => !l.teacher_id).length}</p>
        </div>
        {teachers.map((teacher) => (
          <div key={teacher.id} className={`rounded-xl p-4 border ${getTeacherColor(teacher.id)}`}>
            <p className="text-sm">{teacher.name}</p>
            <p className="text-2xl font-bold">{lessons.filter(l => l.teacher_id === teacher.id).length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
