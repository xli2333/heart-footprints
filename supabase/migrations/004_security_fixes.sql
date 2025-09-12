-- 安全修复: 解决 Supabase Security Advisor 报告的问题
-- 创建时间: 2025-09-12
-- 作者: LXG (理想工匠)

-- 1. 修复视图的 SECURITY DEFINER 问题
-- 重新创建视图，移除 SECURITY DEFINER，使用 SECURITY INVOKER (默认行为)

-- 修复 recent_distances 视图
CREATE OR REPLACE VIEW public.recent_distances 
WITH (security_invoker = true) AS
WITH daily_pairs AS (
    SELECT 
        DATE(created_at) as date,
        MAX(CASE WHEN user_id = 'him' THEN latitude END) as him_lat,
        MAX(CASE WHEN user_id = 'him' THEN longitude END) as him_lng,
        MAX(CASE WHEN user_id = 'her' THEN latitude END) as her_lat,
        MAX(CASE WHEN user_id = 'her' THEN longitude END) as her_lng,
        MAX(CASE WHEN user_id = 'him' THEN mood_emoji END) as him_mood,
        MAX(CASE WHEN user_id = 'her' THEN mood_emoji END) as her_mood
    FROM daily_locations
    GROUP BY DATE(created_at)
    HAVING 
        MAX(CASE WHEN user_id = 'him' THEN latitude END) IS NOT NULL AND
        MAX(CASE WHEN user_id = 'her' THEN latitude END) IS NOT NULL
)
SELECT 
    date,
    him_lat,
    him_lng,
    her_lat,
    her_lng,
    him_mood,
    her_mood,
    -- 使用 Haversine 公式计算距离（公里）
    ROUND(
        6371 * acos(
            cos(radians(him_lat)) * 
            cos(radians(her_lat)) * 
            cos(radians(her_lng) - radians(him_lng)) + 
            sin(radians(him_lat)) * 
            sin(radians(her_lat))
        )::numeric, 2
    ) as distance_km
FROM daily_pairs
ORDER BY date DESC;

-- 修复 letter_threads 视图
CREATE OR REPLACE VIEW public.letter_threads
WITH (security_invoker = true) AS
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

-- 修复 memory_stats 视图
CREATE OR REPLACE VIEW public.memory_stats
WITH (security_invoker = true) AS
SELECT 
    m.id,
    m.user_id,
    m.image_url,
    m.description,
    m.created_at,
    COALESCE(l.like_count, 0) as like_count,
    COALESCE(c.comment_count, 0) as comment_count,
    COALESCE(l.liked_by_him, false) as liked_by_him,
    COALESCE(l.liked_by_her, false) as liked_by_her
FROM memories m
LEFT JOIN (
    SELECT 
        memory_id,
        COUNT(*) as like_count,
        BOOL_OR(user_id = 'him') as liked_by_him,
        BOOL_OR(user_id = 'her') as liked_by_her
    FROM likes 
    GROUP BY memory_id
) l ON m.id = l.memory_id
LEFT JOIN (
    SELECT 
        memory_id,
        COUNT(*) as comment_count
    FROM comments 
    WHERE parent_comment_id IS NULL  -- 只计算顶级评论
    GROUP BY memory_id
) c ON m.id = c.memory_id
ORDER BY m.created_at DESC;

-- 修复 comment_tree 视图
CREATE OR REPLACE VIEW public.comment_tree
WITH (security_invoker = true) AS
WITH RECURSIVE comment_hierarchy AS (
    -- 顶级评论
    SELECT 
        id,
        memory_id,
        user_id,
        content,
        parent_comment_id,
        created_at,
        updated_at,
        0 as level,
        ARRAY[created_at] as sort_path
    FROM comments 
    WHERE parent_comment_id IS NULL
    
    UNION ALL
    
    -- 回复评论
    SELECT 
        c.id,
        c.memory_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        c.updated_at,
        ch.level + 1,
        ch.sort_path || c.created_at
    FROM comments c
    JOIN comment_hierarchy ch ON c.parent_comment_id = ch.id
)
SELECT 
    id,
    memory_id,
    user_id,
    content,
    parent_comment_id,
    created_at,
    updated_at,
    level
FROM comment_hierarchy
ORDER BY memory_id, sort_path;

-- 2. 修复函数的搜索路径问题
-- 为所有函数设置 search_path，防止搜索路径攻击

