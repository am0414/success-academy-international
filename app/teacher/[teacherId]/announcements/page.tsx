'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: string;
  is_pinned: boolean;
  created_at: string;
}

export default function TeacherAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .in('target', ['all', 'teachers'])
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
        <h1 className="text-2xl font-bold text-slate-800">📢 Announcements</h1>
        <p className="text-slate-500 mt-1">Important updates from the administration</p>
      </div>

      {/* お知らせ一覧 */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <span className="text-4xl mb-4 block">📭</span>
          <p className="text-slate-500">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border ${
                announcement.is_pinned ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_pinned && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        📌 Pinned
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
