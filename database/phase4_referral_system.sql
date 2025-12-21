-- =====================================================
-- Phase 4: 紹介システム用データベース更新
-- Success Academy Global
-- 
-- このSQLをSupabaseのSQL Editorで実行してください
-- =====================================================

-- 1. referral_codes テーブル作成（ユーザーごとの紹介コード）
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_code UNIQUE(user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- 2. referrals テーブル作成（紹介記録）
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'cancelled'
  
  signed_up_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP, -- 支払い成功時
  cancelled_at TIMESTAMP, -- キャンセル時
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_referral UNIQUE(referrer_id, referred_user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 3. Row Level Security (RLS) 設定

-- referral_codes テーブルのRLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- 自分の紹介コードは読み取り可能
CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の紹介コードは作成可能
CREATE POLICY "Users can create own referral code" ON referral_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 全員がコードでの検索は可能（紹介コードの検証用）
CREATE POLICY "Anyone can lookup referral codes by code" ON referral_codes
  FOR SELECT
  USING (true);

-- referrals テーブルのRLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 自分が紹介者または被紹介者の記録は閲覧可能
CREATE POLICY "Users can view referrals they're involved in" ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 紹介記録の作成は認証済みユーザーなら可能
CREATE POLICY "Authenticated users can create referrals" ON referrals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 紹介記録の更新は関係者のみ（またはサービスロール）
CREATE POLICY "Users can update referrals they're involved in" ON referrals
  FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- =====================================================
-- 確認用クエリ
-- =====================================================

-- テーブルが正しく作成されたか確認
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 紹介コードテーブルの構造確認
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_codes';

-- 紹介テーブルの構造確認
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referrals';

-- =====================================================
-- テストデータ（オプション - 開発環境のみ）
-- =====================================================

-- テスト用の紹介コードを作成する場合（本番では不要）
-- INSERT INTO referral_codes (user_id, code) VALUES ('your-user-uuid', 'TEST123');

-- =====================================================
-- 補足: 割引計算ロジック
-- =====================================================
-- 割引はアプリケーション側で計算します：
-- - 1人紹介 = 20% OFF
-- - 2人紹介 = 40% OFF
-- - 3人紹介 = 60% OFF
-- - 4人紹介 = 80% OFF
-- - 5人紹介 = 100% OFF（完全無料）
--
-- アクティブな紹介数を取得するクエリ:
-- SELECT COUNT(*) FROM referrals 
-- WHERE referrer_id = 'user-uuid' AND status = 'active';
