'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../src/utils/supabase';

interface Stats {
  totalStudents: number;
  activeStudents: number;
  trialStudents: number;
  cancelledStudents: number;
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  monthlyRevenue: number;
  totalParents: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      const { count: trialStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trial');

      const { count: cancelledStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'cancelled');

      const { count: totalReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      const { count: activeReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: totalParents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: activeStudentsData } = await supabase
        .from('students')
        .select('monthly_price')
        .eq('subscription_status', 'active');

      const monthlyRevenue = activeStudentsData?.reduce((sum, s) => sum + (s.monthly_price || 200), 0) || 0;

      setStats({
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        trialStudents: trialStudents || 0,
        cancelledStudents: cancelledStudents || 0,
        totalReferrals: totalReferrals || 0,
        activeReferrals: activeReferrals || 0,
        pendingReferrals: pendingReferrals || 0,
        monthlyRevenue,
        totalParents: totalParents || 0,
      });

      const { data: recent } = await supabase
        .from('students')
        .select('id, name, subscription_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentStudents(recent || []);

      const { data: recentRefs } = await supabase
        .from('referrals')
        .select('id, referred_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentReferrals(recentRefs || []);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-slate-500">Loading stats...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: '👨‍🎓', color: 'bg-blue-500' },
    { label: 'Active Subscriptions', value: stats?.activeStudents || 0, icon: '✅', color: 'bg-green-500' },
    { label: 'Trial Students', value: stats?.trialStudents || 0, icon: '🎁', color: 'bg-yellow-500' },
    { label: 'Cancelled', value: stats?.cancelledStudents || 0, icon: '❌', color: 'bg-red-500' },
    { label: 'Monthly Revenue', value: `$${stats?.monthlyRevenue?.toLocaleString() || 0}`, icon: '💰', color: 'bg-emerald-500' },
    { label: 'Total Parents', value: stats?.totalParents || 0, icon: '👪', color: 'bg-purple-500' },
    { label: 'Active Referrals', value: stats?.activeReferrals || 0, icon: '🤝', color: 'bg-indigo-500' },
    { label: 'Pending Referrals', value: stats?.pendingReferrals || 0, icon: '⏳', color: 'bg-orange-500' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-orange-100 text-orange-800',
      none: 'bg-slate-100 text-slate-800',
    };
    return styles[status] || styles.none;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of Mercee Academy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Students</h2>
          <div className="space-y-3">
            {recentStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{student.name}</p>
                  <p className="text-xs text-slate-500">{new Date(student.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(student.subscription_status)}`}>
                  {student.subscription_status || 'none'}
                </span>
              </div>
            ))}
            {recentStudents.length === 0 && <p className="text-slate-500 text-sm">No students yet</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Referrals</h2>
          <div className="space-y-3">
            {recentReferrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{referral.referred_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{new Date(referral.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(referral.status)}`}>
                  {referral.status}
                </span>
              </div>
            ))}
            {recentReferrals.length === 0 && <p className="text-slate-500 text-sm">No referrals yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
