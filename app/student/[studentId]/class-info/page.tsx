'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface ClassInfo {
  id: string;
  subject: string;
  level: number;
  level_name: string;
}

interface Schedule {
  day_of_week: string;
  start_time: string;
  class_id: string;
}

export default function ClassInfoPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const ZOOM_INFO = {
    link: 'https://zoom.us/j/123456789',
    meeting_id: '123 456 789',
    password: '4649',
  };

  const PRINTABLES_URL = 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, subject, level, level_name')
        .order('subject')
        .order('level');

      setClasses(classesData || []);

      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('*')
        .order('day_of_week')
        .order('start_time');

      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">Class Info</h1>

      <section className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
        <h2 className="text-xl font-bold mb-4">Weekly Schedule</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/20 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Math</h3>
            <p>Monday, Wednesday, Friday</p>
            <p className="text-sm text-blue-100">4:00 PM - 6:00 PM EST</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4">
            <h3 className="font-semibold mb-2">English</h3>
            <p>Tuesday, Thursday</p>
            <p className="text-sm text-blue-100">4:00 PM - 6:00 PM EST</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Zoom Information</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">All Classes</h3>
              <p className="text-sm text-slate-500">Use this Zoom for all lessons</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">ID:</span>
                <code className="bg-slate-100 px-3 py-2 rounded-lg font-mono">{ZOOM_INFO.meeting_id}</code>
                <button
                  onClick={() => copyToClipboard(ZOOM_INFO.meeting_id, 'id')}
                  className="text-blue-500 hover:text-blue-700 text-lg"
                >
                  {copied === 'id' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">PW:</span>
                <code className="bg-slate-100 px-3 py-2 rounded-lg font-mono">{ZOOM_INFO.password}</code>
                <button
                  onClick={() => copyToClipboard(ZOOM_INFO.password, 'pw')}
                  className="text-blue-500 hover:text-blue-700 text-lg"
                >
                  {copied === 'pw' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <a
                href={ZOOM_INFO.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Join Zoom
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Detailed Schedule</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Time (EST)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Monday</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Tuesday</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Wednesday</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Thursday</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Friday</th>
              </tr>
            </thead>
            <tbody>
              {['16:00', '16:30', '17:00', '17:30'].map((time) => (
                <tr key={time} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatTime(time)}</td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => {
                    const schedule = schedules.find(s => s.day_of_week === day && s.start_time.startsWith(time));
                    const cls = schedule ? classes.find(c => c.id === schedule.class_id) : null;
                    
                    return (
                      <td key={day} className="px-4 py-3">
                        {cls && (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            cls.subject === 'math' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {cls.subject === 'math' ? 'Math' : 'English'} L{cls.level}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Printables</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-slate-600 mb-4">
            Access worksheets and learning materials organized by subject and level.
          </p>
          <a
            href={PRINTABLES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Open Google Drive
          </a>
        </div>
      </section>
    </div>
  );
}
