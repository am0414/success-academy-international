'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function TeacherSchedule() {
  const params = useParams();
  const teacherId = params.teacherId as string;
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (teacherId) {
      fetchSchedules();
    }
  }, [teacherId]);

  const fetchSchedules = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('teacher_schedules')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('teacher_schedules')
      .insert({
        teacher_id: teacherId,
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        status: 'available',
      });

    if (error) {
      console.error('Error submitting schedule:', error);
      alert('Failed to submit schedule');
    } else {
      setSelectedDate('');
      fetchSchedules();
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('teacher_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
    } else {
      fetchSchedules();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'unavailable': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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
        <h1 className="text-2xl font-bold text-slate-800">🕐 Shift Request</h1>
        <p className="text-slate-500 mt-1">Submit your availability for upcoming dates</p>
      </div>

      {/* 新規登録フォーム */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Availability</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Add'}
          </button>
        </form>
      </div>

      {/* 登録済みスケジュール */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Your Availability</h2>
        </div>

        {schedules.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl mb-4 block">📅</span>
            <p className="text-slate-500">No availability submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg">📅</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{formatDate(schedule.date)}</p>
                    <p className="text-sm text-slate-500">
                      {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                    {schedule.status}
                  </span>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
