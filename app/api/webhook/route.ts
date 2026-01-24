import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy initialization to avoid build-time errors
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

// Helper function to get subscription ID from invoice (handles different API versions)
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // Try newer API structure first
  const parent = (invoice as any).parent;
  if (parent?.subscription_details?.subscription) {
    return parent.subscription_details.subscription;
  }
  // Fallback to older structure
  const sub = (invoice as any).subscription;
  if (typeof sub === 'string') {
    return sub;
  }
  if (sub?.id) {
    return sub.id;
  }
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

      case 'invoice.created':
        await handleInvoiceCreated(supabase, stripe, event.data.object as Stripe.Invoice);
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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
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
      subscription_status: 'trial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.client_reference_id || '')
    .select();

  if (error) {
    console.error('Error updating student:', error);
  } else {
    console.log('Update result:', data);
  }

  // ★ 入会費を pending invoice item として追加
  // これはトライアル後の最初の invoice に自動で含まれる
  if (customerId && session.client_reference_id) {
    try {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: 5000, // $50
        currency: 'usd',
        description: 'Enrollment Fee (One-time)',
      });
      
      console.log('Enrollment fee invoice item created for customer:', customerId);
      
      // DBも更新
      await supabase
        .from('students')
        .update({ enrollment_fee_charged: true })
        .eq('id', session.client_reference_id);
        
    } catch (err) {
      console.error('Error creating enrollment fee invoice item:', err);
    }
  }
}

async function handleSubscriptionCreated(supabase: any, subscription: Stripe.Subscription) {
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

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
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

async function handleSubscriptionDeleted(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

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

// handleInvoiceCreated は削除 or 空にする（もう使わない）
async function handleInvoiceCreated(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  console.log('Invoice created:', invoice.id);
  // 入会費は checkout 完了時に pending invoice item として追加済み
  // ここでは何もしない
}

async function handlePaymentSucceeded(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);

  if (!subscriptionId) {
    console.error('No subscription ID in invoice');
    return;
  }

  const { data: studentData } = await supabase
    .from('students')
    .select('parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

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

async function updateReferralStatus(supabase: any, userId: string, newStatus: string) {
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
    console.error('Error getting active referral count:', error);
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

  if (!subscriptionId) {
    console.log('No subscription ID in upcoming invoice');
    return;
  }

  const { data: studentData } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!studentData) {
    console.log('No student found for subscription:', subscriptionId);
    return;
  }

  const activeCount = await getActiveReferralCount(supabase, studentData.id);
  const newDiscountPercent = Math.min(activeCount * 20, 100);
  
  console.log(`Student ${studentData.id}: ${activeCount} active referrals = ${newDiscountPercent}% discount`);

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const currentDiscount = (subscription as any).discount;
    const currentPercent = currentDiscount?.coupon?.percent_off || 0;
    
    if (currentPercent !== newDiscountPercent) {
      console.log(`Updating discount: ${currentPercent}% -> ${newDiscountPercent}%`);
      
      if (currentDiscount) {
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
        
      console.log(`Discount updated successfully for student ${studentData.id}`);
    } else {
      console.log('Discount unchanged, no update needed');
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
    
    if (!codeData) {
      console.log('No referral code found:', referralCode);
      return;
    }
    
    const studentId = codeData.student_id;
    
    const { data: studentData } = await supabase
      .from('students')
      .select('stripe_subscription_id')
      .eq('id', studentId)
      .single();
    
    if (!studentData?.stripe_subscription_id) {
      console.log('No subscription for student:', studentId);
      return;
    }
    
    const activeCount = await getActiveReferralCount(supabase, studentId);
    const newDiscountPercent = Math.min(activeCount * 20, 100);
    
    console.log(`Referrer ${studentId}: ${activeCount} active = ${newDiscountPercent}%`);
    
    const subscriptionId = studentData.stripe_subscription_id;
    
    if (subscriptionId === 'free_referral_100') {
      console.log('Free subscription, skipping Stripe update');
      return;
    }
    
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
        .eq('id', studentId);
        
      console.log(`Referrer discount updated: ${currentPercent}% -> ${newDiscountPercent}%`);
    }
  } catch (error) {
    console.error('Error updating referrer discount:', error);
  }
}