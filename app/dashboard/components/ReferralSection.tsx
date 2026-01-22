'use client';

interface Referral {
  id: string;
  referred_name: string | null;
  status: 'pending' | 'trial' | 'active' | 'cancelled';
  created_at: string;
}

interface StudentBilling {
  id: string;
  name: string;
  monthlyPrice: number;
  discountPercent: number;
}

interface ReferralSectionProps {
  students: StudentBilling[];
  referrals: Referral[];
}

export default function ReferralSection({ 
  students,
  referrals, 
}: ReferralSectionProps) {
  const activeCount = referrals.filter(r => r.status === 'active').length;
  const trialCount = referrals.filter(r => r.status === 'trial').length;
  const progressPercent = Math.min((activeCount / 5) * 100, 100);
  
  // 家族全体の請求を計算
  const familyBilling = students.map(student => {
    const discountAmount = (student.monthlyPrice * student.discountPercent) / 100;
    const finalPrice = student.monthlyPrice - discountAmount;
    return {
      ...student,
      finalPrice,
      discountAmount,
    };
  });

  const totalOriginal = students.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const totalFinal = familyBilling.reduce((sum, s) => sum + s.finalPrice, 0);
  const totalDiscount = totalOriginal - totalFinal;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-400/20 text-emerald-300 rounded-full">Active</span>;
      case 'trial':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-400/20 text-amber-300 rounded-full">Trial</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-400/20 text-gray-400 rounded-full">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-400/20 text-blue-300 rounded-full">Pending</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            🎁 Referral Program
          </h2>
          <p className="text-indigo-200">
            Invite friends and earn discounts on your subscription!
          </p>
        </div>
        
        {/* Family Total Billing */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 min-w-[280px]">
          <p className="text-sm text-indigo-200 mb-1">
            Next Month&apos;s Billing ({students.length} student{students.length > 1 ? 's' : ''})
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            {totalDiscount > 0 ? (
              <>
                <span className="text-3xl font-bold text-white">
                  ${totalFinal.toFixed(0)}
                </span>
                <span className="text-lg text-indigo-300 line-through">
                  ${totalOriginal}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-white">
                ${totalOriginal}
              </span>
            )}
          </div>
          
          {/* Breakdown by student */}
          <div className="space-y-1 text-sm border-t border-white/20 pt-3">
            {familyBilling.map(student => (
              <div key={student.id} className="flex justify-between items-center">
                <span className="text-indigo-200">{student.name.split(' ')[0]}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">${student.finalPrice.toFixed(0)}</span>
                  {student.discountPercent > 0 && (
                    <span className="text-xs text-yellow-400">({student.discountPercent}% off)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {totalDiscount > 0 && (
            <div className="mt-3 inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-indigo-900 text-sm font-bold rounded-full">
              Save ${totalDiscount.toFixed(0)}/month
            </div>
          )}
        </div>
      </div>

      {/* Progress to FREE */}
      <div className="bg-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progress to FREE subscription</span>
          <span className="text-sm font-medium">{activeCount}/5 active referrals</span>
        </div>
        <div className="h-4 bg-white/20 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`flex flex-col items-center transition-all ${i <= activeCount ? 'text-white scale-110' : 'text-white/40'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold transition-all ${
                i <= activeCount 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-indigo-900 shadow-lg' 
                  : 'bg-white/20'
              }`}>
                {i <= activeCount ? '✓' : i}
              </div>
              <span className="font-medium">{i * 20}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <div className="bg-white/10 rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👥</span>
            Your Referrals
            <span className="ml-auto text-sm font-normal text-indigo-200">
              {activeCount} active, {trialCount} in trial
            </span>
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {referrals.map((referral) => (
              <div 
                key={referral.id}
                className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    referral.status === 'active' 
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : referral.status === 'trial'
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'bg-gray-500/30 text-gray-400'
                  }`}>
                    {referral.referred_name 
                      ? referral.referred_name.charAt(0).toUpperCase()
                      : '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {referral.referred_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-indigo-300">
                      Joined {formatDate(referral.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {referral.status === 'active' && (
                    <span className="text-emerald-400 text-sm font-medium">+20%</span>
                  )}
                  {getStatusBadge(referral.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {referrals.length === 0 && (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-lg font-semibold mb-2">Start Inviting Friends!</h3>
          <p className="text-indigo-200 text-sm">
            Share your referral link (shown on each student card) and get 20% off for each friend who subscribes.
            <br />
            5 friends = <span className="text-yellow-400 font-bold">FREE subscription!</span>
          </p>
        </div>
      )}
    </section>
  );
}
