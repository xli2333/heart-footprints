// 本地测试用的 Mock 数据
import { Memory, DailyLocation, CountdownEvent, Letter } from '@/types/database'

// 使用 Haversine 公式计算两点间距离（公里）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

let mockData = {
  // 模拟的每日定位数据
  dailyLocations: [] as DailyLocation[],
  
  // 模拟的时光相册数据
  memories: [
    {
      id: '1',
      user_id: 'him' as const,
      image_url: 'https://picsum.photos/400/600?random=1',
      description: '今天路过这家咖啡店，想起我们第一次约会的地方',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2天前
    },
    {
      id: '2', 
      user_id: 'her' as const,
      image_url: 'https://picsum.photos/300/400?random=2',
      description: '办公室窗外的日落，很美，想和你一起看',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12小时前
    },
    {
      id: '3',
      user_id: 'him' as const, 
      image_url: 'https://picsum.photos/500/300?random=3',
      description: '今天做的晚餐，下次一起做这道菜好不好',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3小时前
    }
  ] as Memory[],
  
  // 模拟的倒数日数据
  countdownEvents: [] as CountdownEvent[],
  
  // 模拟的信件数据
  letters: [
    {
      id: '1',
      sender_id: 'her' as const,
      title: '想你了',
      content: '今天下雨了，想起你总是会在雨天的时候给我发消息问我有没有带伞。现在虽然我们隔得很远，但是我知道你一定还是会关心我的。我也很想念你，想念我们一起度过的那些美好时光。',
      scheduled_delivery_at: null,
      delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6小时前
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: '2', 
      sender_id: 'him' as const,
      title: null,
      content: '刚刚看到一部很好看的电影预告，等你有空的时候我们一起去看吧！我已经在想象我们一起吃爆米花的画面了，哈哈。',
      scheduled_delivery_at: null,
      delivered_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
      read_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20分钟前已读
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    }
  ] as Letter[]
}

// 获取今天的日期字符串
function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// 检查今天是否已同步
function checkTodaySync(userId: 'him' | 'her') {
  const today = getTodayString()
  return mockData.dailyLocations.some(
    loc => loc.user_id === userId && loc.created_at.startsWith(today)
  )
}

