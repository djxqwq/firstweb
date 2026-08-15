import { BaseBackground } from './BaseBackground.js'

/**
 * 金色粒子背景
 * Canvas 2D 实现金色光点缓缓上升，鼠标点击产生扩散波纹
 */
export class GoldenParticleBackground extends BaseBackground {
  constructor() {
    super()
    this.particles = []
    this.ripples = []
    this.sparkles = []
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 根据性能模式调整粒子数量
    const particleCount = this.performanceMode === 'low' ? 50 : 
                          this.performanceMode === 'medium' ? 100 : 150
    
    this.initParticles(particleCount)
    
    // 绑定点击事件
    this.canvas.addEventListener('click', this.handleClick.bind(this))
  }

  initParticles(count) {
    this.particles = []
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle())
    }
  }

  createParticle(startFromBottom = false) {
    return {
      x: Math.random() * this.width,
      y: startFromBottom ? this.height + Math.random() * 100 : Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.3), // 向上移动
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2,
      life: 1.0
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 创建波纹
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 150,
      opacity: 1,
      width: 3
    })
    
    // 创建闪光粒子
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20
      const speed = 2 + Math.random() * 3
      this.sparkles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        opacity: 1,
        life: 1.0
      })
    }
  }

  resize() {
    super.resize()
    this.initParticles(this.particles.length)
  }

  render() {
    // 深色背景
    this.ctx.fillStyle = 'rgba(15, 10, 5, 0.1)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    const time = Date.now() * 0.001
    
    // 更新和绘制粒子
    this.particles.forEach((particle, index) => {
      // 水平摆动
      particle.vx += Math.sin(time + particle.phase) * 0.01
      particle.vx *= 0.99
      
      // 更新位置
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rotation += particle.rotationSpeed
      
      // 闪烁效果
      const flicker = Math.sin(time * 3 + particle.phase) * 0.2 + 0.8
      const currentOpacity = particle.opacity * flicker
      
      // 绘制粒子光晕
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 4
      )
      gradient.addColorStop(0, `rgba(255, 215, 0, ${currentOpacity})`)
      gradient.addColorStop(0.3, `rgba(255, 180, 0, ${currentOpacity * 0.6})`)
      gradient.addColorStop(1, 'rgba(255, 150, 0, 0)')
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2)
      this.ctx.fill()
      
      // 绘制粒子核心
      this.ctx.fillStyle = `rgba(255, 230, 100, ${currentOpacity})`
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fill()
      
      // 边界处理
      if (particle.y < -20) {
        this.particles[index] = this.createParticle(true)
      }
      if (particle.x < -20) particle.x = this.width + 20
      if (particle.x > this.width + 20) particle.x = -20
    })
    
    // 绘制波纹
    this.ripples = this.ripples.filter(ripple => {
      ripple.radius += 4
      ripple.opacity -= 0.02
      ripple.width *= 0.98
      
      if (ripple.opacity <= 0) return false
      
      this.ctx.strokeStyle = `rgba(255, 215, 0, ${ripple.opacity})`
      this.ctx.lineWidth = ripple.width
      this.ctx.beginPath()
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.stroke()
      
      return ripple.radius < ripple.maxRadius
    })
    
    // 绘制闪光粒子
    this.sparkles = this.sparkles.filter(sparkle => {
      sparkle.x += sparkle.vx
      sparkle.y += sparkle.vy
      sparkle.vy += 0.1 // 重力
      sparkle.life -= 0.02
      sparkle.opacity = sparkle.life
      
      if (sparkle.opacity <= 0) return false
      
      this.ctx.fillStyle = `rgba(255, 230, 100, ${sparkle.opacity})`
      this.ctx.beginPath()
      this.ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2)
      this.ctx.fill()
      
      return true
    })
  }

  destroy() {
    super.destroy()
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.handleClick.bind(this))
    }
  }
}
