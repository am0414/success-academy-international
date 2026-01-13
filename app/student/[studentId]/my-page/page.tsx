'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../src/utils/supabase';
import ReportModal from '../components/ReportModal';

interface Student {
  id: string;
  name: string;
  age: number;
  avatar_color: string;
  subscription_status: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  start_time: string;
  subject: string;
  level: number;
  level_name: string;
  status: string;
}

export default function MyPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [attendanceCount, setAttendanceCount] = useState({ math: 0, english: 0 });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    try {
      // 生徒情報
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) {
        console.error('Student error:', studentError);
        throw studentError;
      }
      setStudent(studentData);

      // 紹介コード
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('student_id', studentId)
        .single();

      if (codeData) {
        setReferralCode(codeData.code);
      }

      // 出席履歴
      const { data: rawData, error: rawError } = await supabase
        .rpc('get_student_attendance', { p_student_id: studentId });

      if (rawError) {
        console.error('RPC error:', rawError);
      } else if (rawData) {
        setAttendanceHistory(rawData);
        const attended = rawData.filter((r: any) => r.status === 'attended');
        const mathCount = attended.filter((r: any) => r.subject === 'math').length;
        const englishCount = attended.filter((r: any) => r.subject === 'english').length;
        setAttendanceCount({ math: mathCount, english: englishCount });
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full">Active</span>;
      case 'trial':
        return <span className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 rounded-full">Trial</span>;
      case 'cancelled':
        return <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded-full">Cancelled</span>;
      default:
        return <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">Not Enrolled</span>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Student not found</p>
      </div>
    );
  }

  const totalLessons = attendanceCount.math + attendanceCount.english;
  const totalMinutes = totalLessons * 25;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          studentName={student.name}
          attendanceHistory={attendanceHistory}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(student.avatar_color)} flex items-center justify-center border-4 border-white/30`}>
            <span className="text-white font-bold text-3xl">
              {student.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-blue-100">🎓 Student</p>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'attendance', label: 'Attendance History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* プロフィール */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              📋 Profile
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Age</span>
                <span className="font-medium text-slate-800">{student.age} years old</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                {getStatusBadge(student.subscription_status)}
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500">Total Classes</span>
                <div className="flex gap-3">
                  <span className="text-blue-600 font-medium">🔢 {attendanceCount.math}</span>
                  <span className="text-emerald-600 font-medium">📚 {attendanceCount.english}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 紹介コード */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🎁 Referral Code
            </h2>
            {referralCode ? (
              <div>
                <p className="text-sm text-slate-500 mb-3">Share this code with friends!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 px-4 py-3 rounded-lg font-mono text-lg text-slate-800">
                    {referralCode}
                  </code>
                  <button
                    onClick={copyReferralCode}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">No referral code available</p>
            )}
          </div>

          {/* 支払い管理 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              💳 Subscription
            </h2>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white mb-4">
              <p className="text-sm text-emerald-100">Current Plan</p>
              <p className="text-xl font-bold">Unlimited Classes - $150/month</p>
            </div>
            <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
              Manage Subscription
            </button>
          </div>

          {/* クイック統計 & レポート */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              📊 Learning Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{attendanceCount.math}</p>
                <p className="text-sm text-blue-600">Math Classes</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{attendanceCount.english}</p>
                <p className="text-sm text-emerald-600">English Classes</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center mb-4">
              <p className="text-2xl font-bold text-slate-700">
                {totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}
              </p>
              <p className="text-sm text-slate-500">Total Learning Time</p>
            </div>
            <button 
              onClick={() => setShowReportModal(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              📄 Download Quarter Report
            </button>
          </div>
        </div>
      )}

      {/* Attendance History Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Attendance History</h2>
            <p className="text-sm text-slate-500">
              Total: {attendanceHistory.length} lessons ({attendanceHistory.filter(r => r.status === 'attended').length} completed)
            </p>
          </div>
          
          {attendanceHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No attendance records yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendanceHistory.map((record) => (
                <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        record.subject === 'math' ? 'bg-blue-100' : 'bg-emerald-100'
                      }`}>
                        <span className="text-xl">{record.subject === 'math' ? '🔢' : '📚'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {record.subject === 'math' ? 'Math' : 'English'} Level {record.level}
                        </p>
                        <p className="text-sm text-slate-500">{record.level_name}</p>
                        <p className="text-sm text-slate-400">
                          {formatDate(record.date)} • {formatTime(record.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.status === 'attended' ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          Reserved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
