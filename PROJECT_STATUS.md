# Success Academy International - Development Status

**Last Updated:** November 20, 2024  
**Current Phase:** Phase 1 - MVP (Login & Authentication) ✅ COMPLETE

---

## 📋 Project Overview

**Service:** Success Academy International  
**Target Market:** American children (ages 3-5) learning English + Math  
**Launch Date:** April 2026  
**Pricing:** $80/month per student (unlimited classes, 5 days/week)  
**Business Model:** Subscription-based online education platform

---

## ✅ Completed Today (Nov 20, 2024)

### Development Environment Setup
- ✅ Node.js v24.11.1 installed
- ✅ Next.js 16.0.3 project created (`success-academy-international`)
- ✅ Project location: `~/Desktop/success-academy-international`

### Technical Stack Configured
- ✅ Next.js with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Supabase (PostgreSQL database + Authentication)
- ✅ Vercel for deployment (not deployed yet)

### Features Implemented
- ✅ **Login/Sign Up Page** (`/auth/login`)
  - Email/password authentication
  - Sign up with email confirmation
  - Beautiful UI with gradient background
  - Works perfectly!

### Database & Authentication
- ✅ Supabase project created: `success-academy-international`
- ✅ Database region: Northeast US (Virginia)
- ✅ Authentication working (tested with real email)
- ✅ Environment variables configured

---

## 📁 Current Project Structure
```
success-academy-international/
├── src/
│   ├── app/
│   │   └── auth/
│   │       └── login/
│   │           └── page.tsx          ✅ Login page (WORKING)
│   └── utils/
│       └── supabase.ts               ✅ Supabase client config
├── .env.local                        ✅ Environment variables (SECRET!)
├── tsconfig.json                     ✅ TypeScript config
├── package.json                      ✅ Dependencies
└── PROJECT_STATUS.md                 📝 This file!
```

---

## 🔧 Technical Configuration

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xixmyqkdsifechxexxlw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Supabase Project
- **Project Name:** success-academy-international
- **Region:** us-east-1 (Virginia)
- **Database:** PostgreSQL (Supabase managed)
- **Plan:** Free tier

### Running the Development Server
```bash
cd ~/Desktop/success-academy-international
npm run dev
```
Then visit: `http://localhost:3000/auth/login`

---

## 💰 PRICING & DISCOUNT SYSTEM (FINALIZED)

### **Base Pricing**
- $80/month per student ($12,000 yen at ¥150/dollar rate)
- Each student = separate subscription
- 14-day free trial for new students
- Charged per student, not per family

### **Sibling Discount (Automatic)**
```
2nd child: 10% OFF
3rd+ child: 20% OFF

Example (4 children):
├─ Child 1: $80/month
├─ Child 2: $72/month (10% OFF)
├─ Child 3: $64/month (20% OFF)
└─ Child 4: $64/month (20% OFF)
Total: $280/month
```

### **Referral Program (Simple & Powerful)**

**How it works:**
- Refer friends (external only, not siblings)
- They must stay active for 1+ month
- Discount applies to ALL your children

**Discount Tiers:**
```
1 friend referred → 20% OFF (all your children)
2 friends referred → 40% OFF (all your children)
3 friends referred → 60% OFF (all your children)
4 friends referred → 80% OFF (all your children)
5 friends referred → 100% OFF - COMPLETELY FREE! 🎉
```

**Example: 2 children + 3 friends referred**
```
Without referral:
├─ Child 1: $80
└─ Child 2: $72 (sibling discount)
Total: $152/month

With 3 friends referred (60% OFF):
├─ Child 1: $80 × 40% = $32
└─ Child 2: $72 × 40% = $28.80
Total: $60.80/month
Savings: $91.20/month! 🎉
```

### **Key Rules**
1. ✅ Sibling discount applied automatically
2. ✅ Referral discount applies to ALL children
3. ✅ Both discounts stack (multiply together)
4. ✅ Real-time calculation - discount updates immediately
5. ✅ If referred friend cancels → discount adjusts next billing cycle
6. ✅ Siblings do NOT count as referrals (external friends only)
7. ✅ Referred friends must continue for 1+ month to count

### **Billing Cycle - Real-Time Proration**
- Each user has their own billing date (anniversary of signup)
- Discounts update in real-time using Stripe proration
- No monthly snapshots - continuous calculation
- When referral count changes, next billing reflects new discount
- Example timeline:
  ```
  April 1: Anju signs up → billing date set to 1st of each month
  April 15: Friend joins → Anju's discount updates to 20% OFF
  May 1: Anju's next charge reflects 20% OFF (with April proration credit)
  May 20: Friend cancels → Anju's discount returns to 0%
  June 1: Anju's charge returns to full price
  ```

