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
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
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

  console.log('studentId:', studentId, 'customerId:', customerId);

  // 1. DB更新
  const { error } = await supabase
    .from('students')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'trial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId || '')
    .select();

  if (error) {
    console.error('Error updating student:', error);
    return;
  }

  // 2. 入会費を追加（二重チェック付き）
  if (customerId && studentId) {
    // DB で enrollment_fee_charged をチェック & 同時に true に更新（楽観的ロック）
    const { data: updateResult, error: updateError } = await supabase
      .from('students')
      .update({ 
        enrollment_fee_charged: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .eq('enrollment_fee_charged', false)  // false の場合のみ更新
      .select();

    if (updateError) {
      console.error('Error updating enrollment_fee_charged:', updateError);
      return;
    }

    // 更新できた = まだ追加されてない
    if (updateResult && updateResult.length > 0) {
      try {
        // Stripe の pending invoice items を確認
        const existingItems = await stripe.invoiceItems.list({
          customer: customerId,
          pending: true,
        });

        const hasEnrollmentFee = existingItems.data.some(
          item => item.description === 'Enrollment Fee (One-time)'
        );

        if (!hasEnrollmentFee) {
          await stripe.invoiceItems.create({
            customer: customerId,
            amount: 5000,
            currency: 'usd',
            description: 'Enrollment Fee (One-time)',
          });
          console.log('Enrollment fee added for customer:', customerId);
        } else {
          console.log('Enrollment fee already exists in pending items');
        }
      } catch (err) {
        console.error('Error with enrollment fee:', err);
        // 失敗したらDBを戻す
        await supabase
          .from('students')
          .update({ enrollment_fee_charged: false })
          .eq('id', studentId);
      }
    } else {
      console.log('Enrollment fee already charged (DB flag was true)');
    }
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

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  await supabase
    .from('students')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  await supabase
    .from('students')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (studentData?.parent_id) {
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', studentData.parent_id)
      .single();
    
    await updateReferralStatus(supabase, studentData.parent_id, 'cancelled');
    
    if (referralData?.referral_code) {
      await updateReferrerDiscount(supabase, stripe, referralData.referral_code);
    }
  }
}

async function handlePaymentSucceeded(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  await supabase
    .from('students')
    .update({
      subscription_status: 'active',
      subscription_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (studentData?.parent_id) {
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', studentData.parent_id)
      .single();
    
    await updateReferralStatus(supabase, studentData.parent_id, 'active');
    
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

async function updateReferralStatus(supabase: any, userId: string, newStatus: string) {
  await supabase
    .from('referrals')
    .update({
      status: newStatus,
      activated_at: newStatus === 'active' ? new Date().toISOString() : null,
      cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('referred_user_id', userId);
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
          monthly_price: Math.round(150 * (1 - newDiscountPercent / 100)),
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
          monthly_price: Math.round(150 * (1 - newDiscountPercent / 100)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', codeData.student_id);
    }
  } catch (error) {
    console.error('Error updating referrer discount:', error);
  }
}