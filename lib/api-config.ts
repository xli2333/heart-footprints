// API 配置工具
// 根据环境变量决定使用 Mock API 还是真实 API

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

export const getApiPath = (path: string): string => {
  if (USE_MOCK_API) {
    return `/api/mock${path}`
  }
  return `/api${path}`
}

// 导出配置状态，用于调试
export const apiConfig = {
  useMockApi: USE_MOCK_API,
  mode: USE_MOCK_API ? 'Mock Mode (本地测试)' : 'Production Mode (真实数据库)'
}

// 在控制台输出当前模式
if (typeof window !== 'undefined') {
  console.log(`🔧 API Mode: ${apiConfig.mode}`)
}