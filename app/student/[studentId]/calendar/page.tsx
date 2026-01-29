'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../src/utils/supabase';
import FeedbackForm from '../components/FeedbackForm';

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  class_id: string;
  subject: string;
  level: number;
  level_name: string;
  reserved_count: number;
  max_capacity: number;
  is_reserved: boolean;
  reservation_id?: string;
  reservation_status?: string;
  zoom_link?: string;
  zoom_id?: string;
  zoom_password?: string;
  teacher_name?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [needsActionLessons, setNeedsActionLessons] = useState<Lesson[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  
  // レッスン詳細モーダル
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // フィードバック用
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLesson, setFeedbackLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchTimezone();
      fetchUpcomingLessons();
      fetchNeedsActionLessons();
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId && timezone) {
      fetchLessons();
    }
  }, [studentId, currentDate, viewMode, timezone]);

  const fetchTimezone = async () => {
    const { data } = await supabase
      .from('students')
      .select('timezone')
      .eq('id', studentId)
      .single();
    
    if (data?.timezone) {
      setTimezone(data.timezone);
    }
  };

  const fetchNeedsActionLessons = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          lessons (
            id,
            date,
            start_time,
            classes (
              subject,
              level,
              level_name
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'reserved')
        .gte('lessons.date', sevenDaysAgoStr);

      if (reservations) {
        const now = new Date();
        const needsAction = reservations
          .filter((r: any) => {
            if (!r.lessons) return false;
            const lessonDateTime = new Date(`${r.lessons.date}T${r.lessons.start_time}`);
            lessonDateTime.setMinutes(lessonDateTime.getMinutes() + 25);
            return lessonDateTime < now;
          })
          .map((r: any) => ({
            id: r.lessons.id,
            date: r.lessons.date,
            start_time: r.lessons.start_time,
            subject: r.lessons.classes?.subject,
            level: r.lessons.classes?.level,
            level_name: r.lessons.classes?.level_name,
            reservation_id: r.id,
            reservation_status: r.status,
            is_reserved: true,
            reserved_count: 0,
            max_capacity: 30,
            class_id: '',
          }));
        
        setNeedsActionLessons(needsAction);
      }
    } catch (error) {
      console.error('Error fetching needs action:', error);
    }
  };

  const fetchUpcomingLessons = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          lessons (
            id,
            date,
            start_time,
            zoom_link,
            zoom_id,
            zoom_password,
            teachers (
              name
            ),
            classes (
              subject,
              level,
              level_name
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'reserved')
        .gte('lessons.date', today)
        .order('lessons(date)', { ascending: true });

      if (reservations) {
        const upcoming = reservations
          .filter((r: any) => r.lessons)
          .map((r: any) => ({
            id: r.lessons.id,
            date: r.lessons.date,
            start_time: r.lessons.start_time,
            subject: r.lessons.classes?.subject,
            level: r.lessons.classes?.level,
            level_name: r.lessons.classes?.level_name,
            reservation_id: r.id,
            reservation_status: r.status,
            is_reserved: true,
            reserved_count: 0,
            max_capacity: 30,
            class_id: '',
            zoom_link: r.lessons.zoom_link,
            zoom_id: r.lessons.zoom_id,
            zoom_password: r.lessons.zoom_password,
            teacher_name: r.lessons.teachers?.name,
          }))
          .filter((l: Lesson) => {
            const lessonDateTime = new Date(`${l.date}T${l.start_time}`);
            return lessonDateTime > new Date();
          })
          .slice(0, 5);
        
        setUpcomingLessons(upcoming);
      }
    } catch (error) {
      console.error('Error fetching upcoming lessons:', error);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          date,
          start_time,
          class_id,
          zoom_link,
          zoom_id,
          zoom_password,
          teachers (
            name
          ),
          classes (
            subject,
            level,
            level_name,
            max_capacity
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');

      if (error) throw error;

      const lessonsWithReservations = await Promise.all(
        (lessonsData || []).map(async (lesson: any) => {
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lesson.id)
            .eq('status', 'reserved');

          const { data: myReservation } = await supabase
            .from('reservations')
            .select('id, status')
            .eq('lesson_id', lesson.id)
            .eq('student_id', studentId)
            .in('status', ['reserved', 'attended'])
            .single();

          return {
            id: lesson.id,
            date: lesson.date,
            start_time: lesson.start_time,
            class_id: lesson.class_id,
            subject: lesson.classes?.subject,
            level: lesson.classes?.level,
            level_name: lesson.classes?.level_name,
            max_capacity: lesson.classes?.max_capacity || 30,
            reserved_count: count || 0,
            is_reserved: !!myReservation,
            reservation_id: myReservation?.id,
            reservation_status: myReservation?.status,
            zoom_link: lesson.zoom_link,
            zoom_id: lesson.zoom_id,
            zoom_password: lesson.zoom_password,
            teacher_name: lesson.teachers?.name,
          };
        })
      );

      setLessons(lessonsWithReservations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      // 1日
    } else if (viewMode === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setDate(end.getDate() + (6 - day));
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const handleReserve = async (lessonId: string) => {
    setActionLoading(lessonId);
    try {
      const { data: existingReservation } = await supabase
        .from('reservations')
        .select('id, status')
        .eq('lesson_id', lessonId)
        .eq('student_id', studentId)
        .single();

      if (existingReservation) {
        const { error } = await supabase
          .from('reservations')
          .update({ 
            status: 'reserved',
            cancelled_at: null,
            reserved_at: new Date().toISOString()
          })
          .eq('id', existingReservation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reservations')
          .insert({
            lesson_id: lessonId,
            student_id: studentId,
            status: 'reserved',
          });

        if (error) throw error;
      }

      await fetchLessons();
      await fetchUpcomingLessons();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to reserve. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (reservationId: string) => {
    setActionLoading(reservationId);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', reservationId);

      if (error) throw error;
      await fetchLessons();
      await fetchUpcomingLessons();
      setSelectedLesson(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to cancel. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteLesson = (lesson: Lesson) => {
    setFeedbackLesson(lesson);
    setShowFeedback(true);
    setSelectedLesson(null);
  };

  const handleFeedbackComplete = () => {
    setShowFeedback(false);
    setFeedbackLesson(null);
    fetchLessons();
    fetchUpcomingLessons();
    fetchNeedsActionLessons();
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateHeader = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === 'week') {
      const { startDate, endDate } = getDateRange();
      return `${startDate} ~ ${endDate}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const convertTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timezone 
    });
  };

  const getCountdown = (lessonDate: string, startTime: string) => {
    const lessonDateTime = new Date(`${lessonDate}T${startTime}`);
    const diff = lessonDateTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Starting now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  const getDaysAgo = (lessonDate: string) => {
    const lesson = new Date(lessonDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - lesson.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  };

  const isLessonEnded = (lessonDate: string, startTime: string) => {
    const lessonDateTime = new Date(`${lessonDate}T${startTime}`);
    lessonDateTime.setMinutes(lessonDateTime.getMinutes() + 25);
    return new Date() > lessonDateTime;
  };

  const isWithinFeedbackPeriod = (lessonDate: string) => {
    const lessonDay = new Date(lessonDate);
    const diffDays = (now.getTime() - lessonDay.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const canReserveOrCancel = (lessonDate: string, startTime: string) => {
    const lessonDateTime = new Date(`${lessonDate}T${startTime}`);
    const diffMinutes = (lessonDateTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes > 5;
  };

  const getWeekDays = () => {
    const { startDate } = getDateRange();
    const start = new Date(startDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getLessonsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return lessons.filter(l => l.date === dateStr);
  };

  const renderLessonDetailModal = () => {
    if (!selectedLesson) return null;

    const canAction = canReserveOrCancel(selectedLesson.date, selectedLesson.start_time);
    const ended = isLessonEnded(selectedLesson.date, selectedLesson.start_time);
    const withinFeedback = isWithinFeedbackPeriod(selectedLesson.date);
    const isLoading = actionLoading === selectedLesson.id || actionLoading === selectedLesson.reservation_id;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLesson(null)}>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* ヘッダー */}
          <div className={`p-6 ${selectedLesson.subject === 'math' ? 'bg-blue-500' : 'bg-emerald-500'} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedLesson.subject === 'math' ? '🔢' : '📚'}</span>
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedLesson.subject === 'math' ? 'Math' : 'English'} Level {selectedLesson.level}
                  </h2>
                  <p className="text-white/80">{selectedLesson.level_name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLesson(null)} className="text-2xl text-white/80 hover:text-white">×</button>
            </div>
          </div>

          {/* 詳細 */}
          <div className="p-6 space-y-4">
            {/* 日時 */}
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="font-medium text-slate-800">{selectedLesson.date}</p>
                <p className="text-slate-500">{convertTime(selectedLesson.start_time)}</p>
              </div>
            </div>

            {/* 先生 */}
            {selectedLesson.teacher_name && (
              <div className="flex items-center gap-3">
                <span className="text-xl">👩‍🏫</span>
                <div>
                  <p className="text-sm text-slate-500">Teacher</p>
                  <p className="font-medium text-slate-800">{selectedLesson.teacher_name}</p>
                </div>
              </div>
            )}

            {/* Zoom情報（予約している場合のみ表示） */}
            {selectedLesson.is_reserved && (selectedLesson.zoom_link || selectedLesson.zoom_id) && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎥</span>
                  <h3 className="font-bold text-blue-800">Zoom Information</h3>
                </div>
                
                {selectedLesson.zoom_link && (
                  
                    href={selectedLesson.zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-blue-500 text-white text-center rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    🚀 Join Zoom Meeting
                  </a>
                )}
                
                {selectedLesson.zoom_id && (
                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <p className="text-xs text-slate-500">Meeting ID</p>
                      <p className="font-mono font-medium text-slate-800">{selectedLesson.zoom_id}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedLesson.zoom_id!)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                )}
                
                {selectedLesson.zoom_password && (
                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <p className="text-xs text-slate-500">Password</p>
                      <p className="font-mono font-medium text-slate-800">{selectedLesson.zoom_password}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedLesson.zoom_password!)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 予約していない場合のメッセージ */}
            {!selectedLesson.is_reserved && (
              <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-500">
                <p>Reserve this lesson to see Zoom information</p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="pt-4 border-t border-slate-200">
              {selectedLesson.is_reserved && ended && withinFeedback && selectedLesson.reservation_status === 'reserved' ? (
                <button
                  onClick={() => handleCompleteLesson(selectedLesson)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90"
                >
                  ✓ Complete Lesson
                </button>
              ) : selectedLesson.reservation_status === 'attended' ? (
                <div className="w-full py-3 bg-emerald-100 text-emerald-700 text-center rounded-xl font-medium">
                  ✓ Completed
                </div>
              ) : selectedLesson.is_reserved && !ended ? (
                <button
                  onClick={() => canAction && handleCancel(selectedLesson.reservation_id!)}
                  disabled={!canAction || isLoading}
                  className={`w-full py-3 rounded-xl font-medium ${
                    canAction ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isLoading ? '...' : 'Cancel Reservation'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    canAction && handleReserve(selectedLesson.id);
                    setSelectedLesson(null);
                  }}
                  disabled={!canAction || isLoading}
                  className={`w-full py-3 rounded-xl font-medium ${
                    canAction
                      ? selectedLesson.subject === 'math'
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isLoading ? '...' : 'Reserve'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNeedsAction = () => {
    if (needsActionLessons.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚠️</span>
          <h2 className="font-bold text-slate-800">Needs Action ({needsActionLessons.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsActionLessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => handleCompleteLesson(lesson)}
              className="bg-white/80 hover:bg-white rounded-xl px-4 py-2 flex items-center gap-3 transition-colors"
            >
              <span>{lesson.subject === 'math' ? '🔢' : '📚'}</span>
              <div className="text-left">
                <p className="font-medium text-sm text-slate-800">
                  {lesson.subject === 'math' ? 'Math' : 'English'} L{lesson.level}
                </p>
                <p className="text-xs text-slate-600">{getDaysAgo(lesson.date)}</p>
              </div>
              <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">Complete</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderUpcomingLessons = () => {
    if (upcomingLessons.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <h2 className="text-lg font-bold mb-4">📅 My Upcoming Lessons</h2>
        <div className="space-y-3">
          {upcomingLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className="bg-white/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  lesson.subject === 'math' ? 'bg-blue-400' : 'bg-emerald-400'
                }`}>
                  {lesson.subject === 'math' ? '🔢' : '📚'}
                </div>
                <div>
                  <p className="font-semibold">
                    {lesson.subject === 'math' ? 'Math' : 'English'} Level {lesson.level}
                  </p>
                  <p className="text-sm text-blue-100">
                    {lesson.date} • {convertTime(lesson.start_time)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{getCountdown(lesson.date, lesson.start_time)}</p>
                <p className="text-sm text-blue-200">Tap for Zoom →</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayLessons = getLessonsForDate(currentDate);
    return (
      <div className="space-y-4">
        {dayLessons.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No classes on this day</p>
        ) : (
          dayLessons.map(lesson => (
            <div
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                lesson.subject === 'math' ? 'border-blue-200 bg-blue-50 hover:border-blue-400' : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    lesson.subject === 'math' ? 'bg-blue-500' : 'bg-emerald-500'
                  } text-white text-xl`}>
                    {lesson.subject === 'math' ? '🔢' : '📚'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {lesson.subject === 'math' ? 'Math' : 'English'} Level {lesson.level}
                    </h3>
                    <p className="text-sm text-slate-500">{lesson.level_name}</p>
                    <p className="text-sm text-slate-600 font-medium">
                      {convertTime(lesson.start_time)} • {lesson.max_capacity - lesson.reserved_count} spots left
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {lesson.is_reserved ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Reserved ✓</span>
                  ) : (
                    <span className="text-slate-400 text-sm">Tap to view →</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays();
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayLessons = getLessonsForDate(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div 
              key={idx} 
              className={`min-h-[200px] ${isWeekend ? 'bg-slate-50' : 'bg-white'} rounded-xl border border-slate-200 p-2 cursor-pointer hover:border-blue-400 transition-colors`}
              onClick={() => handleDateClick(day)}
            >
              <div className={`text-center mb-2 pb-2 border-b border-slate-100 ${isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                <p className="text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                <p className={`text-lg ${isToday ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                  {day.getDate()}
                </p>
              </div>
              <div className="space-y-1">
                {dayLessons.map(lesson => {
                  const ended = isLessonEnded(lesson.date, lesson.start_time);
                  const needsCompletion = lesson.is_reserved && ended && lesson.reservation_status === 'reserved';
                  
                  return (
                    <div
                      key={lesson.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedLesson(lesson); }}
                      className={`text-xs p-2 rounded-lg transition-all cursor-pointer hover:opacity-80 ${
                        lesson.reservation_status === 'attended'
                          ? 'bg-emerald-500 text-white'
                          : needsCompletion
                            ? 'bg-amber-400 text-white animate-pulse'
                            : lesson.subject === 'math' 
                              ? lesson.is_reserved ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                              : lesson.is_reserved ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <p className="font-medium">{convertTime(lesson.start_time)}</p>
                      <p>{lesson.subject === 'math' ? 'Math' : 'Eng'} L{lesson.level}</p>
                      {lesson.is_reserved && !ended && (
                        <p className="text-[10px] opacity-80">Reserved ✓</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {dayLessons.length > 0 && (
                <p className="text-[10px] text-slate-400 text-center mt-2">Click to view</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="h-24 bg-slate-50 rounded-lg"></div>;
            }
            const isToday = day.toDateString() === new Date().toDateString();
            const dayLessons = getLessonsForDate(day);
            const hasReserved = dayLessons.some(l => l.is_reserved);
            const hasNeedsCompletion = dayLessons.some(l => 
              l.is_reserved && isLessonEnded(l.date, l.start_time) && l.reservation_status === 'reserved'
            );
            
            return (
              <div
                key={idx}
                onClick={() => handleDateClick(day)}
                className={`h-24 p-1 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors ${
                  hasNeedsCompletion
                    ? 'border-amber-400 bg-amber-50'
                    : hasReserved
                      ? 'border-blue-400 bg-blue-50'
                      : isToday 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 bg-white'
                }`}
              >
                <p className={`text-sm ${isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                  {day.getDate()}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dayLessons.slice(0, 3).map(lesson => (
                    <div
                      key={lesson.id}
                      className={`w-2 h-2 rounded-full ${
                        lesson.reservation_status === 'attended'
                          ? 'bg-emerald-500'
                          : lesson.is_reserved
                            ? lesson.subject === 'math' ? 'bg-blue-500' : 'bg-emerald-500'
                            : lesson.subject === 'math' ? 'bg-blue-200' : 'bg-emerald-200'
                      }`}
                    />
                  ))}
                  {dayLessons.length > 3 && (
                    <span className="text-xs text-slate-400">+{dayLessons.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* フィードバックモーダル */}
      {showFeedback && feedbackLesson && (
        <FeedbackForm
          reservationId={feedbackLesson.reservation_id!}
          studentId={studentId}
          lessonInfo={{
            subject: feedbackLesson.subject,
            level: feedbackLesson.level,
            date: feedbackLesson.date,
            time: convertTime(feedbackLesson.start_time),
          }}
          onComplete={handleFeedbackComplete}
          onSkip={handleFeedbackComplete}
        />
      )}

      {/* レッスン詳細モーダル */}
      {renderLessonDetailModal()}

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="text-sm text-slate-500">{timezone}</p>
      </div>

      {/* Needs Action バー */}
      {renderNeedsAction()}

      {/* 予約済みレッスン */}
      {renderUpcomingLessons()}

      {/* コントロール */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  viewMode === mode
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ◀
            </button>
            <span className="font-medium text-slate-800 min-w-[200px] text-center">
              {formatDateHeader()}
            </span>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ▶
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* カレンダー本体 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </>
        )}
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span>Math (Reserved)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-200"></div>
          <span>Math (Available)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span>English / Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-400"></div>
          <span>Needs Completion</span>
        </div>
      </div>
    </div>
  );
}
