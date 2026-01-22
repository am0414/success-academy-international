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
        return <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">✓ Active</span>;
      case 'trial':
        return <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">🎯 Trial</span>;
      case 'cancelled':
        return <span className="px-3'us-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Cancelled</span>;
      default:
        return <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Not Enrolled</span>;
    }
  };

  const handleCardClick = () => {
    if (student.subscription_status === 'active' || student.subscription_status === 'trial') {
      router.push(`/student/${student.id}/my-page`);
    } else {
      router.push(`/checkout?studentId=${student.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-blue-400"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
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

      <div className="mt-4 pt-4 border-t border-slate-100">
        {(student.subscription_status === 'active' || student.subscription_status === 'trial') ? (
          <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${isHovered ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Go to Learning
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${isHovered ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
            Enroll Now
          </div>
        )}
      </div>

      {student.referral_code && (
        <p className="mt-3 text-xs text-slate-400">
          Referral code: <span className="font-mono text-slate-600">{student.referral_code}</span>
        </p>
      )}
    </div>
  );
}
