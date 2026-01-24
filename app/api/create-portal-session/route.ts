import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();

    // 生徒の stripe_customer_id を取得
    const { data: student, error } = await supabase
      .from('students')
      .select('stripe_customer_id')
      .eq('id', studentId)
      .single();

    if (error || !student?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Stripe Customer Portal セッション作成
    const session = await stripe.billingPortal.sessions.create({
      customer: student.stripe_customer_id,
      return_url: `${request.headers.get('origin')}/student/${studentId}/my-page`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
