'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/utils/supabase';

interface Student {
  id: string;
  name: string;
  age: number;
  avatar_color: string;
  subscription_status: string;
  created_at: string;
  parent_id: string;
  parent_email?: string;
  lesson_count?: number;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Get students
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get parent emails and lesson counts
      const studentsWithDetails = await Promise.all(
        (studentsData || []).map(async (student) => {
          // Get parent email
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', student.parent_id)
            .single();

          // Get lesson count
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('status', 'attended');

          return {
            ...student,
            parent_email: userData?.email || 'N/A',
            lesson_count: count || 0,
          };
        })
      );

      setStudents(studentsWithDetails);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentStatus = async (studentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ subscription_status: newStatus })
        .eq('id', studentId);

      if (error) throw error;

      setStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, subscription_status: newStatus } : s)
      );
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full">Active</span>;
      case 'trial':
        return <span className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 rounded-full">Trial</span>;
      case 'cancelled':
        return <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">Cancelled</span>;
      default:
        return <span className="px-3 py-1 text-sm font-medium bg-slate-100 text-slate-600 rounded-full">{status}</span>;
    }
  };

  const getAvatarColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500',
      teal: 'bg-teal-500',
    };
    return colors[color] || colors.blue;
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (student.parent_email && student.parent_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || student.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Student Management</h1>
        <p className="text-slate-500">Total: {students.length} students</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Student</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Parent Email</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Age</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Lessons</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(student.avatar_color)} flex items-center justify-center text-white font-bold`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{student.parent_email}</td>
                <td className="px-6 py-4 text-slate-600">{student.age}</td>
                <td className="px-6 py-4 text-slate-600">{student.lesson_count}</td>
                <td className="px-6 py-4">{getStatusBadge(student.subscription_status)}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No students found
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Edit Student</h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedStudent.avatar_color)} flex items-center justify-center text-white font-bold text-2xl`}>
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{selectedStudent.name}</h3>
                  <p className="text-slate-500">{selectedStudent.parent_email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subscription Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['trial', 'active', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStudentStatus(selectedStudent.id, status)}
                      className={`py-2 rounded-lg font-medium transition-all ${
                        selectedStudent.subscription_status === status
                          ? status === 'active' ? 'bg-emerald-500 text-white'
                            : status === 'trial' ? 'bg-amber-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Created: {new Date(selectedStudent.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-500">
                  Total Lessons: {selectedStudent.lesson_count}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
