'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  age: number;
  subscription_status: 'none' | 'trial' | 'active' | 'cancelled';
  referral_code?: string;
  discount_percent?: number;
}

interface StudentCardProps {
  student: Student;
  onManage?: (studentId: string) => void;
}

export default function StudentCard({ student, onManage }: StudentCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusBadge = () => {
    switch (student.subscription_status) {
      case 'active':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            ✓ Active
          </span>
        );
      case 'trial':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            🎯 Trial
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            Not Enrolled
          </span>
        );
    }
  };

  const getPrice = () => {
    const basePrice = 150;
    const discount = student.discount_percent || 0;
    const finalPrice = basePrice * (1 - discount / 100);
    return { basePrice, discount, finalPrice };
  };

  const { basePrice, discount, finalPrice } = getPrice();

  const handleClick = () => {
    if (student.subscription_status === 'none' || student.subscription_status === 'trial') {
      // Checkoutページへ遷移（student_idをクエリパラメータで渡す）
      router.push(`/checkout?studentId=${student.id}`);
    } else if (onManage) {
      // すでにサブスク中の場合は管理画面へ
      onManage(student.id);
    }
  };

  const isClickable = student.subscription_status === 'none' || student.subscription_status === 'trial';

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300
        ${isClickable 
          ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-blue-400' 
          : 'bg-white border border-slate-200'
        }
      `}
    >
      {/* 割引バッジ */}
      {discount > 0 && (
        <div className="absolute -top-1 -right-1">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl shadow-lg">
            🎁 {discount}% OFF
          </div>
        </div>
      )}

      {/* ヘッダー部分 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">{student.name}</h3>
            <p className="text-sm text-slate-500">{student.age} years old</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* 価格表示（未登録/トライアルの場合） */}
      {isClickable && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <div>
              {discount > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800">${finalPrice}</span>
                  <span className="text-sm text-slate-400 line-through">${basePrice}</span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-800">${basePrice}</span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>
              )}
            </div>
            
            {/* CTAボタン */}
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
              ${isHovered 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-blue-100 text-blue-600'
              }
            `}>
              {student.subscription_status === 'trial' ? 'Subscribe Now' : 'Enroll'}
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          
          {/* 紹介コード表示 */}
          {student.referral_code && (
            <p className="mt-3 text-xs text-slate-400">
              Referral code: <span className="font-mono text-slate-600">{student.referral_code}</span>
            </p>
          )}
        </div>
      )}

      {/* サブスク中の場合 */}
      {student.subscription_status === 'active' && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">${finalPrice}</span>/month
              {discount > 0 && (
                <span className="ml-2 text-emerald-600 text-xs">({discount}% referral discount)</span>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onManage?.(student.id);
              }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Manage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
