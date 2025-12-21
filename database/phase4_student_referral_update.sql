-- =====================================================
-- Phase 4 修正: 生徒ごとの紹介システム
-- Success Academy Global
-- 
-- このSQLをSupabaseのSQL Editorで実行してください
-- =====================================================

-- 1. 既存のreferral_codesテーブルを修正
-- user_id から student_id に変更

-- 既存のデータとテーブルを削除（テストデータのみの場合）
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS referral_codes;

-- 2. 新しいreferral_codes テーブル作成（生徒単位）
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_student_code UNIQUE(student_id)
);

CREATE INDEX idx_referral_codes_student_id ON referral_codes(student_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- 3. 新しいreferrals テーブル作成
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'trial',
  
  signed_up_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_referral_per_code UNIQUE(referral_code, referred_user_id)
);

CREATE INDEX idx_referrals_student_id ON referrals(student_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

-- 4. RLS有効化
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー
CREATE POLICY "Allow all operations on referral_codes" ON referral_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 確認用クエリ
-- =====================================================

-- テーブル構造確認
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_codes';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referrals';
