-- 语音消息存储配置
-- 创建时间: 2024-12-25
-- 用途: 配置语音消息文件存储

-- 1. 创建 voice-messages 存储桶（如果不存在）
insert into storage.buckets (id, name, public) 
values ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;

-- 2. 设置存储策略：允许所有用户上传和访问文件
-- 上传策略
create policy "Allow voice message uploads" 
on storage.objects for insert 
with check (bucket_id = 'voice-messages');

-- 查看策略  
create policy "Allow voice message viewing"
on storage.objects for select 
using (bucket_id = 'voice-messages');

-- 删除策略
create policy "Allow voice message deletions"
on storage.objects for delete 
using (bucket_id = 'voice-messages');

-- 更新策略
create policy "Allow voice message updates"
on storage.objects for update
using (bucket_id = 'voice-messages');