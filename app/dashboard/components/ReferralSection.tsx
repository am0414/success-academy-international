'use client';

interface Referral {
  id: string;
  referred_name: string | null;
  status: 'pending' | 'trial' | 'active' | 'cancelled';
  created_at: string;
  referrer_student_id?: string;
}

interface StudentBilling {
  id: string;
  name: string;
  monthlyPrice: number;
  discountPercent: number;
  referralCount?: number;
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
  
  // 家族全体の請求を計算
  const familyBilling = students.map(student => {
    const discountAmount = (student.monthlyPrice * student.discountPercent) / 100;
    const finalPrice = student.monthlyPrice - discountAmount;
    const referralCount = Math.floor(student.discountPercent / 20);
    return {
      ...student,
      finalPrice,
      discountAmount,
      referralCount,
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
            Each student can invite friends to earn their own discounts!
          </p>
        </div>
        
        {/* Family Total Billing */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 min-w-[280px]">
          <p className="text-sm text-indigo-200 mb-1">
            Monthly Subscription Total
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
                <span className="text-sm text-indigo-200">/month</span>
              </>