---

## 👥 TEACHER COMPENSATION

### **Group Lessons (Fixed Cost)**

**Schedule:**
- Monday, Wednesday, Friday: Math (Filipino teachers)
- Tuesday, Thursday: English (American teachers in Japan)
- 5 classes per day (25 minutes each)

**Teacher Pay:**
```
Math (Filipino): ¥550 per class
English (American): $13 (¥1,950) per class

Weekly cost:
├─ Math: 15 classes × ¥550 = ¥8,250
└─ English: 10 classes × ¥1,950 = ¥19,500
Total: ¥27,750/week

Monthly cost: ¥111,000 (fixed)
```

**Break-even point:** 12 students minimum
**Profitable at:** 15+ students

---

## 📊 FINANCIAL PROJECTIONS

### **Revenue Model**
```
Fixed costs: ¥111,000/month (teachers)
Variable cost: ¥2,000/student/month (Zoom, systems, support)

Per-student profit:
├─ Revenue: ¥12,000
├─ Variable cost: ¥2,000
└─ Contribution: ¥10,000/student

Break-even: 12 students (¥111,000 ÷ ¥10,000 = 11.1)
```

### **Growth Projections (with referral program)**
```
Scenario: Start with 30 students
Referral growth rate: 25%/month (conservative with 5-friend-free incentive)

Month 1: 30 students → ¥189,000 profit
Month 6: 92 students → ¥731,000 profit
Month 12: 282 students → ¥2,709,000 profit

Year 1 total profit: ~¥15,000,000
```

### **Referral Program Impact**
- Expected referral rate: 25%/month (with 100% free incentive)
- Customer acquisition cost: ¥0 (vs ¥100,000/month on ads)
- Estimated 2-5% fraud/abuse (acceptable cost of growth)
- Key metric: Viral coefficient >1 (each user brings 1+ new users)

---

## 🔒 FRAUD PREVENTION

### **Basic Protections (Must Have)**
1. ✅ Credit card required (even for free trial)
2. ✅ Email verification required
3. ✅ Same credit card detection → blocks duplicate accounts
4. ✅ Referrals only count after 1+ month active
5. ✅ Real-time adjustment if referred user cancels

### **Advanced Detection (Nice to Have)**
1. IP address tracking (multiple signups from same IP)
2. Pattern detection (simultaneous signups with same referral code)
3. Manual review for suspicious activity
4. Account suspension for confirmed fraud

### **Philosophy**
- Accept 2-5% fraud as "cost of growth"
- Don't over-optimize for fraud prevention
- Focus on growth > prevention
- Most users (95%+) are honest

---

## ⏭️ Next Steps (In Order)

### Immediate Next (Phase 1 continued):

1. **Dashboard Page** - Netflix-style profile selector
   - Location: `src/app/dashboard/page.tsx`
   - Feature: "Who's learning today?" screen
   - Child profile cards with avatars

2. **Database Schema Updates**
   - Extend `students` table with subscription fields
   - Create `referrals` table for tracking referrals
   - Add billing and discount tracking fields

3. **Student Profile Management**
   - Add student form
   - Edit student info
   - Delete student (with confirmation)
   - Display pricing with discounts

4. **Stripe Integration** (CRITICAL)
   - Connect NEW Stripe account (separate from Success Academy World)
   - Implement per-student subscriptions
   - 14-day free trial setup
   - Proration for discount changes
   - Webhook handling for subscription events

5. **Referral System**
   - Generate unique referral codes
   - Referral tracking dashboard
   - Real-time discount calculation
   - Automatic Stripe subscription updates

### Phase 2 (After Core Billing):
- Lesson scheduling system
- Class booking interface
- Zoom links integration
- Teacher management dashboard

---

## 🗄️ DATABASE SCHEMA (Updated)

### **students table**
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  age INTEGER CHECK (age >= 3 AND age <= 5),
  date_of_birth DATE,
  avatar_color VARCHAR(7),
  
  -- Subscription info
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(20) DEFAULT 'trial',
  trial_start_date TIMESTAMP DEFAULT NOW(),
  trial_end_date TIMESTAMP DEFAULT NOW() + INTERVAL '14 days',
  subscription_start_date TIMESTAMP,
  billing_cycle_anchor TIMESTAMP,
  
  -- Discount tracking (calculated, not stored)
  -- sibling_discount_rate DECIMAL (calculated from order)
  -- referral_discount_rate DECIMAL (calculated from referrals table)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **referrals table** (NEW)
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id),
  referral_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'cancelled'
  
  signed_up_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP, -- when they became paying customer
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_user_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
```

### **referral_codes table** (NEW)
```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 KEY FUNCTIONS TO IMPLEMENT

