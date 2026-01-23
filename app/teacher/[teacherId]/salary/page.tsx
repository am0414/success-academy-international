'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface MonthlyData {
  month: string;
  lessonCount: number;
  totalPay: number;
}

export default function TeacherSalary() {
  const params = useParams();
  const teacherId = params.teacherId as string;
  
  const [teacher, setTeacher] = useState<any>(null);
  const [currentMonthLessons, setCurrentMonthLessons] = useState(0);
  const [currentMonthPay, setCurrentMonthPay] = useState(0);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyData[]>([]);
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

    // 今月の日付範囲
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // 今月のレッスン数を取得
    const { data: lessons, count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('teacher_id', teacherId)
      .gte('date', firstDayOfMonth)
      .lte('date', lastDayOfMonth);

    const lessonCount = count || 0;
    setCurrentMonthLessons(lessonCount);

    // 給与計算
    if (teacherData) {
      if (teacherData.pay_type === 'fixed') {
        setCurrentMonthPay(teacherData.pay_rate || 0);
      } else {
        setCurrentMonthPay(lessonCount * (teacherData.pay_rate || 0));
      }
    }

    // 過去6ヶ月の履歴を計算
    const history: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const { count: monthCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const lessons = monthCount || 0;
      let pay = 0;
      if (teacherData) {
        if (teacherData.pay_type === 'fixed') {
          pay = teacherData.pay_rate || 0;
        } else {
          pay = lessons * (teacherData.pay_rate || 0);
        }
      }

      history.push({
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        lessonCount: lessons,
        totalPay: pay,
      });
    }
    setMonthlyHistory(history);

    setLoading(false);
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
        <h1 className="text-2xl font-bold text-slate-800">💰 Salary</h1>
        <p className="text-slate-500 mt-1">Track your earnings and lesson history</p>
      </div>

      {/* 給与タイプ */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm">Payment Type</p>
            <p className="text-2xl font-bold mt-1">
              {teacher?.pay_type === 'fixed' ? 'Fixed Monthly' : 'Per Lesson'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm">Rate</p>
            <p className="text-2xl font-bold mt-1">
              ${teacher?.pay_rate || 0}
              {teacher?.pay_type === 'fixed' ? '/month' : '/lesson'}
            </p>
          </div>
        </div>
      </div>

      {/* 今月のサマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month's Lessons</p>
              <p className="text-3xl font-bold text-slate-800">{currentMonthLessons}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month's Earnings</p>
              <p className="text-3xl font-bold text-green-600">${currentMonthPay.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 履歴 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lessons</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyHistory.map((month, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {month.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {month.lessonCount} lessons
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ${month.totalPay.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
