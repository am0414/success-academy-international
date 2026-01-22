import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ランダムな紹介コードを生成（6文字の英数字）
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET: 生徒の紹介コードと紹介状況を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const userId = searchParams.get('userId');

    // 特定の生徒の紹介情報を取得
    if (studentId) {
      // 1. 生徒の紹介コードを取得（なければ作成）
      let { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (codeError && codeError.code === 'PGRST116') {
        // コードが存在しない場合、新規作成
        let newCode = generateReferralCode();
        
        // コードの重複チェック
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('referral_codes')
            .select('id')
            .eq('code', newCode)
            .single();
          
          if (!existing) break;
          newCode = generateReferralCode();
          attempts++;
        }

        const { data: insertedCode, error: insertError } = await supabase
          .from('referral_codes')
          .insert({
            student_id: studentId,
            code: newCode,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating referral code:', insertError);
          return NextResponse.json(
            { error: 'Failed to create referral code' },
            { status: 500 }
          );
        }

        codeData = insertedCode;
      } else if (codeError) {
        throw codeError;
      }

      // 2. この生徒の紹介コードで紹介された人の数を取得（アクティブのみ）
      const { data: referrals, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', codeData?.code)
        .eq('status', 'active');

      if (referralError) {
        console.error('Error fetching referrals:', referralError);
      }

      const activeReferralCount = referrals?.length || 0;
      const discountPercent = Math.min(activeReferralCount * 20, 100);

      return NextResponse.json({
        referralCode: codeData?.code,
        activeReferrals: activeReferralCount,
        discountPercent,
        referrals: referrals || [],
      });
    }

    // ユーザーの全生徒の紹介情報を取得
    if (userId) {
      // 1. ユーザーの全生徒を取得
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .eq('parent_id', userId);

      if (studentsError) throw studentsError;

      // 2. 各生徒の紹介コードと紹介数を取得
      const studentReferrals = await Promise.all(
        (students || []).map(async (student) => {
          // 紹介コードを取得（なければ作成）
          let { data: codeData } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('student_id', student.id)
            .single();

          if (!codeData) {
            let newCode = generateReferralCode();
            let attempts = 0;
            while (attempts < 10) {
              const { data: existing } = await supabase
                .from('referral_codes')
                .select('id')
                .eq('code', newCode)
                .single();
              if (!existing) break;
              newCode = generateReferralCode();
              attempts++;
            }

            const { data: insertedCode } = await supabase
              .from('referral_codes')
              .insert({ student_id: student.id, code: newCode })
              .select()
              .single();
            
            codeData = insertedCode;
          }

          // 紹介数を取得
          const { data: referrals } = await supabase
            .from('referrals')
            .select('*')
            .eq('referral_code', codeData?.code)
            .eq('status', 'active');

          const activeReferrals = referrals?.length || 0;

          return {
            studentId: student.id,
            studentName: student.name,
            referralCode: codeData?.code,
            activeReferrals,
            discountPercent: Math.min(activeReferrals * 20, 100),
          };
        })
      );

      return NextResponse.json({ studentReferrals });
    }

    return NextResponse.json(
      { error: 'studentId or userId is required' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Referral API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: 紹介コードを使用して紹介を記録
export async function POST(request: NextRequest) {
  try {
    const { referralCode, referredUserId } = await request.json();

    if (!referralCode || !referredUserId) {
      return NextResponse.json(
        { error: 'Referral code and referred user ID are required' },
        { status: 400 }
      );
    }

    // 1. 紹介コードから生徒を特定
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('student_id')
      .eq('code', referralCode.toUpperCase())
      .single();

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }

    // 2. 生徒の親（owner）を取得
    const { data: studentData } = await supabase
      .from('students')
      .select('parent_id')
      .eq('id', codeData.student_id)
      .single();

    // 3. 自己紹介を防止（紹介コードの所有者と紹介された人が同じ）
    if (studentData?.parent_id === referredUserId) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      );
    }

    // 4. 既存の紹介記録をチェック（同じコードで同じ人を2回紹介できない）
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('referred_user_id', referredUserId)
      .single();

    if (existingReferral) {
      return NextResponse.json(
        { error: 'This user has already been referred with this code' },
        { status: 400 }
      );
    }

    // 5. 紹介記録を作成
    const { data: newReferral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        student_id: codeData.student_id,
        referred_user_id: referredUserId,
        referral_code: referralCode.toUpperCase(),
        status: 'trial',
        signed_up_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating referral:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      referral: newReferral,
      message: 'Referral recorded successfully',
    });

  } catch (error: any) {
    console.error('Referral POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
