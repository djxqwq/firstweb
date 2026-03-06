import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 添加鼠标拖尾特效
    if (typeof window !== 'undefined') {
      const createCursorTrail = () => {
        const trail = document.createElement('div')
        trail.className = 'cursor-trail'
        document.body.appendChild(trail)

        let mouseX = 0, mouseY = 0
        let currentX = 0, currentY = 0

        const updateTrail = () => {
          currentX += (mouseX - currentX) * 0.1
          currentY += (mouseY - currentY) * 0.1
          
          trail.style.left = currentX + 'px'
          trail.style.top = currentY + 'px'
          
          requestAnimationFrame(updateTrail)
        }

        document.addEventListener('mousemove', (e) => {
          mouseX = e.clientX
          mouseY = e.clientY
        })

        updateTrail()
      }

      // 等待页面加载完成后添加特效
      setTimeout(createCursorTrail, 100)
    }
  }
}
