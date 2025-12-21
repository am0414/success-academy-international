'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../src/utils/supabase';

interface Student {
  id: string;
  name: string;
  age: number;
}

interface CheckoutInfo {
  student: Student;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  activeReferrals: number;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setError('No student selected');
      setLoading(false);
      return;
    }
    fetchCheckoutInfo();
  }, [studentId]);

  const fetchCheckoutInfo = async () => {
    try {
      // 生徒情報取得
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, age')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error('Student not found');
      }

      // active紹介数を取得
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'active');

      const activeReferrals = count || 0;
      const discountPercent = Math.min(activeReferrals * 20, 100);
      const basePrice = 150;
      const finalPrice = basePrice * (1 - discountPercent / 100);

      setCheckoutInfo({
        student,
        basePrice,
        discountPercent,
        finalPrice,
        activeReferrals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkout info');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutInfo) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: checkoutInfo.student.id,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
          discount_percent: checkoutInfo.discountPercent,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !checkoutInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { student, basePrice, discountPercent, finalPrice, activeReferrals } = checkoutInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 戻るボタン */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* メインカード */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white mb-1">Complete Enrollment</h1>
            <p className="text-blue-200">Subscribe to Success Academy International</p>
          </div>

          <div className="p-8">
            {/* 生徒情報 */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{student.name}</h2>
                <p className="text-slate-500">{student.age} years old</p>
              </div>
            </div>

            {/* プラン詳細 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                Subscription Plan
              </h3>
              
              <div className="bg-slate-50 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">Unlimited Classes</p>
                    <p className="text-slate-500 text-sm">English &amp; Math • Ages 3-5</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Monthly
                  </span>
                </div>

                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited live classes
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Small group learning (max 6 students)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Progress tracking &amp; reports
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cancel anytime
                  </li>
                </ul>
              </div>
            </div>

            {/* 価格計算 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                Price Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Monthly subscription</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        🎁 Referral Discount
                      </span>
                      {activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''}
                    </span>
                    <span>-{discountPercent}%</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-800">Total per month</span>
                  <div className="text-right">
                    {discountPercent > 0 && (
                      <span className="text-slate-400 line-through text-sm mr-2">
                        ${basePrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-2xl font-bold text-slate-800">
                      ${finalPrice.toFixed(2)}
                    </span>
                    {finalPrice === 0 && (
                      <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded">
                        FREE!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CTAボタン */}
            <button
              onClick={handleCheckout}
              disabled={processing}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                processing
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-200 hover:scale-[1.02]'
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : finalPrice === 0 ? (
                'Subscribe for FREE 🎉'
              ) : (
                `Subscribe for $${finalPrice.toFixed(2)}/month`
              )}
            </button>

            {/* セキュリティバッジ */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure checkout
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                Powered by Stripe
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
