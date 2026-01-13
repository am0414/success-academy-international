'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  avatar_color: string;
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
      fetchPendingCompletions();
    }
  }, [studentId]);

  // 30秒ごとに更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (studentId) {
        fetchPendingCompletions();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [studentId]);

  const fetchStudent = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, avatar_color')
      .eq('id', studentId)
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    setStudent(data);
  };

  const fetchPendingCompletions = async () => {
    try {
      // 過去7日以内の、まだ完了していない予約を取得
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          lessons (
            date,
            start_time
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'reserved')
        .gte('lessons.date', sevenDaysAgoStr);

      if (reservations) {
        const now = new Date();
        const pending = reservations.filter((r: any) => {
          if (!r.lessons) return false;
          const lessonDateTime = new Date(`${r.lessons.date}T${r.lessons.start_time}`);
          lessonDateTime.setMinutes(lessonDateTime.getMinutes() + 25);
          return lessonDateTime < now; // レッスン終了後
        });
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error('Error fetching pending:', error);
    }
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

  const navItems = [
    { href: `/student/${studentId}/my-page`, icon: '👤', label: 'My Page', badge: 0 },
    { href: `/student/${studentId}/calendar`, icon: '📅', label: 'Calendar', badge: pendingCount },
    { href: `/student/${studentId}/class-info`, icon: '📚', label: 'Class Info', badge: 0 },
    { href: `/student/${studentId}/settings`, icon: '⚙️', label: 'Settings', badge: 0 },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
        {/* ロゴ */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-slate-800">Success Academy</span>
            )}
          </div>
        </div>

        {/* 生徒情報 */}
        {student && (
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(student.avatar_color)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <p className="font-medium text-slate-800 truncate">{student.name}</p>
                  <p className="text-xs text-slate-500">Student</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ナビゲーション */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="font-medium flex-1">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge > 0 && (
                    <span className="absolute ml-6 -mt-6 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Switch Profile */}
        <div className="p-4 border-t border-slate-200">
          <Link
            href="/select-profile"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            <span className="text-xl">🔄</span>
            {sidebarOpen && (
              <span className="font-medium">Switch Profile</span>
            )}
          </Link>
        </div>

        {/* サイドバー開閉ボタン */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
