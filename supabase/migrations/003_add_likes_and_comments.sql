-- 添加点赞和评论功能
-- 创建时间: 2025-09-04
-- 作者: LXG (理想工匠)

-- 1. 点赞表 (likes)
-- 用于存储对回忆照片的点赞
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL CHECK (user_id IN ('him', 'her')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保每个用户对每个回忆只能点赞一次
    CONSTRAINT unique_user_memory_like UNIQUE (memory_id, user_id)
);

-- 创建索引
CREATE INDEX idx_likes_memory_id ON likes(memory_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- 2. 评论表 (comments)
-- 用于存储对回忆的评论和回复
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL CHECK (user_id IN ('him', 'her')),
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_comments_memory_id ON comments(memory_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 为 comments 表添加自动更新触发器
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 启用 RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略
CREATE POLICY "Allow all operations" ON likes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON comments FOR ALL USING (true);

-- 4. 创建有用的视图

-- 回忆统计视图 (包含点赞数和评论数)
CREATE OR REPLACE VIEW memory_stats AS
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

-- 评论树视图 (包含回复结构)
CREATE OR REPLACE VIEW comment_tree AS
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

-- 5. 创建有用的函数

-- 切换点赞状态的函数
CREATE OR REPLACE FUNCTION toggle_like(p_memory_id UUID, p_user_id TEXT)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- 获取回忆详情的函数（包含点赞和评论）
CREATE OR REPLACE FUNCTION get_memory_details(p_memory_id UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- 添加评论的函数
CREATE OR REPLACE FUNCTION add_comment(
    p_memory_id UUID, 
    p_user_id TEXT, 
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- 添加表注释
COMMENT ON TABLE likes IS '点赞记录 - 记录用户对回忆的点赞';
COMMENT ON TABLE comments IS '评论记录 - 记录用户对回忆的评论和回复';