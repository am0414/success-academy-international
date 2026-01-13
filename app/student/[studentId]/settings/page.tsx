'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../src/utils/supabase';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Manila', label: 'Manila (PHT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
];

export default function SettingsPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  
  const [timezone, setTimezone] = useState('America/New_York');
  const [detectedTimezone, setDetectedTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // ブラウザからタイムゾーン自動検出
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(detected);
    
    if (studentId) {
      fetchTimezone();
    }
  }, [studentId]);

  const fetchTimezone = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('timezone')
        .eq('id', studentId)
        .single();

      if (error) throw error;
      if (data?.timezone) {
        setTimezone(data.timezone);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('students')
        .update({ timezone })
        .eq('id', studentId);

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const useDetectedTimezone = () => {
    setTimezone(detectedTimezone);
  };

  const getCurrentTime = (tz: string) => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">⚙️ Settings</h1>

      {/* タイムゾーン設定 */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Timezone</h2>
            <p className="text-sm text-slate-500">Lesson times will be displayed in this timezone</p>
          </div>
        </div>

        {/* 自動検出されたタイムゾーン */}
        {detectedTimezone && detectedTimezone !== timezone && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Detected from your browser:</p>
                <p className="text-blue-800">{detectedTimezone}</p>
              </div>
              <button
                onClick={useDetectedTimezone}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Use This
              </button>
            </div>
          </div>
        )}

        {/* タイムゾーン選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} ({tz.value})
              </option>
            ))}
          </select>
        </div>

        {/* 現在時刻プレビュー */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-500 mb-2">Current time in selected timezone:</p>
          <p className="text-2xl font-bold text-slate-800">{getCurrentTime(timezone)}</p>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </section>

      {/* 追加設定（将来用） */}
      <section className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 opacity-50">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">🔔 Notifications</h2>
        <p className="text-slate-500 text-sm">Coming soon...</p>
      </section>
    </div>
  );
}
