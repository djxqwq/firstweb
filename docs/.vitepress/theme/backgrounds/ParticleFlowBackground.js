import { BaseBackground } from './BaseBackground.js'

/**
 * 粒子流背景
 * Canvas 2D 实现柔和粒子沿曲线路径流动，鼠标扰动改变流向
 */
export class ParticleFlowBackground extends BaseBackground {
  constructor() {
    super()
    this.particles = []
    this.flowField = []
    this.cols = 0
    this.rows = 0
    this.cellSize = 0
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 根据性能模式调整参数
    const particleCount = this.performanceMode === 'low' ? 200 : 
                          this.performanceMode === 'medium' ? 400 : 600
    this.cellSize = this.performanceMode === 'low' ? 30 : 20
    
    this.cols = Math.ceil(this.width / this.cellSize)
    this.rows = Math.ceil(this.height / this.cellSize)
    
    this.initFlowField()
    this.initParticles(particleCount)
  }

  initFlowField() {
    this.flowField = []
    for (let i = 0; i < this.cols; i++) {
      this.flowField[i] = []
      for (let j = 0; j < this.rows; j++) {
        this.flowField[i][j] = {
          angle: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5
        }
      }
    }
  }

  initParticles(count) {
    this.particles = []
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle())
    }
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: 0,
      vy: 0,
      life: Math.random() * 100 + 50,
      maxLife: 150,
      size: Math.random() * 2 + 1,
      hue: Math.random() * 60 + 180, // 蓝绿色系
      saturation: 70 + Math.random() * 30,
      lightness: 50 + Math.random() * 20
    }
  }

  resize() {
    super.resize()
    this.cols = Math.ceil(this.width / this.cellSize)
    this.rows = Math.ceil(this.height / this.cellSize)
    this.initFlowField()
  }

  handleMouseMove(e) {
    super.handleMouseMove(e)
    
    // 鼠标影响流场
    const mouseCol = Math.floor(this.mouse.x / this.cellSize)
    const mouseRow = Math.floor(this.mouse.y / this.cellSize)
    const radius = 5
    
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        const col = mouseCol + i
        const row = mouseRow + j
        
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
          const dx = this.mouse.x - (col * this.cellSize + this.cellSize / 2)
          const dy = this.mouse.y - (row * this.cellSize + this.cellSize / 2)
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDistance = radius * this.cellSize
          
          if (distance < maxDistance) {
            const influence = 1 - distance / maxDistance
            const angle = Math.atan2(dy, dx) + Math.PI // 反向
            this.flowField[col][row].angle = angle
            this.flowField[col][row].speed = 1 + influence * 2
          }
        }
      }
    }
  }

  render() {
    // 半透明覆盖产生拖尾效果
    this.ctx.fillStyle = 'rgba(10, 15, 30, 0.05)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    const time = Date.now() * 0.0001
    
    // 更新流场（缓慢变化）
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const cell = this.flowField[i][j]
        cell.angle += Math.sin(time + i * 0.1 + j * 0.1) * 0.01
        cell.speed *= 0.99
        cell.speed = Math.max(0.5, cell.speed)
      }
    }
    
    // 更新和绘制粒子
    this.particles.forEach((particle, index) => {
      // 获取当前位置的流场信息
      const col = Math.floor(particle.x / this.cellSize)
      const row = Math.floor(particle.y / this.cellSize)
      
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        const cell = this.flowField[col][row]
        const forceX = Math.cos(cell.angle) * cell.speed
        const forceY = Math.sin(cell.angle) * cell.speed
        
        particle.vx += forceX * 0.1
        particle.vy += forceY * 0.1
      }
      
      // 速度限制
      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
      if (speed > 3) {
        particle.vx = (particle.vx / speed) * 3
        particle.vy = (particle.vy / speed) * 3
      }
      
      // 更新位置
      particle.x += particle.vx
      particle.y += particle.vy
      
      // 速度衰减
      particle.vx *= 0.98
      particle.vy *= 0.98
      
      // 生命周期
      particle.life--
      
      // 边界处理
      if (particle.x < 0) particle.x = this.width
      if (particle.x > this.width) particle.x = 0
      if (particle.y < 0) particle.y = this.height
      if (particle.y > this.height) particle.y = 0
      
      // 绘制粒子
      const lifeRatio = particle.life / particle.maxLife
      const opacity = lifeRatio * 0.8
      
      this.ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${opacity})`
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fill()
      
      // 绘制拖尾
      if (speed > 0.5) {
        this.ctx.strokeStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${opacity * 0.3})`
        this.ctx.lineWidth = particle.size * 0.5
        this.ctx.beginPath()
        this.ctx.moveTo(particle.x, particle.y)
        this.ctx.lineTo(particle.x - particle.vx * 3, particle.y - particle.vy * 3)
        this.ctx.stroke()
      }
      
      // 重置死亡的粒子
      if (particle.life <= 0) {
        this.particles[index] = this.createParticle()
      }
    })
  }
}
