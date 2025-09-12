-- 修复语音消息安全策略
-- 创建时间: 2024-09-13
-- 用途: 更新语音消息相关的RLS和存储策略，兼容自定义JWT认证

-- 1. 删除现有的宽松策略
DROP POLICY IF EXISTS "Allow all operations" ON voice_messages;
DROP POLICY IF EXISTS "Allow voice message uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow voice message viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow voice message deletions" ON storage.objects;
DROP POLICY IF EXISTS "Allow voice message updates" ON storage.objects;

-- 2. 禁用 voice_messages 表的 RLS（使用应用层认证）
ALTER TABLE voice_messages DISABLE ROW LEVEL SECURITY;

-- 3. 为 voice-messages 存储桶创建允许所有操作的策略
-- 因为我们在应用层控制访问权限
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

-- 4. 确保存储桶是公开的（用于音频播放）
UPDATE storage.buckets 
SET public = true 
WHERE id = 'voice-messages';

-- 5. 注释说明
COMMENT ON TABLE voice_messages 
IS '语音信箱 - 使用应用层JWT认证，已禁用RLS';