### **Calculate Sibling Discount**
```javascript
function calculateSiblingDiscount(childIndex) {
  // childIndex: 0 = first child, 1 = second child, etc.
  if (childIndex === 0) return 0;      // 0% OFF
  if (childIndex === 1) return 0.10;   // 10% OFF
  return 0.20;                         // 20% OFF (3rd+)
}
```

### **Calculate Referral Discount**
```javascript
function calculateReferralDiscount(activeReferralCount) {
  const rate = Math.min(activeReferralCount * 0.20, 1.0);
  return rate; // 20% per referral, max 100%
}
```

### **Calculate Final Price**
```javascript
function calculateFinalPrice(studentIndex, activeReferralCount) {
  const basePrice = 12000; // ¥12,000
  const siblingDiscount = calculateSiblingDiscount(studentIndex);
  const referralDiscount = calculateReferralDiscount(activeReferralCount);
  
  // Apply sibling discount first
  let price = basePrice * (1 - siblingDiscount);
  
  // Then apply referral discount
  price = price * (1 - referralDiscount);
  
  return Math.round(price);
}

// Examples:
calculateFinalPrice(0, 0);  // ¥12,000 (1st child, no referrals)
calculateFinalPrice(1, 0);  // ¥10,800 (2nd child, no referrals)
calculateFinalPrice(0, 3);  // ¥4,800 (1st child, 3 referrals = 60% OFF)
calculateFinalPrice(1, 5);  // ¥0 (2nd child, 5 referrals = 100% OFF)
```

---

## 🚨 Important Notes

### DO NOT:
- ❌ Share `.env.local` file with anyone
- ❌ Commit `.env.local` to GitHub (already in `.gitignore`)
- ❌ Use existing Success Academy World Stripe account (CREATE NEW!)
- ❌ Allow siblings to count as referrals
- ❌ Make pricing system more complex than this

### REMEMBER:
- 🔄 Always restart dev server after changing `.env.local`
- 💾 Save files with `Command + S`
- 🔍 Check browser console (`Command + Option + J`) for errors
- 📧 Use real email addresses for testing (confirmation emails are sent)
- 💳 Stripe uses proration automatically - trust it!
- 🎯 Keep pricing simple and transparent

### Design Philosophy:
- ✅ **Function first, design later**
- ✅ **Simple is better than complex**
- ✅ Build all features with basic styling
- ✅ Polish design in March 2026 (before April launch)
- ✅ Current design is professional and usable!

---

## 🎯 Key Decisions Made

1. **Netflix-style profile selector** - Best for 3-5 year old children who will use the platform
2. **Supabase over Firebase** - Better for scaling, PostgreSQL standard, easier to hire engineers
3. **Multi-student system** - One parent account, multiple child profiles, each with separate subscription
4. **Phase-based development** - MVP first, features later
5. **Per-student pricing** - $80/month per child (not per family)
6. **Referral program** - 20% OFF per friend, up to 100% FREE (5 friends)
7. **Real-time proration** - Stripe handles all discount changes automatically
8. **External referrals only** - Siblings don't count (drives growth)
9. **Simple discount stacking** - Sibling discount × Referral discount
10. **Group lessons only** - Initially focus on scalable group model

---

## 📞 Next Session Checklist

**Before starting next time:**
1. Open VS Code with project
2. Start dev server: `npm run dev`
3. Share this `PROJECT_STATUS.md` file with Claude
4. Continue from "Next Steps" section

**Claude will need to know:**
- Pricing system details (all documented above)
- Database schema for referrals
- Stripe integration requirements
- Discount calculation logic

---

## 🎉 Celebration!

**Major Achievement Today:** 
1. Complete authentication system working from scratch
2. **Finalized entire pricing & discount strategy** 🎉
   - Sibling discounts
   - Referral program (up to 100% free!)
   - Real-time billing with Stripe proration
   - Fraud prevention strategy
   - Financial projections

**Time invested:** ~4 hours (authentication + business model)
**Lines of code written:** ~150  
**Features completed:** 1 major feature (authentication)
**Business decisions finalized:** Complete pricing model

**Next milestone:** Dashboard with Netflix-style profile selector + Stripe integration! 🚀

---

*This file should be updated at the end of each development session.*
