'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  classes: {
    name: string;
  };
}

export default function TeacherCalendar() {
  const params = useParams();
  const teacherId = params.teacherId as string;
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      fetchLessons();
    }
  }, [teacherId, currentDate]);

  const fetchLessons = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id,
        date,
        start_time,
        end_time,
        classes (name)
      `)
      .eq('teacher_id', teacherId)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
    } else {
      setLessons(data || []);
    }
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // 前月の日を追加
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, lessons: [] });
    }
    
    // 今月の日を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayLessons = lessons.filter(l => l.date === dateStr);
      days.push({ day, date: dateStr, lessons: dayLessons });
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const days = getDaysInMonth();

  return (
    <div className="p-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">📅 Calendar</h1>
        <p className="text-slate-500 mt-1">View your teaching schedule</p>
      </div>

      {/* カレンダー */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* 月の切り替え */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ← Prev
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {days.map((dayInfo, index) => (
            <div
              key={index}
              className={`min-h-[100px] p-2 border-b border-r border-slate-100 ${
                dayInfo.day === null ? 'bg-slate-50' : ''
              } ${dayInfo.date && isToday(dayInfo.date) ? 'bg-indigo-50' : ''}`}
            >
              {dayInfo.day && (
                <>
                  <p className={`text-sm font-medium mb-1 ${
                    dayInfo.date && isToday(dayInfo.date) ? 'text-indigo-600' : 'text-slate-700'
                  }`}>
                    {dayInfo.day}
                  </p>
                  <div className="space-y-1">
                    {dayInfo.lessons.slice(0, 3).map((lesson) => (
                      <div
                        key={lesson.id}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded truncate"
                        title={`${lesson.start_time.slice(0, 5)} - ${lesson.classes?.name}`}
                      >
                        {lesson.start_time.slice(0, 5)} {lesson.classes?.name}
                      </div>
                    ))}
                    {dayInfo.lessons.length > 3 && (
                      <p className="text-xs text-slate-400">+{dayInfo.lessons.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
