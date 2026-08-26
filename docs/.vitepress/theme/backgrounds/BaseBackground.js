/* ============================================
   背景基类 - BaseBackground
   所有互动背景的基类
   ============================================ */

export class BaseBackground {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.container = null
    this.options = {}
    this.running = false
    this.animationFrameId = null
    this.performanceMode = 'high'
    this.width = 0
    this.height = 0
    this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0 }
  }

  /**
   * 初始化背景
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {Object} options - 配置选项
   */
  async init(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.container = options.container
    this.options = options
    this.performanceMode = options.performanceMode || 'high'
    
    this.resize()
    this.bindEvents()
  }

  /**
   * 调整画布大小
   */
  resize() {
    if (!this.canvas || !this.container) return
    
    const rect = this.container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    // 根据性能模式调整分辨率
    const resolutionScale = this.performanceMode === 'low' ? 0.5 : 
                           this.performanceMode === 'medium' ? 0.75 : 1
    
    this.width = rect.width * resolutionScale
    this.height = rect.height * resolutionScale
    
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    
    if (this.ctx) {
      this.ctx.scale(dpr, dpr)
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    this.handleResize = this.resize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleTouchMove = this.handleTouchMove.bind(this)
    
    window.addEventListener('resize', this.handleResize)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: true })
  }

  /**
   * 解绑事件
   */
  unbindEvents() {
    window.removeEventListener('resize', this.handleResize)
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.handleMouseMove)
      this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    }
  }

  /**
   * 处理鼠标移动
   * @param {MouseEvent} e
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.prevX = this.mouse.x
    this.mouse.prevY = this.mouse.y
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
  }

  /**
   * 处理触摸移动
   * @param {TouchEvent} e
   */
  handleTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.prevX = this.mouse.x
      this.mouse.prevY = this.mouse.y
      this.mouse.x = e.touches[0].clientX - rect.left
      this.mouse.y = e.touches[0].clientY - rect.top
    }
  }

  /**
   * 启动动画
   */
  start() {
    if (this.running) return
    this.running = true
    this.animate()
  }

  /**
   * 停止动画
   */
  stop() {
    this.running = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 销毁背景
   */
  destroy() {
    this.stop()
    this.unbindEvents()
    this.canvas = null
    this.ctx = null
    this.container = null
  }

  /**
   * 动画循环（子类需要实现）
   */
  animate() {
    if (!this.running) return
    
    this.render()
    
    this.animationFrameId = requestAnimationFrame(() => this.animate())
  }

  /**
   * 渲染帧（子类必须实现）
   */
  render() {
    throw new Error('子类必须实现 render 方法')
  }

  /**
   * 清空画布
   */
  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
  }

  /**
   * 填充背景色
   * @param {string} color
   */
  fillBackground(color = 'transparent') {
    if (this.ctx && color !== 'transparent') {
      this.ctx.fillStyle = color
      this.ctx.fillRect(0, 0, this.width, this.height)
    }
  }
}
