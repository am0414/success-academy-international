'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../src/utils/supabase';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  age: number;
  subscription_status: string;
}

interface ClassInfo {
  id: string;
  subject: 'math' | 'english';
  level: number;
  level_name: string;
  day_of_week: string;
  time_est: string;
  zoom_link: string;
  zoom_meeting_id: string;
  zoom_password: string;
}

export default function LearningPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, name, age, subscription_status')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          classes (
            id, subject, level, level_name, day_of_week,
            time_est, zoom_link, zoom_meeting_id, zoom_password
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active');

      const classData = enrollments?.flatMap(e => e.classes).filter(Boolean) as unknown as ClassInfo[] || [];
      setClasses(classData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Student not found</h2>
          <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-semibold text-slate-800">Mercee Academy</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{student.name}&apos;s Learning</h1>
            <p className="text-slate-500">{student.age} years old</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">📚 Enrolled Classes</h2>
          {classes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-500">No classes enrolled yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className={`bg-white rounded-2xl border p-6 ${cls.subject === 'math' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-2xl mb-2 block">{cls.subject === 'math' ? '🔢' : '📚'}</span>
                      <h3 className="text-lg font-semibold text-slate-800">{cls.subject === 'math' ? 'Math' : 'English'}</h3>
                      <p className="text-sm text-slate-600">{cls.level_name}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full text-white ${cls.subject === 'math' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                      Level {cls.level}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>📅 {cls.day_of_week}</p>
                    <p>🕐 {cls.time_est} EST</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Zoom Information</p>
                    <div className="space-y-1 text-xs">
                      <p>Meeting ID: <code className="bg-slate-100 px-2 py-1 rounded">{cls.zoom_meeting_id}</code></p>
                      <p>Password: <code className="bg-slate-100 px-2 py-1 rounded">{cls.zoom_password}</code></p>
                    </div>
                    <a href={cls.zoom_link} target="_blank" rel="noopener noreferrer"
                      className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white ${cls.subject === 'math' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                      Join Class
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
