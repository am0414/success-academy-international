import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PUT: 紹介のステータスを更新（トライアル→アクティブ、キャンセルなど）
export async function PUT(request: NextRequest) {
  try {
    const { userId, newStatus } = await request.json();

    if (!userId || !newStatus) {
      return NextResponse.json(
        { error: 'User ID and new status are required' },
        { status: 400 }
      );
    }

    // このユーザーが紹介されていた場合、紹介記録を更新
    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: newStatus,
        activated_at: newStatus === 'active' ? new Date().toISOString() : null,
        cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null,
      })
      .eq('referred_user_id', userId)
      .select();

    if (error) {
      console.error('Error updating referral status:', error);
      return NextResponse.json(
        { error: 'Failed to update referral status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });

  } catch (error: any) {
    console.error('Referral status update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
