'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/utils/supabase';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  avatar_color: string;
}

export default function SelectProfilePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // ユーザー名取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || 'User');
      }

      // 生徒一覧取得
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, name, avatar_color')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    router.push(`/student/${studentId}/my-page`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const getAvatarColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'from-blue-400 to-blue-600',
      red: 'from-red-400 to-red-600',
      green: 'from-green-400 to-green-600',
      orange: 'from-orange-400 to-orange-600',
      purple: 'from-purple-400 to-purple-600',
      pink: 'from-pink-400 to-pink-600',
      yellow: 'from-yellow-400 to-yellow-600',
      teal: 'from-teal-400 to-teal-600',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ヘッダー */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-semibold text-white text-lg">Success Academy</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-slate-400 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* メインコンテンツ */}
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-12">
          Who&apos;s learning today?
        </h1>

        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => handleSelectStudent(student.id)}
              className="group flex flex-col items-center gap-4 transition-transform hover:scale-105"
            >
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getAvatarColor(student.avatar_color)} flex items-center justify-center shadow-xl group-hover:ring-4 ring-white/50 transition-all`}>
                <span className="text-white font-bold text-4xl">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-slate-300 text-lg font-medium group-hover:text-white transition-colors">
                {student.name}
              </span>
            </button>
          ))}

          {/* Add Child ボタン */}
          <Link
            href="/student/add"
            className="group flex flex-col items-center gap-4 transition-transform hover:scale-105"
          >
            <div className="w-32 h-32 rounded-full bg-slate-700 border-4 border-dashed border-slate-500 flex items-center justify-center group-hover:border-white/50 transition-all">
              <svg className="w-12 h-12 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-slate-500 text-lg font-medium group-hover:text-white transition-colors">
              Add Child
            </span>
          </Link>
        </div>

        {students.length === 0 && (
          <p className="text-slate-400 text-lg">
            Add your first child to get started!
          </p>
        )}
      </main>
    </div>
  );
}
