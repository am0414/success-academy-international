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
    description: string;
  };
  reservations: {
    id: string;
    student_id: string;
    status: string;
    students: {
      name: string;
    };
  }[];
}

export default function TeacherDashboard() {
  const params = useParams();
  const teacherId = params.teacherId as string;
  
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      fetchData();
    }
  }, [teacherId]);

  const fetchData = async () => {
    // 先生情報を取得
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .single();
    
    setTeacher(teacherData);

    // 今日の日付
    const today = new Date().toISOString().split('T')[0];

    // 今日のレッスンを取得
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(`
        id,
        date,
        start_time,
        end_time,
        classes (
          name,
          description
        ),
        reservations (
          id,
          student_id,
          status,
          students (
            name
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('date', today)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
    } else {
      setTodayLessons(lessons || []);
    }

    setLoading(false);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reserved': return 'bg-blue-100 text-blue-700';
      case 'attended': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {teacher?.name}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* 今日のサマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Today's Lessons</p>
              <p className="text-2xl font-bold text-slate-800">{todayLessons.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-slate-800">
                {todayLessons.reduce((acc, lesson) => acc + (lesson.reservations?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Next Lesson</p>
              <p className="text-2xl font-bold text-slate-800">
                {todayLessons.length > 0 ? formatTime(todayLessons[0].start_time) : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 今日のレッスン一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Today's Schedule</h2>
        </div>

        {todayLessons.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl mb-4 block">🎉</span>
            <p className="text-slate-500">No lessons scheduled for today!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {todayLessons.map((lesson) => (
              <div key={lesson.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-600">
                        {formatTime(lesson.start_time)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatTime(lesson.end_time)}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {lesson.classes?.name || 'Unnamed Class'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {lesson.classes?.description || 'No description'}
                      </p>
                      
                      {/* 予約した生徒 */}
                      {lesson.reservations && lesson.reservations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {lesson.reservations.map((res) => (
                            <span
                              key={res.id}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(res.status)}`}
                            >
                              {res.students?.name || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
                      {lesson.reservations?.length || 0} students
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
