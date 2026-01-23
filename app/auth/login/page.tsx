'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../src/utils/supabase';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    // URLから紹介コードを取得
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setIsSignUp(true); // 紹介リンクからの場合はサインアップモードに
      setMessage(`🎁 Referral code "${ref.toUpperCase()}" applied!`);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // サインアップ処理
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              referral_code: referralCode || null, // メタデータに紹介コードを保存
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          // 紹介コードがある場合、紹介記録を作成
          if (referralCode) {
            try {
              const response = await fetch('/api/referral', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  referralCode: referralCode,
                  referredUserId: data.user.id,
                }),
              });

              const result = await response.json();
              if (!response.ok) {
                console.error('Referral error:', result.error);
              }
            } catch (refError) {
              console.error('Failed to record referral:', refError);
            }
          }

          setMessage('✉️ ✉️ Check your email for confirmation link!');
        }
      } else {
        // ログイン処理
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Mercee Academy
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {isSignUp ? 'Create your account' : 'Welcome back!'}
        </p>

        {/* Referral Code Badge */}
        {referralCode && isSignUp && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-6">
            <p className="text-green-700 text-sm text-center">
              🎁 Referral Code Applied: <span className="font-bold">{referralCode}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* Manual Referral Code Input for Sign Up */}
          {isSignUp && !searchParams.get('ref') && (
            <div>
              <label className="block text-gray-700 mb-2">
                Referral Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 uppercase"
                placeholder="Enter code"
                maxLength={10}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-center text-sm ${
            message.includes('error') || message.includes('Error') 
              ? 'text-red-600' 
              : 'text-green-600 text-lg font-bold'
          }`}>
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-gray-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
            }}
            className="ml-2 text-purple-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
