'use client';

import { useState } from 'react';

interface ReferralStats {
  total: number;
  active: number;
  trial: number;
  cancelled: number;
}

interface ReferralSectionProps {
  referralCode: string;
  stats: ReferralStats | null;
  discountPercent: number;
}

export default function ReferralSection({ referralCode, stats, discountPercent }: ReferralSectionProps) {
  const [copied, setCopied] = useState(false);
  
  const referralLink = `https://successacademy.com/signup?ref=${referralCode}`;
  const activeCount = stats?.active || 0;
  const progressPercent = Math.min((activeCount / 5) * 100, 100);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getNextMilestone = () => {
    if (activeCount >= 5) return null;
    const next = activeCount + 1;
    return {
      count: next,
      discount: next * 20,
      remaining: 1,
    };
  };

  const milestone = getNextMilestone();

  return (
    <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            🎁 Referral Program
          </h2>
          <p className="text-indigo-200">
            Invite friends and earn discounts on your subscription!
          </p>
        </div>
        {discountPercent > 0 && (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <p className="text-sm text-indigo-200">Current Discount</p>
            <p className="text-2xl font-bold">{discountPercent}% OFF</p>
          </div>
        )}
      </div>

      {/* プログレスバー */}
      <div className="bg-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progress to FREE subscription</span>
          <span className="text-sm">{activeCount}/5 referrals</span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* マイルストーン */}
        <div className="flex justify-between text-xs">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`flex flex-col items-center ${i <= activeCount ? 'text-white' : 'text-white/50'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                i <= activeCount 
                  ? 'bg-yellow-400 text-indigo-900' 
                  : 'bg-white/20'
              }`}>
                {i <= activeCount ? '✓' : i}
              </div>
              <span>{i * 20}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 紹介リンク */}
      <div className="bg-white/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-indigo-200 mb-2">Your referral link</p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm font-mono text-white/90"
          />
          <button
            onClick={handleCopy}
            className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 ${
              copied 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-indigo-300 mt-2">
          Code: <span className="font-mono">{referralCode}</span>
        </p>
      </div>

      {/* 統計 */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-xs text-indigo-200">Active</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.trial}</p>
            <p className="text-xs text-indigo-200">In Trial</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-indigo-200">Total</p>
          </div>
        </div>
      )}

      {/* 次のマイルストーン */}
      {milestone && (
        <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-indigo-900 font-bold">
            🎯
          </div>
          <div>
            <p className="font-medium">
              {milestone.remaining} more referral{milestone.remaining > 1 ? 's' : ''} to unlock {milestone.discount}% discount!
            </p>
            <p className="text-sm text-indigo-200">
              Share your link with friends to save more
            </p>
          </div>
        </div>
      )}

      {/* FREE達成時 */}
      {activeCount >= 5 && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 flex items-center gap-4 text-indigo-900">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-2xl">
            🏆
          </div>
          <div>
            <p className="font-bold text-lg">Congratulations! FREE Subscription!</p>
            <p className="text-sm opacity-80">
              You&apos;ve reached the maximum discount. Your subscription is FREE!
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
