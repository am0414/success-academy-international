'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  avatar_color: string;
  email: string;
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const teacherId = params.teacherId as string;
  
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      fetchTeacher();
    }
  }, [teacherId]);

  const fetchTeacher = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, avatar_color, email')
      .eq('id', teacherId)
      .single();
    
    if (error) {
      console.error('Error:', error);
      setLoading(false);
      return;
    }
    
    setTeacher(data);
    setLoading(false);
  };

  const navItems = [
    { href: `/teacher/${teacherId}/dashboard`, icon: '🏠', label: 'Dashboard' },
    { href: `/teacher/${teacherId}/calendar`, icon: '📅', label: 'Calendar' },
    { href: `/teacher/${teacherId}/schedule`, icon: '🕐', label: 'Shift Request' },
    { href: `/teacher/${teacherId}/salary`, icon: '💰', label: 'Payments' },
    { href: `/teacher/${teacherId}/announcements`, icon: '📢', label: 'Announcements' },
    { href: `/teacher/${teacherId}/materials`, icon: '📚', label: 'Materials' },
  ];

  const isActive = (href: string) => pathname === href;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Teacher not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
        {/* ロゴ */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            {sidebarOpen && (
              <div>
                <span className="font-semibold text-slate-800">Mercee Academy</span>
                <p className="text-xs text-indigo-600">Teacher Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* 先生情報 */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: teacher.avatar_color || '#667eea' }}
            >
              <span className="text-white font-bold">
                {teacher.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="font-medium text-slate-800 truncate">{teacher.name}</p>
                <p className="text-xs text-slate-500">Teacher</p>
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all w-full"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && (
              <span className="font-medium">Sign Out</span>
            )}
          </button>
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
