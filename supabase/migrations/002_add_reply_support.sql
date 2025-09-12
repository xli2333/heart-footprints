-- 添加回信功能支持
-- 创建时间: 2024-09-04
-- 功能: 为信件表添加回信关系支持

-- 1. 为 letters 表添加回信关系字段
ALTER TABLE letters 
ADD COLUMN reply_to UUID REFERENCES letters(id) ON DELETE SET NULL;

-- 2. 创建索引以优化查询回信关系
CREATE INDEX idx_letters_reply_to ON letters(reply_to) WHERE reply_to IS NOT NULL;

-- 3. 创建视图来获取信件的回信线程
CREATE OR REPLACE VIEW letter_threads AS
WITH RECURSIVE thread_tree AS (
    -- 获取所有原始信件（不是回信的信件）
    SELECT 
        id,
        sender_id,
        title,
        content,
        reply_to,
        created_at,
        delivered_at,
        read_at,
        scheduled_delivery_at,
        0 as thread_level,
        id as thread_root,
        ARRAY[id] as thread_path
    FROM letters 
    WHERE reply_to IS NULL
    
    UNION ALL
    
    -- 递归获取所有回信
    SELECT 
        l.id,
        l.sender_id,
        l.title,
        l.content,
        l.reply_to,
        l.created_at,
        l.delivered_at,
        l.read_at,
        l.scheduled_delivery_at,
        tt.thread_level + 1,
        tt.thread_root,
        tt.thread_path || l.id
    FROM letters l
    INNER JOIN thread_tree tt ON l.reply_to = tt.id
)
SELECT * FROM thread_tree
ORDER BY thread_root, thread_level, created_at;

-- 4. 创建函数来获取特定信件的对话线程
CREATE OR REPLACE FUNCTION get_letter_thread(letter_id UUID, include_future BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    sender_id TEXT,
    title TEXT,
    content TEXT,
    reply_to UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    scheduled_delivery_at TIMESTAMP WITH TIME ZONE,
    thread_level INTEGER,
    is_delivered BOOLEAN,
    is_read BOOLEAN
) AS $$
DECLARE
    root_letter_id UUID;
BEGIN
    -- 找到线程的根信件
    WITH RECURSIVE find_root AS (
        SELECT id, reply_to FROM letters WHERE id = letter_id
        UNION ALL
        SELECT l.id, l.reply_to 
        FROM letters l 
        INNER JOIN find_root fr ON l.id = fr.reply_to
    )
    SELECT fr.id INTO root_letter_id 
    FROM find_root fr 
    WHERE fr.reply_to IS NULL;
    
    -- 返回整个线程
    RETURN QUERY
    WITH RECURSIVE thread_tree AS (
        SELECT 
            l.id,
            l.sender_id,
            l.title,
            l.content,
            l.reply_to,
            l.created_at,
            l.delivered_at,
            l.read_at,
            l.scheduled_delivery_at,
            0 as thread_level
        FROM letters l
        WHERE l.id = root_letter_id
        
        UNION ALL
        
        SELECT 
            l.id,
            l.sender_id,
            l.title,
            l.content,
            l.reply_to,
            l.created_at,
            l.delivered_at,
            l.read_at,
            l.scheduled_delivery_at,
            tt.thread_level + 1
        FROM letters l
        INNER JOIN thread_tree tt ON l.reply_to = tt.id
    )
    SELECT 
        tt.id,
        tt.sender_id,
        tt.title,
        tt.content,
        tt.reply_to,
        tt.created_at,
        tt.delivered_at,
        tt.read_at,
        tt.scheduled_delivery_at,
        tt.thread_level,
        -- 判断是否已投递（立即发送或定时发送时间已到）
        CASE 
            WHEN tt.scheduled_delivery_at IS NULL THEN TRUE
            WHEN tt.scheduled_delivery_at <= NOW() THEN TRUE
            ELSE include_future
        END as is_delivered,
        -- 判断是否已读
        tt.read_at IS NOT NULL as is_read
    FROM thread_tree tt
    WHERE 
        CASE 
            WHEN tt.scheduled_delivery_at IS NULL THEN TRUE
            WHEN tt.scheduled_delivery_at <= NOW() THEN TRUE
            ELSE include_future
        END = TRUE
    ORDER BY tt.thread_level, tt.created_at;
END;
$$ LANGUAGE plpgsql;

-- 5. 更新获取待发送信件的函数以支持回信
CREATE OR REPLACE FUNCTION get_pending_letters()
RETURNS SETOF letters AS $$
BEGIN
    RETURN QUERY
    UPDATE letters 
    SET delivered_at = NOW()
    WHERE scheduled_delivery_at IS NOT NULL 
      AND scheduled_delivery_at <= NOW() 
      AND delivered_at IS NULL
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 6. 添加注释
COMMENT ON COLUMN letters.reply_to IS '回信关系 - 指向被回复的信件ID';
COMMENT ON VIEW letter_threads IS '信件对话线程视图 - 显示完整的信件对话';
COMMENT ON FUNCTION get_letter_thread IS '获取指定信件的完整对话线程';