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
  enrollmentFee: number;
  monthlyPrice: number;
  discountPercent: number;
  discountedMonthlyPrice: number;
  firstPayment: number;
  activeReferrals: number;
}

interface CodeValidation {
  valid: boolean;
  type: 'special' | 'referral' | null;
  discountPercent: number;
  message: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 紹介コード関連
  const [referralCode, setReferralCode] = useState('');
  const [codeValidation, setCodeValidation] = useState<CodeValidation | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

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
        .eq('referrer_student_id', studentId)
        .eq('status', 'active');

      const activeReferrals = count || 0;
      const discountPercent = Math.min(activeReferrals * 20, 100);
      
      const enrollmentFee = 50;
      const monthlyPrice = 200;
      const discountedMonthlyPrice = monthlyPrice * (1 - discountPercent / 100);
      const firstPayment = enrollmentFee + discountedMonthlyPrice;

      setCheckoutInfo({
        student,
        enrollmentFee,
        monthlyPrice,
        discountPercent,
        discountedMonthlyPrice,
        firstPayment,
        activeReferrals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkout info');
    } finally {
      setLoading(false);
    }
  };

  // コード検証
  const validateCode = async (code: string) => {
    if (!code.trim()) {
      setCodeValidation(null);
      return;
    }

    setValidatingCode(true);
    try {
      const upperCode = code.toUpperCase().trim();

      // まず special_codes をチェック
      const { data: specialCode } = await supabase
        .from('special_codes')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .single();

      if (specialCode) {
        // 有効期限チェック
        if (specialCode.expires_at && new Date(specialCode.expires_at) < new Date()) {
          setCodeValidation({
            valid: false,
            type: null,
            discountPercent: 0,
            message: 'This code has expired',
          });
          return;
        }
        setCodeValidation({
          valid: true,
          type: 'special',
          discountPercent: specialCode.discount_percent,
          message: specialCode.discount_percent === 100 
            ? '🎉 Enrollment fee waived!' 
            : `🎉 ${specialCode.discount_percent}% off enrollment fee!`,
        });
        return;
      }

      // 次に referral_codes をチェック
      const { data: referralCodeData } = await supabase
        .from('referral_codes')
        .select('student_id')
        .eq('code', upperCode)
        .single();

      if (referralCodeData) {
        // 自分自身のコードかチェック
        if (referralCodeData.student_id === studentId) {
          setCodeValidation({
            valid: false,
            type: null,
            discountPercent: 0,
            message: "You can't use your own referral code",
          });
          return;
        }
        setCodeValidation({
          valid: true,
          type: 'referral',
          discountPercent: 20,
          message: '🎁 20% off enrollment fee!',
        });
        return;
      }

      // コードが見つからない
      setCodeValidation({
        valid: false,
        type: null,
        discountPercent: 0,
        message: 'Invalid code',
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setCodeValidation({
        valid: false,
        type: null,
        discountPercent: 0,
        message: 'Error validating code',
      });
    } finally {
      setValidatingCode(false);
    }
  };

  // コード入力のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      validateCode(referralCode);
    }, 500);
    return () => clearTimeout(timer);
  }, [referralCode]);

  // 入会費の計算（コード割引適用後）
  const getEnrollmentFeeWithDiscount = () => {
    if (!checkoutInfo) return 50;
    if (codeValidation?.valid) {
      return checkoutInfo.enrollmentFee * (1 - codeValidation.discountPercent / 100);
    }
    return checkoutInfo.enrollmentFee;
  };

  // 初回支払い額（コード割引適用後）
  const getFirstPaymentWithDiscount = () => {
    if (!checkoutInfo) return 0;
    return getEnrollmentFeeWithDiscount() + checkoutInfo.discountedMonthlyPrice;
  };

  const handleCheckout = async () => {
    if (!checkoutInfo) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: checkoutInfo.student.id,
          userId: user?.id,
          customerEmail: user?.email,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
          discountPercent: checkoutInfo.discountPercent,
          referralCode: codeValidation?.valid ? referralCode.toUpperCase().trim() : '',
        }),
      });

      const data = await response.json();
      
      if (data.redirect) {
        router.push(data.redirect);
      } else if (data.url) {
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

  const { student, enrollmentFee, monthlyPrice, discountPercent, discountedMonthlyPrice, activeReferrals } = checkoutInfo;
  const finalEnrollmentFee = getEnrollmentFeeWithDiscount();
  const firstPayment = getFirstPaymentWithDiscount();

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
            <p className="text-blue-200">Subscribe to Mercee Academy</p>
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

            {/* トライアル情報 */}
            <div className="mb-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎉</span>
                <h3 className="text-lg font-semibold text-emerald-800">14-Day Free Trial</h3>
              </div>
              <p className="text-emerald-700 text-sm">
                Try unlimited classes free for 14 days. You won&apos;t be charged until the trial ends.
                Cancel anytime during the trial with no obligation.
              </p>
            </div>

            {/* 紹介コード入力 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                Have a referral code?
              </h3>
              <div className="relative">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., WELCOME2026)"
                  className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-lg uppercase transition-colors ${
                    codeValidation?.valid 
                      ? 'border-emerald-300 bg-emerald-50' 
                      : codeValidation && !codeValidation.valid && referralCode
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 focus:border-blue-400'
                  }`}
                />
                {validatingCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {codeValidation && referralCode && (
                <p className={`mt-2 text-sm ${codeValidation.valid ? 'text-emerald-600' : 'text-red-500'}`}>
                  {codeValidation.message}
                </p>
              )}
            </div>

            {/* プラン詳細 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                Subscription Plan
              </h3>
              
              <div className="bg-slate-50 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">Unlimited Group Classes</p>
                    <p className="text-slate-500 text-sm">English &amp; Math • Ages 4-15</p>
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
                    Small group learning (max 20 students)
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
                {/* 入会費 */}
                <div className="flex justify-between text-slate-600">
                  <span>Enrollment fee (one-time)</span>
                  <div className="text-right">
                    {codeValidation?.valid && codeValidation.discountPercent > 0 && (
                      <span className="text-slate-400 line-through text-sm mr-2">
                        ${enrollmentFee.toFixed(2)}
                      </span>
                    )}
                    <span className={codeValidation?.valid && finalEnrollmentFee === 0 ? 'text-emerald-600 font-semibold' : ''}>
                      {finalEnrollmentFee === 0 ? 'FREE' : `$${finalEnrollmentFee.toFixed(2)}`}
                    </span>
                    {codeValidation?.valid && codeValidation.discountPercent > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        {codeValidation.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* 月額 */}
                <div className="flex justify-between text-slate-600">
                  <span>Monthly subscription</span>
                  <span>${monthlyPrice.toFixed(2)}</span>
                </div>

                {/* 紹介割引（月額用） */}
                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        🎁 Referral Discount
                      </span>
                      {activeReferrals} active referral{activeReferrals !== 1 ? 's' : ''}
                    </span>
                    <span>-{discountPercent}% on monthly</span>
                  </div>
                )}

                {/* 区切り線 */}
                <div className="pt-3 border-t border-slate-200">
                  {/* トライアル後の初回請求 */}
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-slate-600">First payment (after 14-day trial)</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-800">
                        ${firstPayment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 2ヶ月目以降 */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">Then monthly</span>
                    <div className="text-right">
                      {discountPercent > 0 && (
                        <span className="text-slate-400 line-through text-sm mr-2">
                          ${monthlyPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-lg font-bold text-slate-800">
                        ${discountedMonthlyPrice.toFixed(2)}
                      </span>
                      {discountedMonthlyPrice === 0 && (
                        <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded">
                          FREE!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 今日の請求 */}
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800">Due today</span>
                <span className="text-2xl font-bold text-blue-800">$0.00</span>
              </div>
              <p className="text-blue-600 text-sm mt-1">
                Your card will be saved for future payments
              </p>
            </div>

            {/* Stripe画面についての説明 */}
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-medium text-amber-800 mb-1">About the payment screen</p>
                  <p className="text-amber-700 text-sm">
                    The Stripe checkout will show &quot;$200/month&quot; for the subscription. 
                    {finalEnrollmentFee > 0 ? (
                      <>The ${finalEnrollmentFee.toFixed(2)} enrollment fee will be automatically added to your first payment 
                      after the trial ends, making your first charge <strong>${firstPayment.toFixed(2)}</strong>.</>
                    ) : (
                      <>Your enrollment fee has been waived! Your first charge after the trial will be <strong>${firstPayment.toFixed(2)}</strong>.</>
                    )}
                  </p>
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
              ) : (
                'Start 14-Day Free Trial'
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