-- 创建语音消息表
-- 创建时间: 2024-09-13
-- 用途: 创建缺失的voice_messages表

-- 启用 UUID 扩展（如果还没启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建语音信箱表 (voice_messages)
CREATE TABLE IF NOT EXISTS voice_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id TEXT NOT NULL CHECK (sender_id IN ('him', 'her')),
    recipient_id TEXT NOT NULL CHECK (recipient_id IN ('him', 'her')),
    audio_url TEXT NOT NULL,
    duration DECIMAL(5, 2) NOT NULL CHECK (duration > 0 AND duration <= 300), -- 最长5分钟
    transcription TEXT, -- 可选的语音转文字
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保发送者和接收者不同
    CONSTRAINT different_users CHECK (sender_id != recipient_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_voice_messages_recipient ON voice_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_messages_sender ON voice_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_messages_unread ON voice_messages(recipient_id) WHERE is_read = FALSE;

-- 禁用 RLS（使用应用层JWT认证）
ALTER TABLE voice_messages DISABLE ROW LEVEL SECURITY;

-- 创建 voice-messages 存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- 为 voice-messages 存储桶创建策略
CREATE POLICY "Allow all voice uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Allow all voice viewing"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY "Allow all voice deletions"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-messages');

CREATE POLICY "Allow all voice updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'voice-messages');

-- 注释说明
COMMENT ON TABLE voice_messages 
IS '语音信箱 - 存储语音消息，使用应用层JWT认证';