-- 修复 get_today_sync_status 函数
CREATE OR REPLACE FUNCTION public.get_today_sync_status()
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    him_synced BOOLEAN := FALSE;
    her_synced BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- 检查今天是否已同步
    SELECT EXISTS(
        SELECT 1 FROM daily_locations 
        WHERE user_id = 'him' AND DATE(created_at) = today_date
    ) INTO him_synced;
    
    SELECT EXISTS(
        SELECT 1 FROM daily_locations 
        WHERE user_id = 'her' AND DATE(created_at) = today_date
    ) INTO her_synced;
    
    result := json_build_object(
        'date', today_date,
        'him_synced', him_synced,
        'her_synced', her_synced,
        'both_synced', him_synced AND her_synced
    );
    
    RETURN result;
END;
$$;

-- 修复 get_pending_letters 函数
CREATE OR REPLACE FUNCTION public.get_pending_letters()
RETURNS SETOF letters 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    UPDATE letters 
    SET delivered_at = NOW()
    WHERE scheduled_delivery_at IS NOT NULL 
      AND scheduled_delivery_at <= NOW() 
      AND delivered_at IS NULL
    RETURNING *;
END;
$$;

-- 修复 get_letter_thread 函数
CREATE OR REPLACE FUNCTION public.get_letter_thread(letter_id UUID, include_future BOOLEAN DEFAULT FALSE)
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 修复 toggle_like 函数
CREATE OR REPLACE FUNCTION public.toggle_like(p_memory_id UUID, p_user_id TEXT)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    like_exists BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- 检查是否已经点赞
    SELECT EXISTS(
        SELECT 1 FROM likes 
        WHERE memory_id = p_memory_id AND user_id = p_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        -- 取消点赞
        DELETE FROM likes 
        WHERE memory_id = p_memory_id AND user_id = p_user_id;
        
        result := json_build_object(
            'action', 'unliked',
            'memory_id', p_memory_id,
            'user_id', p_user_id
        );
    ELSE
        -- 添加点赞
        INSERT INTO likes (memory_id, user_id) 
        VALUES (p_memory_id, p_user_id);
        
        result := json_build_object(
            'action', 'liked',
            'memory_id', p_memory_id,
            'user_id', p_user_id
        );
    END IF;
    
    RETURN result;
END;
$$;

-- 修复 get_memory_details 函数
CREATE OR REPLACE FUNCTION public.get_memory_details(p_memory_id UUID)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'memory', row_to_json(ms.*),
        'comments', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id', ct.id,
                        'user_id', ct.user_id,
                        'content', ct.content,
                        'parent_comment_id', ct.parent_comment_id,
                        'level', ct.level,
                        'created_at', ct.created_at,
                        'updated_at', ct.updated_at
                    ) ORDER BY ct.created_at
                )
                FROM comment_tree ct 
                WHERE ct.memory_id = p_memory_id
            ),
            '[]'::json
        )
    )
    INTO result
    FROM memory_stats ms
    WHERE ms.id = p_memory_id;
    
    RETURN result;
END;
$$;

-- 修复 add_comment 函数
CREATE OR REPLACE FUNCTION public.add_comment(
    p_memory_id UUID, 
    p_user_id TEXT, 
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_comment_id UUID;
    result JSON;
BEGIN
    -- 插入新评论
    INSERT INTO comments (memory_id, user_id, content, parent_comment_id)
    VALUES (p_memory_id, p_user_id, p_content, p_parent_comment_id)
    RETURNING id INTO new_comment_id;
    
    -- 返回新评论的信息
    SELECT json_build_object(
        'id', c.id,
        'memory_id', c.memory_id,
        'user_id', c.user_id,
        'content', c.content,
        'parent_comment_id', c.parent_comment_id,
        'created_at', c.created_at,
        'updated_at', c.updated_at
    )
    INTO result
    FROM comments c
    WHERE c.id = new_comment_id;
    
    RETURN result;
END;
$$;

-- 修复 update_updated_at_column 函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. 添加安全注释
COMMENT ON FUNCTION public.get_today_sync_status IS '获取今日同步状态 - 安全版本';
COMMENT ON FUNCTION public.get_pending_letters IS '获取待发送信件 - 安全版本';  
COMMENT ON FUNCTION public.get_letter_thread IS '获取信件对话线程 - 安全版本';
COMMENT ON FUNCTION public.toggle_like IS '切换点赞状态 - 安全版本';
COMMENT ON FUNCTION public.get_memory_details IS '获取回忆详情 - 安全版本';
COMMENT ON FUNCTION public.add_comment IS '添加评论 - 安全版本';
COMMENT ON FUNCTION public.update_updated_at_column IS '更新时间戳触发器 - 安全版本';

COMMENT ON VIEW public.recent_distances IS '最近距离计算视图 - 安全版本';
COMMENT ON VIEW public.letter_threads IS '信件对话线程视图 - 安全版本';  
COMMENT ON VIEW public.memory_stats IS '回忆统计视图 - 安全版本';
COMMENT ON VIEW public.comment_tree IS '评论树视图 - 安全版本';

-- 安全修复完成