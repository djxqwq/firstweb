import { BaseBackground } from './BaseBackground.js'

/**
 * 水波纹背景
 * Canvas 2D 实现水波纹效果，鼠标移动产生涟漪扩散
 */
export class RippleBackground extends BaseBackground {
  constructor() {
    super()
    this.ripples = []
    this.lastRippleTime = 0
    this.rippleInterval = 100 // 毫秒
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 创建初始波纹
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.addRipple(
          Math.random() * this.width,
          Math.random() * this.height,
          0.3
        )
      }, i * 500)
    }
  }

  handleMouseMove(e) {
    super.handleMouseMove(e)
    
    const now = Date.now()
    if (now - this.lastRippleTime > this.rippleInterval) {
      this.addRipple(this.mouse.x, this.mouse.y, 0.5)
      this.lastRippleTime = now
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    this.addRipple(x, y, 1.0)
  }

  addRipple(x, y, intensity = 1.0) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 200 * intensity,
      opacity: 0.8 * intensity,
      width: 3 * intensity,
      speed: 2 + intensity * 2,
      life: 1.0
    })
    
    // 限制波纹数量
    if (this.ripples.length > 20) {
      this.ripples.shift()
    }
  }

  render() {
    // 深色背景
    this.ctx.fillStyle = 'rgba(5, 15, 30, 0.15)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制水波纹
    this.ripples = this.ripples.filter(ripple => {
      ripple.radius += ripple.speed
      ripple.life -= 0.01
      ripple.opacity = ripple.life * 0.8
      ripple.width *= 0.99
      
      if (ripple.opacity <= 0 || ripple.radius >= ripple.maxRadius) {
        return false
      }
      
      // 绘制多层波纹
      for (let i = 0; i < 3; i++) {
        const offset = i * 10
        const currentRadius = ripple.radius - offset
        
        if (currentRadius <= 0) continue
        
        const opacity = ripple.opacity * (1 - i * 0.3)
        
        // 波纹渐变
        const gradient = this.ctx.createRadialGradient(
          ripple.x, ripple.y, currentRadius - 2,
          ripple.x, ripple.y, currentRadius + 2
        )
        gradient.addColorStop(0, `rgba(100, 180, 255, 0)`)
        gradient.addColorStop(0.5, `rgba(100, 180, 255, ${opacity})`)
        gradient.addColorStop(1, `rgba(100, 180, 255, 0)`)
        
        this.ctx.strokeStyle = gradient
        this.ctx.lineWidth = ripple.width
        this.ctx.beginPath()
        this.ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2)
        this.ctx.stroke()
      }
      
      // 绘制中心光点
      if (ripple.life > 0.8) {
        const centerOpacity = (ripple.life - 0.8) * 5
        const centerGradient = this.ctx.createRadialGradient(
          ripple.x, ripple.y, 0,
          ripple.x, ripple.y, 10
        )
        centerGradient.addColorStop(0, `rgba(150, 220, 255, ${centerOpacity})`)
        centerGradient.addColorStop(1, 'rgba(150, 220, 255, 0)')
        
        this.ctx.fillStyle = centerGradient
        this.ctx.beginPath()
        this.ctx.arc(ripple.x, ripple.y, 10, 0, Math.PI * 2)
        this.ctx.fill()
      }
      
      return true
    })
    
    // 绘制背景网格（模拟水面）
    this.drawWaterGrid()
  }

  drawWaterGrid() {
    const gridSize = 40
    const time = Date.now() * 0.001
    
    this.ctx.strokeStyle = 'rgba(50, 100, 150, 0.1)'
    this.ctx.lineWidth = 1
    
    // 垂直线
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath()
      for (let y = 0; y < this.height; y += 5) {
        // 波纹影响
        let offsetX = 0
        this.ripples.forEach(ripple => {
          const dx = x - ripple.x
          const dy = y - ripple.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (Math.abs(distance - ripple.radius) < 20) {
            const wave = Math.sin((distance - ripple.radius) * 0.5) * ripple.opacity
            offsetX += wave * 5
          }
        })
        
        const waveX = Math.sin(time + y * 0.01) * 2 + offsetX
        
        if (y === 0) {
          this.ctx.moveTo(x + waveX, y)
        } else {
          this.ctx.lineTo(x + waveX, y)
        }
      }
      this.ctx.stroke()
    }
    
    // 水平线
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath()
      for (let x = 0; x < this.width; x += 5) {
        // 波纹影响
        let offsetY = 0
        this.ripples.forEach(ripple => {
          const dx = x - ripple.x
          const dy = y - ripple.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (Math.abs(distance - ripple.radius) < 20) {
            const wave = Math.sin((distance - ripple.radius) * 0.5) * ripple.opacity
            offsetY += wave * 5
          }
        })
        
        const waveY = Math.sin(time + x * 0.01) * 2 + offsetY
        
        if (x === 0) {
          this.ctx.moveTo(x, y + waveY)
        } else {
          this.ctx.lineTo(x, y + waveY)
        }
      }
      this.ctx.stroke()
    }
  }

  destroy() {
    super.destroy()
    this.ripples = []
  }
}
