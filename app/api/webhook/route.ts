import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // 請求前に割引を再計算
      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  console.log('client_reference_id:', session.client_reference_id);
  
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  console.log('Updating student with id:', session.client_reference_id);
  console.log('subscriptionId:', subscriptionId);
  console.log('customerId:', customerId);

  const { error, data } = await supabase
    .from('students')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.client_reference_id || '')
    .select();

  if (error) {
    console.error('Error updating student:', error);
  } else {
    console.log('Update result:', data);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const { error } = await supabase
    .from('students')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const { error } = await supabase
    .from('students')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  // Get the student/parent info first
  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // Update student status
  const { error } = await supabase
    .from('students')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }

  // Update referral status and referrer's discount
  if (studentData?.parent_id) {
    // 紹介レコードを取得
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', studentData.parent_id)
      .single();
    
    await updateReferralStatus(studentData.parent_id, 'cancelled');
    
    // 紹介者の割引を更新（active数が減る）
    if (referralData?.referral_code) {
      await updateReferrerDiscount(referralData.referral_code);
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);
  console.log('Invoice data:', JSON.stringify(invoice, null, 2));

  const subscriptionId = (invoice as any).parent?.subscription_details?.subscription 
  || (invoice as any).subscription as string | null;

  if (!subscriptionId) {
    console.error('No subscription ID in invoice');
    return;
  }

  // Get the student/parent info
  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // Update student status
  const { error } = await supabase
    .from('students')
    .update({
      subscription_status: 'active',
      subscription_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating payment status:', error);
  }

  // Update referral status to active and update referrer's discount
  if (studentData?.parent_id) {
    // 紹介レコードを取得して更新
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', studentData.parent_id)
      .single();
    
    await updateReferralStatus(studentData.parent_id, 'active');
    
    // 紹介者の割引を更新
    if (referralData?.referral_code) {
      await updateReferrerDiscount(referralData.referral_code);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);

  const subscriptionId = (invoice as any).subscription 
    ? (typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription.id)
    : null;

  if (!subscriptionId) {
    console.error('No subscription ID in invoice');
    return;
  }

  const { error } = await supabase
    .from('students')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating payment status:', error);
  }
}

// Helper function to update referral status
async function updateReferralStatus(userId: string, newStatus: string) {
  const { error } = await supabase
    .from('referrals')
    .update({
      status: newStatus,
      activated_at: newStatus === 'active' ? new Date().toISOString() : null,
      cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('referred_user_id', userId);

  if (error) {
    console.error('Error updating referral status:', error);
  } else {
    console.log(`Referral status updated to ${newStatus} for user ${userId}`);
  }
}

// 生徒のactive紹介数を取得
async function getActiveReferralCount(studentId: string): Promise<number> {
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
    
    return referrals?.length || 0;
  } catch (error) {
    console.error('Error getting active referral count:', error);
    return 0;
  }
}

// クーポンを取得または作成
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

// 請求前に割引を再計算（invoice.upcoming）
async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  console.log('Invoice upcoming - recalculating discount');
  
  const subscriptionId = (invoice as any).subscription 
    ? (typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription.id)
    : null;

  if (!subscriptionId) {
    console.log('No subscription ID in upcoming invoice');
    return;
  }

  // 生徒情報を取得
  const { data: studentData } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!studentData) {
    console.log('No student found for subscription:', subscriptionId);
    return;
  }

  // 現在のactive紹介数を取得
  const activeCount = await getActiveReferralCount(studentData.id);
  const newDiscountPercent = Math.min(activeCount * 20, 100);
  
  console.log(`Student ${studentData.id}: ${activeCount} active referrals = ${newDiscountPercent}% discount`);

  // Stripeサブスクリプションの割引を更新
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // 現在の割引を確認
    const currentDiscount = (subscription as any).discount;
    const currentPercent = currentDiscount?.coupon?.percent_off || 0;
    
    // 割引が変わった場合のみ更新
    if (currentPercent !== newDiscountPercent) {
      console.log(`Updating discount: ${currentPercent}% -> ${newDiscountPercent}%`);
      
      // 既存の割引を削除
      if (currentDiscount) {
        await stripe.subscriptions.deleteDiscount(subscriptionId);
      }
      
      // 新しい割引を適用（0%以外の場合）
      if (newDiscountPercent > 0) {
        const couponId = await getOrCreateCoupon(newDiscountPercent);
        if (couponId) {
          await stripe.subscriptions.update(subscriptionId, {
            discounts: [{ coupon: couponId }],
          });
        }
      }
      
      // Supabaseのstudentsテーブルも更新
      await supabase
        .from('students')
        .update({
          monthly_price: Math.round(150 * (1 - newDiscountPercent / 100)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentData.id);
        
      console.log(`Discount updated successfully for student ${studentData.id}`);
    } else {
      console.log('Discount unchanged, no update needed');
    }
  } catch (error) {
    console.error('Error updating (subscription as any).discount:', error);
  }
}

// 紹介者の割引を更新するヘルパー関数（紹介相手のステータス変更時に呼ぶ）
async function updateReferrerDiscount(referralCode: string) {
  try {
    // 紹介コードから生徒を取得
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('student_id')
      .eq('code', referralCode)
      .single();
    
    if (!codeData) {
      console.log('No referral code found:', referralCode);
      return;
    }
    
    const studentId = codeData.student_id;
    
    // 生徒のサブスクリプション情報を取得
    const { data: studentData } = await supabase
      .from('students')
      .select('stripe_subscription_id')
      .eq('id', studentId)
      .single();
    
    if (!studentData?.stripe_subscription_id) {
      console.log('No subscription for student:', studentId);
      return;
    }
    
    // active紹介数を取得
    const activeCount = await getActiveReferralCount(studentId);
    const newDiscountPercent = Math.min(activeCount * 20, 100);
    
    console.log(`Referrer ${studentId}: ${activeCount} active = ${newDiscountPercent}%`);
    
    // Stripeの割引を更新
    const subscriptionId = studentData.stripe_subscription_id;
    
    // 100%割引で特別なID（free_referral_100）の場合はスキップ
    if (subscriptionId === 'free_referral_100') {
      console.log('Free subscription, skipping Stripe update');
      return;
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPercent = (subscription as any).discount?.coupon?.percent_off || 0;
    
    if (currentPercent !== newDiscountPercent) {
      // 既存の割引を削除
      if ((subscription as any).discount) {
        await stripe.subscriptions.deleteDiscount(subscriptionId);
      }
      
      // 新しい割引を適用
      if (newDiscountPercent > 0) {
        const couponId = await getOrCreateCoupon(newDiscountPercent);
        if (couponId) {
          await stripe.subscriptions.update(subscriptionId, {
            discounts: [{ coupon: couponId }],
          });
        }
      }
      
      // Supabaseも更新
      await supabase
        .from('students')
        .update({
          monthly_price: Math.round(150 * (1 - newDiscountPercent / 100)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);
        
      console.log(`Referrer discount updated: ${currentPercent}% -> ${newDiscountPercent}%`);
    }
  } catch (error) {
    console.error('Error updating referrer discount:', error);
  }
}
