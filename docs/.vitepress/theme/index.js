import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 添加鼠标拖尾特效
    if (typeof window !== 'undefined') {
      const createCursorTrail = () => {
        // 检测当前主题模式
        const isDarkMode = document.documentElement.classList.contains('dark')
        
        const trails = []
        const trailCount = isDarkMode ? 12 : 8 // 光环拖尾数量
        
        // 根据主题选择不同的颜色
        const darkColors = [
          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
          '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
          '#f8c471', '#82e0aa', '#f1948a', '#85c1e9', '#d7bde2'
        ]
        
        const lightColors = [
          '#e74c3c', '#27ae60', '#3498db', '#9b59b6', '#f39c12',
          '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
        ]
        
        const colors = isDarkMode ? darkColors : lightColors

        // 创建多个光环拖尾
        for (let i = 0; i < trailCount; i++) {
          const trail = document.createElement('div')
          trail.className = 'cursor-trail'
          
          // 光环样式设置
          const ringSize = 40 + i * 8 // 每个光环的大小递增
          const color = colors[i % colors.length]
          
          trail.style.cssText = `
            position: fixed;
            width: ${ringSize}px;
            height: ${ringSize}px;
            border-radius: 50%;
            border: 2px solid ${color}${isDarkMode ? '60' : '40'};
            background: radial-gradient(circle, ${color}${isDarkMode ? '20' : '15'} 0%, transparent 70%);
            pointer-events: none;
            z-index: 9999;
            transition: all 0.3s ease-out;
            transform: scale(0.8);
            opacity: ${1 - i * 0.08};
            left: -100px;
            top: -100px;
            ${isDarkMode ? 'box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);' : ''}
          `
          document.body.appendChild(trail)
          trails.push({
            element: trail,
            x: -100,
            y: -100,
            targetX: -100,
            targetY: -100,
            delay: i * 50, // 光环延迟
            ringIndex: i
          })
        }

        let mouseX = -100
        let mouseY = -100
        let trailHistory = []

        document.addEventListener('mousemove', (e) => {
          mouseX = e.clientX
          mouseY = e.clientY

          // 添加当前位置到历史记录
          trailHistory.unshift({ x: mouseX, y: mouseY })
          if (trailHistory.length > trailCount) {
            trailHistory.pop()
          }
        })

        const updateTrails = () => {
          trails.forEach((trail, index) => {
            const historyIndex = index
            if (trailHistory[historyIndex]) {
              const target = trailHistory[historyIndex]
              trail.targetX = target.x
              trail.targetY = target.y
            }

            // 平滑跟随
            trail.x += (trail.targetX - trail.x) * 0.15
            trail.y += (trail.targetY - trail.y) * 0.15

            // 更新光环位置和效果
            trail.element.style.left = (trail.x - (40 + index * 8) / 2) + 'px'
            trail.element.style.top = (trail.y - (40 + index * 8) / 2) + 'px'
            
            // 根据距离鼠标的远近调整效果
            const distance = Math.sqrt(
              (trail.x - mouseX) ** 2 + (trail.y - mouseY) ** 2
            )
            const scale = Math.max(0.3, 1 - distance / 200)
            const opacity = Math.max(0.1, (1 - index * 0.08) * scale)
            
            trail.element.style.transform = `scale(${scale})`
            trail.element.style.opacity = opacity
            
            // 动态调整光环颜色强度
            const intensity = Math.max(0.2, scale * (isDarkMode ? 0.8 : 0.6))
            const colorValue = colors[index % colors.length]
            trail.element.style.borderColor = `${colorValue}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`
          })

          requestAnimationFrame(updateTrails)
        }

        updateTrails()
      }

      const createClickEffect = () => {
        // 检测当前主题模式
        const isDarkMode = document.documentElement.classList.contains('dark')
        
        // 根据主题选择不同的颜色
        const darkClickColors = [
          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
          '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
          '#f8c471', '#82e0aa', '#f1948a', '#85c1e9', '#d7bde2'
        ]
        
        const lightClickColors = [
          '#e74c3c', '#27ae60', '#3498db', '#9b59b6', '#f39c12',
          '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
        ]
        
        const clickColors = isDarkMode ? darkClickColors : lightClickColors

        document.addEventListener('click', (e) => {
          const color = clickColors[Math.floor(Math.random() * clickColors.length)]
          
          // 根据主题调整烟花强度
          const fireworkIntensity = isDarkMode ? 1.2 : 0.8
          const coreSize = isDarkMode ? 80 : 60
          const sparkCount = isDarkMode ? 16 : 12
          const trailCount = isDarkMode ? 5 : 3

          // 1. 创建爆炸核心（亮闪）
          const core = document.createElement('div')
          core.style.cssText = `
            position: fixed;
            left: ${e.clientX - coreSize/2}px;
            top: ${e.clientY - coreSize/2}px;
            width: ${coreSize}px;
            height: ${coreSize}px;
            border-radius: 50%;
            background: radial-gradient(circle, ${color}ff, ${color}cc, ${color}66, transparent);
            pointer-events: none;
            z-index: 9998;
            animation: fireworkCore 0.3s ease-out forwards;
            transform: scale(0);
            ${isDarkMode ? 'box-shadow: 0 0 15px rgba(255, 255, 255, 0.4), 0 0 25px rgba(255, 255, 255, 0.2);' : 'box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);'}
          `
          document.body.appendChild(core)
          setTimeout(() => core.parentNode?.removeChild(core), 300)

          // 2. 创建火花粒子（主爆炸效果）
          for (let i = 0; i < sparkCount; i++) {
            const spark = document.createElement('div')
            const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
            const speed = (Math.random() * 200 + 150) * fireworkIntensity
            const size = Math.random() * 6 + 3
            const delay = Math.random() * 0.1

            spark.style.cssText = `
              position: fixed;
              left: ${e.clientX}px;
              top: ${e.clientY}px;
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: ${color};
              pointer-events: none;
              z-index: 9998;
              animation: fireworkSpark 2s ease-out ${delay}s forwards;
              transform: translate(-50%, -50%);
              ${isDarkMode ? 'box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);' : ''}
            `

            document.body.appendChild(spark)

            // 计算火花轨迹
            const targetX = Math.cos(angle) * speed
            const targetY = Math.sin(angle) * speed + Math.random() * 100 // 添加重力效果

            spark.style.setProperty('--target-x', `${targetX}px`)
            spark.style.setProperty('--target-y', `${targetY}px`)
            spark.style.setProperty('--rotation', `${Math.random() * 720}deg`)

            setTimeout(() => spark.parentNode?.removeChild(spark), 2000 + delay * 1000)
          }

          // 3. 创建尾迹效果（小粒子）
          for (let i = 0; i < trailCount; i++) {
            const trail = document.createElement('div')
            const angle = (i / trailCount) * Math.PI * 2
            const distance = Math.random() * 80 + 40
            const delay = Math.random() * 0.2

            trail.style.cssText = `
              position: fixed;
              left: ${e.clientX}px;
              top: ${e.clientY}px;
              width: 2px;
              height: 2px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.8);
              pointer-events: none;
              z-index: 9998;
              animation: fireworkTrail 1.2s ease-out ${delay}s forwards;
              transform: translate(-50%, -50%);
              ${isDarkMode ? 'box-shadow: 0 0 4px rgba(255, 255, 255, 1);' : ''}
            `

            document.body.appendChild(trail)

            const targetX = Math.cos(angle) * distance
            const targetY = Math.sin(angle) * distance

            trail.style.setProperty('--target-x', `${targetX}px`)
            trail.style.setProperty('--target-y', `${targetY}px`)

            setTimeout(() => trail.parentNode?.removeChild(trail), 1200 + delay * 1000)
          }

          // 4. 创建闪烁星点（装饰效果）
          if (isDarkMode) {
            for (let i = 0; i < 15; i++) {
              const star = document.createElement('div')
              const angle = Math.random() * Math.PI * 2
              const distance = Math.random() * 200 + 100
              const delay = Math.random() * 0.5

              star.style.cssText = `
                position: fixed;
                left: ${e.clientX}px;
                top: ${e.clientY}px;
                width: 1px;
                height: 1px;
                background: ${color};
                pointer-events: none;
                z-index: 9998;
                animation: fireworkStar 1.8s ease-out ${delay}s forwards;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 3px ${color};
              `

              document.body.appendChild(star)

              const targetX = Math.cos(angle) * distance
              const targetY = Math.sin(angle) * distance

              star.style.setProperty('--target-x', `${targetX}px`)
              star.style.setProperty('--target-y', `${targetY}px`)

              setTimeout(() => star.parentNode?.removeChild(star), 1800 + delay * 1000)
            }
          }
        })
      }

      // 等待页面加载完成后添加特效
      setTimeout(() => {
        createCursorTrail()
        createClickEffect()
      }, 100)
    }
  }
}
