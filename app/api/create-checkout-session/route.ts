import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 割引率に応じたクーポンを取得または作成
async function getOrCreateCoupon(discountPercent: number): Promise<string | null> {
  if (discountPercent <= 0) return null;
  
  const couponId = `referral_${discountPercent}off`;
  
  try {
    // 既存のクーポンを取得
    await stripe.coupons.retrieve(couponId);
    return couponId;
  } catch (error: any) {
    // クーポンが存在しない場合は作成
    if (error.code === 'resource_missing') {
      const coupon = await stripe.coupons.create({
        id: couponId,
        percent_off: discountPercent,
        duration: 'forever',
        name: `Referral ${discountPercent}% OFF`,
      });
      return coupon.id;
    }
    throw error;
  }
}

// 生徒の紹介割引率を取得
async function getStudentDiscount(studentId: string): Promise<number> {
  try {
    // 生徒の紹介コードを取得
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('student_id', studentId)
      .single();
    
    if (!codeData) return 0;
    
    // その紹介コードでのactive紹介数を取得
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referral_code', codeData.code)
      .eq('status', 'active');
    
    const activeCount = referrals?.length || 0;
    return Math.min(activeCount * 20, 100);
  } catch (error) {
    console.error('Error getting student discount:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { priceId, customerEmail, studentId, userId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // 割引率を取得
    let discountPercent = 0;
    if (studentId) {
      discountPercent = await getStudentDiscount(studentId);
    }

    // 100%割引の場合は特別処理
    if (discountPercent === 100) {
      // 100%割引の場合、Stripeセッションは不要
      // 生徒のステータスを直接更新
      if (studentId) {
        await supabase
          .from('students')
          .update({ 
            subscription_status: 'active',
            stripe_subscription_id: 'free_referral_100'
          })
          .eq('id', studentId);
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Free subscription activated!',
        redirect: '/dashboard?success=true&free=true'
      });
    }

    // クーポンを取得または作成
    const couponId = await getOrCreateCoupon(discountPercent);

    // Checkout Session作成オプション
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: customerEmail,
      client_reference_id: studentId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          student_id: studentId || '',
          user_id: userId || '',
          discount_percent: discountPercent.toString(),
        },
      },
      success_url: `${request.headers.get('origin')}/dashboard?success=true`,
      cancel_url: `${request.headers.get('origin')}/checkout?cancelled=true&studentId=${studentId}`,
      metadata: {
        student_id: studentId || '',
        user_id: userId || '',
      },
    };

    // 割引がある場合はクーポンを適用
    if (couponId) {
      sessionOptions.discounts = [{ coupon: couponId }];
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ 
      url: session.url,
      discountPercent,
    });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
