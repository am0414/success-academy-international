'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST) UTC-10' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT) UTC-8/-7' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT) UTC-7/-6' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT) UTC-6/-5' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT) UTC-5/-4' },
  { value: 'Europe/London', label: 'London (GMT/BST) UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST) UTC+1/+2' },
  { value: 'Asia/Dubai', label: 'Dubai (GST) UTC+4' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT) UTC+8' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST) UTC+9' },
  { value: 'Asia/Manila', label: 'Manila (PHT) UTC+8' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT) UTC+10/+11' },
];

export default function TeacherSettings() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.teacherId as string;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (teacherId) {
      fetchTeacher();
    }
  }, [teacherId]);

  const fetchTeacher = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('name, email, timezone')
      .eq('id', teacherId)
      .single();

    if (error) {
      console.error('Error:', error);
    } else if (data) {
      setName(data.name || '');
      setEmail(data.email || '');
      setTimezone(data.timezone || 'UTC');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('teachers')
      .update({ name, timezone })
      .eq('id', teacherId);

    if (error) {
      setMessage('Failed to save. Please try again.');
    } else {
      setMessage('Settings saved successfully!');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Your name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
          />
          <p className="text-xs text-slate-400 mt-1">Contact admin to change email</p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Used for displaying lesson times</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
