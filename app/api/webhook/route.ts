import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  });
};

const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = (invoice as any).parent;
  if (parent?.subscription_details?.subscription) {
    return parent.subscription_details.subscription;
  }
  const sub = (invoice as any).subscription;
  if (typeof sub === 'string') return sub;
  if (sub?.id) return sub.id;
  return null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabase();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, stripe, event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, stripe, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, stripe, event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabase, stripe, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(supabase, stripe, event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  const studentId = session.client_reference_id;
  
  // metadata から入会費を取得（デフォルト $50）
  const enrollmentFee = parseInt(session.metadata?.enrollment_fee || '50') * 100; // cents
  const referrerStudentId = session.metadata?.referrer_student_id;
  const codeType = session.metadata?.code_type;

  console.log('studentId:', studentId, 'customerId:', customerId);
  console.log('enrollmentFee:', enrollmentFee / 100, 'referrerStudentId:', referrerStudentId, 'codeType:', codeType);

  // ★ Stripe から subscription を取得して実際のステータスを確認
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const actualStatus = subscription.status; // 'trialing' or 'active'
  
  // Stripe のステータスを DB 用に変換
  const dbStatus = actualStatus === 'trialing' ? 'trial' : actualStatus;
  console.log('Stripe status:', actualStatus, '→ DB status:', dbStatus);

  const { error } = await supabase
    .from('students')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: dbStatus,  // ★ 実際のステータスを使用
      subscription_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId || '')
    .select();

  if (error) {
    console.error('Error updating student:', error);
    return;
  }

  // 紹介コードの場合、referrals テーブルに追加
  if (codeType === 'referral' && referrerStudentId && studentId) {
    // 紹介コードを取得
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('student_id', referrerStudentId)
      .single();

    if (codeData) {
      // 既存の referral をチェック
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_student_id', studentId)
        .single();

      if (!existingReferral) {
        // 生徒の名前を取得
        const { data: studentData } = await supabase
          .from('students')
          .select('name')
          .eq('id', studentId)
          .single();

        await supabase
          .from('referrals')
          .insert({
            referrer_student_id: referrerStudentId,
            referred_student_id: studentId,
            referred_name: studentData?.name || 'Unknown',
            referral_code: codeData.code,
            status: dbStatus,  // ★ 実際のステータスを使用
            signed_up_at: new Date().toISOString(),
          });
        console.log('Referral created for student:', studentId);
      }
    }
  }

  // 入会費を追加（$0 より大きい場合のみ）
  if (customerId && studentId && enrollmentFee > 0) {
    const { data: updateResult, error: updateError } = await supabase
      .from('students')
      .update({ 
        enrollment_fee_charged: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .eq('enrollment_fee_charged', false)
      .select();

    if (updateError) {
      console.error('Error updating enrollment_fee_charged:', updateError);
      return;
    }

    if (updateResult && updateResult.length > 0) {
      try {
        const existingItems = await stripe.invoiceItems.list({
          customer: customerId,
          pending: true,
        });

        const hasEnrollmentFee = existingItems.data.some(
          item => item.description?.includes('Enrollment Fee')
        );

        if (!hasEnrollmentFee) {
          const discountPercent = 100 - (enrollmentFee / 50); // 元の$50からの割引率
          const description = discountPercent > 0 
            ? `Enrollment Fee (${discountPercent}% OFF)`
            : 'Enrollment Fee (One-time)';
          
          await stripe.invoiceItems.create({
            customer: customerId,
            amount: enrollmentFee,
            currency: 'usd',
            description: description,
          });
          console.log('Enrollment fee added:', enrollmentFee / 100, 'USD');
        } else {
          console.log('Enrollment fee already exists in pending items');
        }
      } catch (err) {
        console.error('Error with enrollment fee:', err);
        await supabase
          .from('students')
          .update({ enrollment_fee_charged: false })
          .eq('id', studentId);
      }
    } else {
      console.log('Enrollment fee already charged (DB flag was true)');
    }
  } else if (enrollmentFee === 0) {
    console.log('Enrollment fee is $0, skipping');
    // enrollment_fee_charged を true にする（無料でも「処理済み」にする）
    await supabase
      .from('students')
      .update({ 
        enrollment_fee_charged: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);
  }
}

async function handleSubscriptionCreated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  await supabase
    .from('students')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionUpdated(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  console.log('cancel_at_period_end:', subscription.cancel_at_period_end);
  console.log('cancel_at:', subscription.cancel_at);

  // DB更新
  await supabase
    .from('students')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // ★ キャンセル予約された場合、pending invoice items を削除
  if (subscription.cancel_at_period_end || subscription.cancel_at) {
    console.log('Subscription is scheduled for cancellation, deleting pending invoice items');
    
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;

    try {
      const pendingItems = await stripe.invoiceItems.list({
        customer: customerId,
        pending: true,
      });

      console.log('Found pending items:', pendingItems.data.length);

      for (const item of pendingItems.data) {
        await stripe.invoiceItems.del(item.id);
        console.log('Deleted pending invoice item:', item.id, item.description);
      }
      console.log('All pending invoice items deleted for customer:', customerId);
    } catch (err) {
      console.error('Error deleting pending invoice items:', err);
    }
  }
}

async function handleSubscriptionDeleted(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  // 生徒情報を取得
  const { data: studentData } = await supabase
    .from('students')
    .select('id, parent_id, stripe_customer_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // DB更新
  await supabase
    .from('students')
    .update({
      subscription_status: 'cancelled',
      enrollment_fee_charged: false,  // 再登録時に入会費を請求するためリセット
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Pending invoice items を削除（念のため）
  if (studentData?.stripe_customer_id) {
    try {
      const pendingItems = await stripe.invoiceItems.list({
        customer: studentData.stripe_customer_id,
        pending: true,
      });

      for (const item of pendingItems.data) {
        await stripe.invoiceItems.del(item.id);
        console.log('Deleted pending invoice item:', item.id, item.description);
      }
    } catch (err) {
      console.error('Error deleting pending invoice items:', err);
    }
  }

  // Referral status 更新
  if (studentData?.id) {
    // 紹介された側としての referral を cancelled に
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_student_id', studentData.id)
      .single();
    
    await updateReferralStatus(supabase, studentData.id, 'cancelled');
    
    if (referralData?.referral_code) {
      await updateReferrerDiscount(supabase, stripe, referralData.referral_code);
    }

    // ★ 追加: 紹介者としての referrals も cancelled に
    await supabase
      .from('referrals')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('referrer_student_id', studentData.id);
    console.log('Referrals as referrer cancelled for student:', studentData.id);
  }
}

async function handlePaymentSucceeded(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const { data: studentData } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  await supabase
    .from('students')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (studentData?.id) {
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_student_id', studentData.id)
      .single();
    
    await updateReferralStatus(supabase, studentData.id, 'active');
    
    if (referralData?.referral_code) {
      await updateReferrerDiscount(supabase, stripe, referralData.referral_code);
    }
  }
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  await supabase
    .from('students')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);
}

async function updateReferralStatus(supabase: any, studentId: string, newStatus: string) {
  await supabase
    .from('referrals')
    .update({
      status: newStatus,
      activated_at: newStatus === 'active' ? new Date().toISOString() : null,
      cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('referred_student_id', studentId);
}

async function getActiveReferralCount(supabase: any, studentId: string): Promise<number> {
  try {
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('student_id', studentId)
      .single();
    
    if (!codeData) return 0;
    
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referral_code', codeData.code)
      .eq('status', 'active');
    
    return referrals?.length || 0;
  } catch (error) {
    return 0;
  }
}

async function getOrCreateCoupon(stripe: Stripe, discountPercent: number): Promise<string | null> {
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

async function handleInvoiceUpcoming(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  console.log('Invoice upcoming - recalculating discount');
  
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const { data: studentData } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!studentData) return;

  const activeCount = await getActiveReferralCount(supabase, studentData.id);
  const newDiscountPercent = Math.min(activeCount * 20, 100);

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPercent = (subscription as any).discount?.coupon?.percent_off || 0;
    
    if (currentPercent !== newDiscountPercent) {
      if ((subscription as any).discount) {
        await stripe.subscriptions.deleteDiscount(subscriptionId);
      }
      
      if (newDiscountPercent > 0) {
        const couponId = await getOrCreateCoupon(stripe, newDiscountPercent);
        if (couponId) {
          await stripe.subscriptions.update(subscriptionId, {
            discounts: [{ coupon: couponId }],
          });
        }
      }
      
      await supabase
        .from('students')
        .update({
          monthly_price: Math.round(200 * (1 - newDiscountPercent / 100)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentData.id);
    }
  } catch (error) {
    console.error('Error updating subscription discount:', error);
  }
}

async function updateReferrerDiscount(supabase: any, stripe: Stripe, referralCode: string) {
  try {
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('student_id')
      .eq('code', referralCode)
      .single();
    
    if (!codeData) return;
    
    const { data: studentData } = await supabase
      .from('students')
      .select('stripe_subscription_id')
      .eq('id', codeData.student_id)
      .single();
    
    if (!studentData?.stripe_subscription_id) return;
    
    const activeCount = await getActiveReferralCount(supabase, codeData.student_id);
    const newDiscountPercent = Math.min(activeCount * 20, 100);
    
    const subscriptionId = studentData.stripe_subscription_id;
    
    if (subscriptionId === 'free_referral_100') return;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPercent = (subscription as any).discount?.coupon?.percent_off || 0;
    
    if (currentPercent !== newDiscountPercent) {
      if ((subscription as any).discount) {
        await stripe.subscriptions.deleteDiscount(subscriptionId);
      }
      
      if (newDiscountPercent > 0) {
        const couponId = await getOrCreateCoupon(stripe, newDiscountPercent);
        if (couponId) {
          await stripe.subscriptions.update(subscriptionId, {
            discounts: [{ coupon: couponId }],
          });
        }
      }
      
      await supabase
        .from('students')
        .update({
          monthly_price: Math.round(200 * (1 - newDiscountPercent / 100)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', codeData.student_id);
    }
  } catch (error) {
    console.error('Error updating referrer discount:', error);
  }
}