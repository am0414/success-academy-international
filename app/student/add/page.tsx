'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/utils/supabase';

const AVATAR_COLORS = [
  '#667eea', // Purple
  '#f56565', // Red
  '#48bb78', // Green
  '#ed8936', // Orange
  '#4299e1', // Blue
  '#ed64a6', // Pink
  '#38b2ac', // Teal
  '#ecc94b', // Yellow
];

export default function AddStudent() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
  }

  function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      alert('Please log in first');
      return;
    }

    const age = calculateAge(dateOfBirth);
    if (age < 4 || age > 15) {
      alert('Student must be between 4 and 15 years old');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          parent_id: user.id,
          name: `${firstName} ${lastName}`,
          age: age,
          date_of_birth: dateOfBirth,
          avatar_color: avatarColor,
          subscription_status: 'trial',
          monthly_price: 150,
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect to checkout with the new student ID
      router.push(`/checkout?studentId=${data.id}`);
    } catch (error: any) {
      console.error('Error adding student:', error);
      alert('Failed to add student: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const currentAge = dateOfBirth ? calculateAge(dateOfBirth) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Add New Student
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              placeholder="John"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              placeholder="Doe"
              required
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              required
            />
            {currentAge !== null && (
              <p className={`mt-2 text-sm ${currentAge >= 4 && currentAge <= 15 ? 'text-green-600' : 'text-red-600'}`}>
                Age: {currentAge} years old
                {currentAge < 4 || currentAge > 15 ? ' (must be 4-15)' : ' ✓'}
              </p>
            )}
          </div>

          {/* Avatar Color */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Avatar Color
            </label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-12 h-12 rounded-full transition-transform ${
                    avatarColor === color ? 'ring-4 ring-purple-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-100 rounded-xl p-6 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : '?'}
            </div>
            <p className="font-semibold text-gray-800">
              {firstName || 'First'} {lastName || 'Last'}
            </p>
            {currentAge !== null && (
              <p className="text-gray-600 text-sm">Age {currentAge}</p>
            )}
          </div>

          {/* Pricing Info */}
          <div className="bg-purple-100 rounded-xl p-4">
            <p className="text-purple-800 font-semibold">
              Monthly Price: $150/month
            </p>
            <p className="text-purple-600 text-sm">
              Includes 14-day free trial
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !firstName || !lastName || !dateOfBirth || (currentAge !== null && (currentAge < 4 || currentAge > 15))}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Student & Continue to Payment'}
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
