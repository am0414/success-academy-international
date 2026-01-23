'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../src/utils/supabase';
import StudentCard from './components/StudentCard';
import ReferralSection from './components/ReferralSection';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  age: number;
  subscription_status: 'none' | 'trial' | 'active' | 'cancelled';
  referral_code?: string;
  discount_percent?: number;
  monthly_price?: number;
}

interface Referral {
  id: string;
  referred_name: string | null;
  status: 'pending' | 'trial' | 'active' | 'cancelled';
  created_at: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ユーザー名取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || 'User');
      }

      // 生徒一覧取得（紹介コードと割引情報込み）
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          age,
          subscription_status,
          monthly_price,
          referral_codes (code)
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (studentsError) throw studentsError;

      // 各生徒の割引率を計算
      const studentsWithDiscount = await Promise.all(
        (studentsData || []).map(async (student) => {
          // active紹介数を取得
          const { count } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_student_id', student.id)
            .eq('status', 'active');

          const activeCount = count || 0;
          const discountPercent = Math.min(activeCount * 20, 100);

          return {
            id: student.id,
            name: student.name,
            age: student.age,
            subscription_status: student.subscription_status || 'none',
            referral_code: student.referral_codes?.[0]?.code,
            discount_percent: discountPercent,
            monthly_price: student.monthly_price || 200,
          };
        })
      );

      setStudents(studentsWithDiscount);

      // 全生徒の紹介一覧を取得
      if (studentsWithDiscount.length > 0) {
        const studentIds = studentsWithDiscount.map(s => s.id);
        const { data: referralsData } = await supabase
          .from('referrals')
          .select('id, referred_name, status, created_at')
          .in('referrer_student_id', studentIds)
          .order('created_at', { ascending: false });

        if (referralsData) {
          setReferrals(referralsData as Referral[]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageStudent = (studentId: string) => {
    console.log('Manage student:', studentId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ReferralSection用のデータを準備
  const studentBillingData = students.map(s => ({
    id: s.id,
    name: s.name,
    monthlyPrice: 200, // 基本料金
    discountPercent: s.discount_percent || 0,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-slate-800">Mercee Academy</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Welcome, {userName}</span>
            <button className="text-sm text-slate-500 hover:text-slate-700">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-slate-600">
            Manage your children&apos;s education journey
          </p>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Your Students</h2>
            <Link 
              href="/student/add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No students yet</h3>
              <p className="text-slate-500 mb-6">Add your first student to get started</p>
              <Link 
                href="/student/add"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Your First Student
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onManage={handleManageStudent}
                />
              ))}
            </div>
          )}
        </section>

        {students.length > 0 && (
          <ReferralSection
            students={studentBillingData}
            referrals={referrals}
          />
        )}
      </main>
    </div>
  );
}
