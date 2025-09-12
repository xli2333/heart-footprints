// 快速更新所有组件使用 getApiPath 的脚本
// 在 Node.js 中运行: node update-components.js

const fs = require('fs')
const path = require('path')

const updates = [
  // CountdownTimer
  {
    file: 'components/CountdownTimer.tsx',
    replacements: [
      ["'/api/countdown'", "getApiPath('/countdown')"],
      ["await mutate('/api/countdown')", "await mutate(getApiPath('/countdown'))"]
    ]
  },
  // LetterBox
  {
    file: 'components/LetterBox.tsx',
    replacements: [
      ["'/api/letters", "getApiPath('/letters"],
      ["await mutate('/api/letters", "await mutate(getApiPath('/letters"],
      ["'/api/letters'", "getApiPath('/letters')"],
      ["`/api/letters/${letter.id}`", "`${getApiPath('/letters')}/${letter.id}`"]
    ]
  }
]

// 需要添加 import 的文件
const filesToAddImport = [
  'components/CountdownTimer.tsx',
  'components/LetterBox.tsx'
]

console.log('🔧 正在更新组件使用 Mock API...')

filesToAddImport.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8')
    
    // 检查是否已经有 import
    if (!content.includes("import { getApiPath }")) {
      // 找到第一个从 '@/lib/' 开始的 import，在其后添加
      const importRegex = /(import .+ from '@\/lib\/.+'\n)/
      if (importRegex.test(content)) {
        content = content.replace(importRegex, "$1import { getApiPath } from '@/lib/api-config'\n")
      } else {
        // 如果没有找到，在其他 import 后添加
        const lastImportRegex = /(import .+\n)(?!import)/
        content = content.replace(lastImportRegex, "$1import { getApiPath } from '@/lib/api-config'\n")
      }
      
      fs.writeFileSync(fullPath, content)
      console.log(`✅ 已添加 import 到 ${filePath}`)
    }
  }
})

updates.forEach(({ file, replacements }) => {
  const fullPath = path.join(__dirname, file)
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8')
    let changed = false
    
    replacements.forEach(([from, to]) => {
      if (content.includes(from)) {
        content = content.replaceAll(from, to)
        changed = true
      }
    })
    
    if (changed) {
      fs.writeFileSync(fullPath, content)
      console.log(`✅ 已更新 ${file}`)
    }
  }
})

console.log('🎉 所有组件已更新完成！')