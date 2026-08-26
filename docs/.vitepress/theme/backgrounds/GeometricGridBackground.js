import { BaseBackground } from './BaseBackground.js'

/**
 * 几何网格背景
 * Canvas 2D 实现动态连线网格，鼠标靠近时节点高亮并产生波纹扩散
 */
export class GeometricGridBackground extends BaseBackground {
  constructor() {
    super()
    this.nodes = []
    this.connections = []
    this.ripples = []
    this.gridSize = 0
    this.connectionDistance = 0
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 根据性能模式调整网格密度
    this.gridSize = this.performanceMode === 'low' ? 80 : 
                    this.performanceMode === 'medium' ? 60 : 50
    this.connectionDistance = this.gridSize * 2
    
    this.initGrid()
  }

  initGrid() {
    this.nodes = []
    const cols = Math.ceil(this.width / this.gridSize) + 1
    const rows = Math.ceil(this.height / this.gridSize) + 1
    
    // 创建网格节点
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        this.nodes.push({
          x: i * this.gridSize,
          y: j * this.gridSize,
          baseX: i * this.gridSize,
          baseY: j * this.gridSize,
          vx: 0,
          vy: 0,
          highlight: 0,
          phase: Math.random() * Math.PI * 2
        })
      }
    }
  }

  resize() {
    super.resize()
    this.initGrid()
  }

  handleMouseMove(e) {
    super.handleMouseMove(e)
    
    // 检测鼠标附近的节点
    const mouseRadius = this.gridSize * 3
    this.nodes.forEach(node => {
      const dx = this.mouse.x - node.x
      const dy = this.mouse.y - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < mouseRadius) {
        node.highlight = Math.max(node.highlight, 1 - distance / mouseRadius)
        
        // 添加点击波纹
        if (distance < this.gridSize * 0.5 && this.ripples.length < 5) {
          this.ripples.push({
            x: node.x,
            y: node.y,
            radius: 0,
            maxRadius: this.gridSize * 8,
            opacity: 1
          })
        }
      }
    })
  }

  render() {
    this.clear()
    this.fillBackground('rgba(10, 10, 20, 0.3)')
    
    const time = Date.now() * 0.001
    
    // 更新节点
    this.nodes.forEach(node => {
      // 基础浮动动画
      node.x = node.baseX + Math.sin(time + node.phase) * 2
      node.y = node.baseY + Math.cos(time + node.phase) * 2
      
      // 鼠标排斥效果
      const dx = this.mouse.x - node.x
      const dy = this.mouse.y - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < this.gridSize * 2) {
        const force = (this.gridSize * 2 - distance) / (this.gridSize * 2)
        node.vx -= (dx / distance) * force * 0.5
        node.vy -= (dy / distance) * force * 0.5
      }
      
      // 应用速度
      node.x += node.vx
      node.y += node.vy
      
      // 速度衰减
      node.vx *= 0.9
      node.vy *= 0.9
      
      // 高亮衰减
      node.highlight *= 0.95
    })
    
    // 绘制连接线
    this.ctx.lineWidth = 1
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const node1 = this.nodes[i]
        const node2 = this.nodes[j]
        
        const dx = node1.x - node2.x
        const dy = node1.y - node2.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.connectionDistance) {
          const opacity = (1 - distance / this.connectionDistance) * 0.3
          const highlight = (node1.highlight + node2.highlight) / 2
          
          this.ctx.strokeStyle = `rgba(100, 150, 255, ${opacity + highlight * 0.5})`
          this.ctx.beginPath()
          this.ctx.moveTo(node1.x, node1.y)
          this.ctx.lineTo(node2.x, node2.y)
          this.ctx.stroke()
        }
      }
    }
    
    // 绘制节点
    this.nodes.forEach(node => {
      const size = 2 + node.highlight * 3
      const opacity = 0.5 + node.highlight * 0.5
      
      // 节点光晕
      if (node.highlight > 0.1) {
        const gradient = this.ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, size * 3
        )
        gradient.addColorStop(0, `rgba(100, 150, 255, ${node.highlight * 0.5})`)
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0)')
        
        this.ctx.fillStyle = gradient
        this.ctx.beginPath()
        this.ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2)
        this.ctx.fill()
      }
      
      // 节点本体
      this.ctx.fillStyle = `rgba(150, 200, 255, ${opacity})`
      this.ctx.beginPath()
      this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
      this.ctx.fill()
    })
    
    // 绘制波纹
    this.ripples = this.ripples.filter(ripple => {
      ripple.radius += 3
      ripple.opacity -= 0.02
      
      if (ripple.opacity <= 0) return false
      
      this.ctx.strokeStyle = `rgba(100, 150, 255, ${ripple.opacity})`
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.stroke()
      
      return ripple.radius < ripple.maxRadius
    })
  }
}
