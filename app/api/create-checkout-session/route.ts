import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 定数
const MONTHLY_PRICE = 200; // $200/月
const ENROLLMENT_FEE = 50; // $50 入会費
const TRIAL_DAYS = 14;

// 割引率に応じたクーポンを取得または作成
async function getOrCreateCoupon(discountPercent: number): Promise<string | null> {
  if (discountPercent <= 0) return null;
  
  const couponId = `referral_${discountPercent}off`;
  
  try {
    await stripe.coupons.retrieve(couponId);
    return couponId;
  } catch (error: any) {
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

// 月額のPriceを取得または作成
async function getOrCreateMonthlyPrice(): Promise<string> {
  const productName = 'Success Academy International - Monthly Subscription';
  
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
  });
  
  const existingPrice = prices.data.find(p => 
    p.unit_amount === MONTHLY_PRICE * 100 && 
    p.recurring?.interval === 'month' &&
    p.currency === 'usd'
  );
  
  if (existingPrice) {
    return existingPrice.id;
  }
  
  const product = await stripe.products.create({
    name: productName,
    description: 'Unlimited group classes for English & Math',
  });
  
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: MONTHLY_PRICE * 100,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  
  return price.id;
}

// 生徒の紹介割引率を取得
async function getStudentDiscount(studentId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_student_id', studentId)
      .eq('status', 'active');
    
    const activeCount = count || 0;
    return Math.min(activeCount * 20, 100);
  } catch (error) {
    console.error('Error getting student discount:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, studentId, userId, discountPercent: providedDiscount } = await request.json();

    let discountPercent = providedDiscount ?? 0;
    if (studentId && discountPercent === 0) {
      discountPercent = await getStudentDiscount(studentId);
    }

    if (discountPercent === 100) {
      if (studentId) {
        await supabase
          .from('students')
          .update({ 
            subscription_status: 'active',
            stripe_subscription_id: 'free_referral_100',
            monthly_price: 0,
          })
          .eq('id', studentId);
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Free subscription activated!',
        redirect: '/dashboard?success=true&free=true'
      });
    }

    const monthlyPriceId = await getOrCreateMonthlyPrice();
    const couponId = await getOrCreateCoupon(discountPercent);

    const sessionParams: any = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: customerEmail,
      client_reference_id: studentId,
      line_items: [
        {
          price: monthlyPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          student_id: studentId || '',
          user_id: userId || '',
          discount_percent: discountPercent.toString(),
          enrollment_fee: ENROLLMENT_FEE.toString(),
        },
      },
      success_url: `${request.headers.get('origin')}/dashboard?success=true`,
      cancel_url: `${request.headers.get('origin')}/checkout?cancelled=true&studentId=${studentId}`,
      metadata: {
        student_id: studentId || '',
        user_id: userId || '',
        enrollment_fee: ENROLLMENT_FEE.toString(),
      },
    };

    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (studentId) {
      const discountedPrice = MONTHLY_PRICE * (1 - discountPercent / 100);
      await supabase
        .from('students')
        .update({ 
          monthly_price: discountedPrice,
        })
        .eq('id', studentId);
    }

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
