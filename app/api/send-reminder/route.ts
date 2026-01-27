import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursBeforeClass = parseInt(searchParams.get('hours') || '24');
    
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursBeforeClass * 60 * 60 * 1000);
    
    const targetDate = targetTime.toISOString().split('T')[0];
    const targetHour = targetTime.getUTCHours().toString().padStart(2, '0');
    const targetMinute = targetTime.getUTCMinutes().toString().padStart(2, '0');
    
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        date,
        start_time,
        class_id,
        classes (
          subject,
          level_name,
          zoom_link,
          zoom_meeting_id,
          zoom_password
        )
      `)
      .eq('date', targetDate)
      .gte('start_time', `${targetHour}:${targetMinute}:00`)
      .lte('start_time', `${targetHour}:${String(Number(targetMinute) + 5).padStart(2, '0')}:00`);

    if (lessonsError) throw lessonsError;
    if (!lessons || lessons.length === 0) {
      return NextResponse.json({ message: 'No lessons found for this time' });
    }

    let emailsSent = 0;
    
    for (const lesson of lessons) {
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          student_id,
          students (
            id,
            name,
            parent_id,
            profiles:parent_id (
              email,
              full_name
            )
          )
        `)
        .eq('lesson_id', lesson.id)
        .eq('status', 'reserved');

      if (resError) continue;
      if (!reservations) continue;

      for (const reservation of reservations) {
        const student = reservation.students as any;
        const profile = student?.profiles;
        
        if (!profile?.email) continue;

        const classInfo = lesson.classes as any;
        const parentName = profile.full_name || 'there';
        const studentName = student.name;
        const subject = classInfo?.subject || 'Class';
        const levelName = classInfo?.level_name || '';
        const zoomLink = classInfo?.zoom_link || '';
        const zoomId = classInfo?.zoom_meeting_id || '';
        const zoomPassword = classInfo?.zoom_password || '';

        const emailSubject = hoursBeforeClass === 24 
          ? `Reminder: ${studentName}'s ${subject} class tomorrow!`
          : `Starting Soon: ${studentName}'s ${subject} class in 1 hour!`;

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Class Reminder 📚</h2>
            <p>Hi ${parentName},</p>
            <p>This is a reminder that <strong>${studentName}</strong> has a class coming up!</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>📖 Subject:</strong> ${subject} (${levelName})</p>
              <p><strong>📅 Date:</strong> ${lesson.date}</p>
              <p><strong>⏰ Time:</strong> ${lesson.start_time}</p>
            </div>
            
            <div style="backgro
