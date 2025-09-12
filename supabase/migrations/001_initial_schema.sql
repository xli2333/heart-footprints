-- 心迹地图 (Our Footprints) 数据库结构
-- 创建时间: 2024-09-04
-- 作者: LXG (理想工匠)

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 每日定位记录表 (daily_locations)
-- 用于存储两人每日的地理位置信息
CREATE TABLE daily_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (user_id IN ('him', 'her')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    mood_emoji TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保每个用户每天只能有一条记录
    CONSTRAINT unique_user_date UNIQUE (user_id, DATE(created_at))
);

-- 创建索引以优化查询性能
CREATE INDEX idx_daily_locations_user_date ON daily_locations(user_id, DATE(created_at));
CREATE INDEX idx_daily_locations_created_at ON daily_locations(created_at DESC);

-- 2. 时光相册记录表 (memories)  
-- 用于存储共同的照片回忆
CREATE TABLE memories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (user_id IN ('him', 'her')),
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_user_id ON memories(user_id);

-- 3. 倒数日事件表 (countdown_events)
-- 用于存储期盼的未来事件
CREATE TABLE countdown_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    background_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保目标日期在未来
    CONSTRAINT future_date CHECK (target_date > NOW())
);

-- 创建索引
CREATE INDEX idx_countdown_events_target_date ON countdown_events(target_date);

-- 4. 时光信札表 (letters)
-- 用于存储异步的情感信件
CREATE TABLE letters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id TEXT NOT NULL CHECK (sender_id IN ('him', 'her')),
    title TEXT,
    content TEXT NOT NULL,
    scheduled_delivery_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 如果设置了定时发送，必须是未来时间
    CONSTRAINT valid_schedule CHECK (
        scheduled_delivery_at IS NULL OR 
        scheduled_delivery_at > created_at
    )
);

-- 创建索引
CREATE INDEX idx_letters_sender ON letters(sender_id);
CREATE INDEX idx_letters_delivered ON letters(delivered_at DESC) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_letters_scheduled ON letters(scheduled_delivery_at) WHERE scheduled_delivery_at IS NOT NULL;

-- 5. 创建自动更新 updated_at 的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 countdown_events 表添加自动更新触发器
CREATE TRIGGER update_countdown_events_updated_at 
    BEFORE UPDATE ON countdown_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建行级安全策略 (RLS)
-- 虽然这是私人应用，但增加安全层总是好的

-- 启用 RLS
ALTER TABLE daily_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE countdown_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（因为我们在应用层控制访问）
CREATE POLICY "Allow all operations" ON daily_locations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON memories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON countdown_events FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON letters FOR ALL USING (true);

-- 7. 创建一些实用的视图

-- 最近的距离计算视图
CREATE OR REPLACE VIEW recent_distances AS
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

-- 8. 创建一些有用的函数

-- 获取今日同步状态的函数
CREATE OR REPLACE FUNCTION get_today_sync_status()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- 获取待发送信件的函数
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

-- 插入示例数据（可选，用于测试）
-- INSERT INTO memories (user_id, image_url, description) VALUES
-- ('him', 'https://example.com/photo1.jpg', '今天的日落真美，想和你一起看'),
-- ('her', 'https://example.com/photo2.jpg', '路过花店，想起你说喜欢向日葵');

-- INSERT INTO countdown_events (title, target_date) VALUES
-- ('我们的相聚', '2024-12-25 00:00:00+08');

-- 数据库初始化完成
COMMENT ON TABLE daily_locations IS '每日定位记录 - 记录两人每天的地理位置';
COMMENT ON TABLE memories IS '时光相册 - 存储共同的照片回忆';  
COMMENT ON TABLE countdown_events IS '倒数日事件 - 期盼的未来约定';
COMMENT ON TABLE letters IS '时光信札 - 异步的情感信件';