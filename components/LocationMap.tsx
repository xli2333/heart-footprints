'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, MapPin, Navigation, AlertTriangle } from 'lucide-react'
import AMapLoader from '@amap/amap-jsapi-loader'
import dynamic from 'next/dynamic'

interface LocationData {
  latitude: number
  longitude: number
  mood_emoji?: string
  created_at: string
}

interface LocationMapProps {
  himLocation: LocationData | null
  herLocation: LocationData | null
  distance?: number | null
  className?: string
}

function LocationMapComponent({ himLocation, herLocation, distance, className = '' }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [markers, setMarkers] = useState<any[]>([])

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current || (!himLocation && !herLocation)) return

    const initMap = async () => {
      try {
        setIsLoading(true)
        setError('')

        // 获取高德地图API密钥
        const amapKey = '6348fed6c5e6da71164562f95c939b72'
        const securityKey = 'b31a1f1bba00adcf751b6f87e281cc26'
        
        // 配置高德地图安全密钥（必须在加载前设置）
        window._AMapSecurityConfig = {
          securityJsCode: securityKey
        }
        
        // 加载高德地图API
        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.InfoWindow', 'AMap.Scale']
        })

        // 创建地图实例
        const mapInstance = new AMap.Map(mapContainer.current, {
          zoom: 10,
          mapStyle: 'amap://styles/light', // 使用浅色主题
          viewMode: '2D',
          showLabel: false, // 隐藏地名标签，更简洁
          showBuildingBlock: false // 隐藏建筑物
        })

        // 创建标记点
        const markers = []
        if (himLocation) {
          const himMarker = createCustomMarker(AMap, himLocation, 'him', process.env.NEXT_PUBLIC_USER_HIM_NAME || '他')
          markers.push(himMarker)
        }
        if (herLocation) {
          const herMarker = createCustomMarker(AMap, herLocation, 'her', process.env.NEXT_PUBLIC_USER_HER_NAME || '她')
          markers.push(herMarker)
        }

        // 添加标记到地图
        if (markers.length > 0) {
          mapInstance.add(markers)
        }

        // 创建连接线
        if (distance) {
          const polyline = new AMap.Polyline({
            path: [
              [himLocation.longitude, himLocation.latitude],
              [herLocation.longitude, herLocation.latitude]
            ],
            strokeColor: '#C58787', // 豆沙红主色
            strokeWeight: 3,
            strokeStyle: 'dashed',
            strokeOpacity: 0.8,
            strokeDasharray: [10, 5]
          })
          mapInstance.add(polyline)

          // 距离标签
          const midLat = (himLocation.latitude + herLocation.latitude) / 2
          const midLng = (himLocation.longitude + herLocation.longitude) / 2
          
          const distanceMarker = new AMap.Marker({
            position: [midLng, midLat],
            content: createDistanceLabel(distance),
            offset: new AMap.Pixel(-30, -10)
          })
          mapInstance.add(distanceMarker)
        }

        // 自动调整地图视野
        if (himLocation && herLocation) {
          // 两个点都存在时，显示包含两点的区域
          const bounds = new AMap.Bounds([himLocation.longitude, himLocation.latitude], [herLocation.longitude, herLocation.latitude])
          mapInstance.setBounds(bounds, false, [50, 50, 50, 50]) // 添加边距
        } else if (himLocation) {
          // 只有him的位置时，以他的位置为中心
          mapInstance.setCenter([himLocation.longitude, himLocation.latitude])
          mapInstance.setZoom(10)
        } else if (herLocation) {
          // 只有her的位置时，以她的位置为中心
          mapInstance.setCenter([herLocation.longitude, herLocation.latitude])
          mapInstance.setZoom(10)
        }

        setMap(mapInstance)
        setMarkers(markers)
        setIsLoading(false)

      } catch (err) {
        console.error('地图加载失败:', err)
        setError('地图加载失败，请稍后重试')
        setIsLoading(false)
      }
    }

    initMap()

    // 清理函数
    return () => {
      if (map) {
        map.destroy()
      }
    }
  }, [himLocation, herLocation, distance])

  // 创建自定义标记
  const createCustomMarker = (AMap: any, location: LocationData, userType: 'him' | 'her', userName: string) => {
    const isHim = userType === 'him'
    const bgColor = isHim ? '#3B82F6' : '#EC4899' // 蓝色/粉色
    const emoji = location.mood_emoji || (isHim ? '😊' : '😊')

    const markerContent = `
      <div style="
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, ${bgColor}dd, ${bgColor}aa);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s ease;
        position: relative;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        ${emoji}
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${bgColor}dd;
        "></div>
      </div>
    `

    const marker = new AMap.Marker({
      position: [location.longitude, location.latitude],
      content: markerContent,
      offset: new AMap.Pixel(-25, -40)
    })

    // 添加点击事件显示信息窗口
    const infoWindow = new AMap.InfoWindow({
      content: `
        <div style="padding: 12px; font-family: 'LXGW WenKai GB', sans-serif; min-width: 150px;">
          <div style="font-weight: 600; color: #333; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${emoji}</span>
            <span>${userName}</span>
          </div>
          <div style="font-size: 13px; color: #666; line-height: 1.4;">
            <div>📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</div>
            <div style="margin-top: 4px;">🕒 ${formatTime(location.created_at)}</div>
          </div>
        </div>
      `,
      offset: new AMap.Pixel(0, -40)
    })

    marker.on('click', () => {
      infoWindow.open(map, marker.getPosition())
    })

    return marker
  }

  // 创建距离标签
  const createDistanceLabel = (distance: number) => {
    return `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        padding: 8px 12px;
        border-radius: 20px;
        border: 2px solid #C58787;
        font-family: 'LXGW WenKai GB', sans-serif;
        font-weight: 600;
        color: #C58787;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        white-space: nowrap;
      ">
        💕 ${Math.round(distance)}km
      </div>
    `
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    const time = new Date(timeString)
    return time.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  // 如果没有任何位置数据，不显示地图
  if (!himLocation && !herLocation) {
    return null
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-2xl overflow-hidden border-2 border-warm-muted shadow-lg ${className}`}
    >
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-warm-paper/90 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p className="text-warm-text/70 text-sm">加载地图中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 bg-warm-paper flex items-center justify-center z-10">
          <div className="text-center p-6">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-warm-text/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 地图标题栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-primary-500" />
            <span className="text-warm-text font-medium text-sm">我们的位置</span>
          </div>
          {distance && (
            <div className="flex items-center space-x-1 bg-primary-50 px-3 py-1 rounded-full">
              <MapPin className="w-4 h-4 text-primary-600" />
              <span className="text-primary-700 font-semibold text-sm">{Math.round(distance)}km</span>
            </div>
          )}
        </div>
      </div>

      {/* 地图容器 */}
      <div 
        ref={mapContainer}
        className="w-full h-80 bg-gray-100"
        style={{ minHeight: '320px' }}
      />
      
      {/* 底部信息栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-white/80 backdrop-blur-sm p-3">
        <div className="flex items-center justify-center space-x-6 text-sm text-warm-text/70">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>{process.env.NEXT_PUBLIC_USER_HIM_NAME || '他'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-pink-400"></div>
            <span>{process.env.NEXT_PUBLIC_USER_HER_NAME || '她'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// 使用动态导入避免SSR问题

const LocationMap = dynamic(() => Promise.resolve(LocationMapComponent), {
  ssr: false,
  loading: () => (
    <div className="relative rounded-2xl overflow-hidden border-2 border-warm-muted shadow-lg h-80 bg-warm-paper flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
        <p className="text-warm-text/70 text-sm">加载地图中...</p>
      </div>
    </div>
  )
})

export default LocationMap