// Mock API 函数
export const mockApi = {
  // 认证相关
  async login(password: string) {
    // 延迟模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const HIM_PASSWORD = process.env.USER_HIM_PASSWORD || 'test_password_him'
    const HER_PASSWORD = process.env.USER_HER_PASSWORD || 'test_password_her'
    const HIM_NAME = process.env.USER_HIM_NAME || '测试昵称1'
    const HER_NAME = process.env.USER_HER_NAME || '测试昵称2'
    
    if (password === HIM_PASSWORD) {
      return { success: true, data: { user: { id: 'him', name: HIM_NAME } } }
    } else if (password === HER_PASSWORD) {
      return { success: true, data: { user: { id: 'her', name: HER_NAME } } }
    } else {
      return { success: false, error: '暗号不对哦，再想想？' }
    }
  },

  async verify() {
    await new Promise(resolve => setTimeout(resolve, 200))
    // 模拟已登录状态，默认返回 him 用户
    return { 
      success: true, 
      data: { 
        user: { 
          id: 'him', 
          name: process.env.USER_HIM_NAME || '测试昵称1' 
        } 
      } 
    }
  },

  // 定位相关
  async syncLocation(userId: string, latitude: number, longitude: number, mood_emoji?: string) {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const today = getTodayString()
    
    // 检查今天是否已同步
    if (checkTodaySync(userId)) {
      return { success: false, error: '今天已经同步过位置了哦' }
    }
    
    // 添加新的位置记录
    const newLocation: DailyLocation = {
      id: Date.now().toString(),
      user_id: userId,
      latitude,
      longitude,
      mood_emoji,
      created_at: new Date().toISOString()
    }
    
    mockData.dailyLocations.push(newLocation)
    
    // 检查对方是否也已同步
    const otherUserId = userId === 'him' ? 'her' : 'him'
    const otherLocation = mockData.dailyLocations.find(
      loc => loc.user_id === otherUserId && loc.created_at.startsWith(today)
    )
    
    let distance = null
    let bothSynced = false
    let message = '位置已同步，等待对方回应...'
    
    if (otherLocation) {
      // 计算距离（使用 Haversine 公式计算更准确的距离）
      distance = calculateDistance(latitude, longitude, otherLocation.latitude, otherLocation.longitude)
      bothSynced = true
      message = `你们相距 ${distance.toFixed(2)} 公里`
    }
    
    return {
      success: true,
      data: {
        location: newLocation,
        bothSynced,
        distance,
        message: bothSynced 
          ? `今天，我们相距 ${distance!.toFixed(2)} 公里` 
          : '位置已同步，等待对方回应...'
      }
    }
  },

  async getLocationStatus(userId?: string) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const currentUserId = userId || 'him'
    const today = getTodayString()
    
    const himLocation = mockData.dailyLocations.find(
      loc => loc.user_id === 'him' && loc.created_at.startsWith(today)
    )
    const herLocation = mockData.dailyLocations.find(
      loc => loc.user_id === 'her' && loc.created_at.startsWith(today)
    )
    
    const himSynced = !!himLocation
    const herSynced = !!herLocation
    const bothSynced = himSynced && herSynced
    const currentUserSynced = currentUserId === 'him' ? himSynced : herSynced
    
    let distance = null
    let distanceMessage = ''
    
    if (bothSynced && himLocation && herLocation) {
      distance = calculateDistance(
        himLocation.latitude, 
        himLocation.longitude, 
        herLocation.latitude, 
        herLocation.longitude
      )
      distanceMessage = `今天，我们相距 ${distance.toFixed(2)} 公里`
    } else if (currentUserSynced) {
      const otherUserName = currentUserId === 'him' 
        ? process.env.USER_HER_NAME || '测试昵称2'
        : process.env.USER_HIM_NAME || '测试昵称1'
      distanceMessage = `等待 ${otherUserName} 的回应...`
    } else {
      distanceMessage = '今天，你在哪儿？'
    }
    
    return {
      success: true,
      data: {
        himSynced,
        herSynced,
        bothSynced,
        currentUserSynced,
        distance,
        distanceMessage,
        himLocation,
        herLocation
      }
    }
  },

  // 时光相册相关
  async getMemories() {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const formattedMemories = mockData.memories.map(memory => ({
      ...memory,
      uploader_name: memory.user_id === 'him' 
        ? process.env.USER_HIM_NAME || '测试昵称1'
        : process.env.USER_HER_NAME || '测试昵称2',
      // 添加点赞和评论的模拟数据
      like_count: Math.floor(Math.random() * 3), // 0-2个点赞
      comment_count: Math.floor(Math.random() * 5), // 0-4个评论
      liked_by_him: Math.random() > 0.5,
      liked_by_her: Math.random() > 0.5
    }))
    
    return {
      success: true,
      data: {
        memories: formattedMemories,
        total: formattedMemories.length,
        hasMore: false,
        currentPage: 1,
        totalPages: 1
      }
    }
  },

  async uploadMemory(file: File, description: string) {
    await new Promise(resolve => setTimeout(resolve, 1500)) // 模拟上传时间
    
    const newMemory: Memory = {
      id: Date.now().toString(),
      user_id: 'him',
      image_url: URL.createObjectURL(file), // 本地预览URL
      description,
      created_at: new Date().toISOString()
    }
    
    mockData.memories.unshift(newMemory)
    
    return {
      success: true,
      data: {
        memory: newMemory,
        message: '成功添加到我们的时光相册'
      }
    }
  },

  // 倒数日相关
  async getCountdown() {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 过滤出未过期的事件
    const activeEvent = mockData.countdownEvents.find(
      event => new Date(event.target_date) > new Date()
    )
    
    return {
      success: true,
      data: {
        event: activeEvent || null,
        hasActiveEvent: !!activeEvent
      }
    }
  },

  async createCountdown(title: string, target_date: string) {
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 清除现有的倒数日
    mockData.countdownEvents = []
    
    const newEvent: CountdownEvent = {
      id: Date.now().toString(),
      title,
      target_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    mockData.countdownEvents.push(newEvent)
    
    return {
      success: true,
      data: {
        event: newEvent,
        message: '倒数日已设置成功'
      }
    }
  },

  async deleteCountdown() {
    await new Promise(resolve => setTimeout(resolve, 300))
    mockData.countdownEvents = []
    
    return {
      success: true,
      message: '倒数日已删除'
    }
  },

  // 时光信札相关
  async getLetters(type: 'inbox' | 'sent' | 'all' = 'all') {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const userId = 'him'
    let filteredLetters = [...mockData.letters]
    
    if (type === 'inbox') {
      filteredLetters = filteredLetters.filter(
        letter => letter.sender_id !== userId && letter.delivered_at
      )
    } else if (type === 'sent') {
      filteredLetters = filteredLetters.filter(
        letter => letter.sender_id === userId
      )
    } else {
      filteredLetters = filteredLetters.filter(letter => letter.delivered_at)
    }
    
    const formattedLetters = filteredLetters.map(letter => ({
      ...letter,
      sender_name: letter.sender_id === 'him' 
        ? process.env.USER_HIM_NAME || '测试昵称1'
        : process.env.USER_HER_NAME || '测试昵称2',
      is_sent_by_current_user: letter.sender_id === userId,
      is_delivered: !!letter.delivered_at,
      is_read: !!letter.read_at
    }))
    
    const unreadCount = formattedLetters.filter(
      letter => !letter.is_sent_by_current_user && !letter.is_read
    ).length
    
    return {
      success: true,
      data: {
        letters: formattedLetters,
        total: formattedLetters.length,
        unreadCount,
        hasMore: false
      }
    }
  },

  async sendLetter(title: string | null, content: string, scheduled_delivery_at?: string) {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const now = new Date()
    let deliveredAt = null
    
    if (!scheduled_delivery_at) {
      deliveredAt = now.toISOString() // 立即发送
    }
    
    const newLetter: Letter = {
      id: Date.now().toString(),
      sender_id: 'him',
      title: title || undefined,
      content,
      scheduled_delivery_at: scheduled_delivery_at || undefined,
      delivered_at: deliveredAt || undefined,
      read_at: undefined,
      created_at: now.toISOString()
    }
    
    mockData.letters.unshift(newLetter)
    
    return {
      success: true,
      data: {
        letter: newLetter,
        message: scheduled_delivery_at ? '信件已安排定时发送' : '信件发送成功'
      }
    }
  },

  async markLetterAsRead(letterId: string) {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const letter = mockData.letters.find(l => l.id === letterId)
    if (letter && !letter.read_at) {
      letter.read_at = new Date().toISOString()
    }
    
    return {
      success: true,
      data: { letter }
    }
  },

  async deleteLetter(letterId: string) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    mockData.letters = mockData.letters.filter(l => l.id !== letterId)
    
    return {
      success: true,
      message: '信件已删除'
    }
  }
}