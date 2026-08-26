/* ============================================
   背景管理器 - BackgroundManager
   统一管理所有互动背景的注册、销毁、切换
   ============================================ */

export class BackgroundManager {
  constructor() {
    this.backgrounds = new Map()
    this.activeBackground = null
    this.container = null
    this.performanceMode = this.detectPerformanceMode()
  }

  /**
   * 检测设备性能模式
   * @returns {'high'|'medium'|'low'} 性能等级
   */
  detectPerformanceMode() {
    if (typeof window === 'undefined') return 'high'
    
    // 检测硬件并发数
    const cores = navigator.hardwareConcurrency || 2
    // 检测设备内存（如果可用）
    const memory = navigator.deviceMemory || 4
    
    if (cores >= 8 && memory >= 8) return 'high'
    if (cores >= 4 && memory >= 4) return 'medium'
    return 'low'
  }

  /**
   * 初始化背景管理器
   * @param {HTMLElement} container - 背景容器元素
   */
  init(container) {
    this.container = container
    if (!this.container) {
      console.warn('BackgroundManager: 未找到背景容器')
      return
    }
    
    // 创建背景画布容器
    const canvasContainer = document.createElement('div')
    canvasContainer.className = 'background-canvas-container'
    canvasContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    `
    this.container.insertBefore(canvasContainer, this.container.firstChild)
    this.canvasContainer = canvasContainer
  }

  /**
   * 注册背景效果
   * @param {string} name - 背景名称
   * @param {Object} background - 背景实例
   */
  register(name, background) {
    if (this.backgrounds.has(name)) {
      console.warn(`BackgroundManager: 背景 "${name}" 已存在`)
      return
    }
    
    this.backgrounds.set(name, {
      instance: background,
      active: false,
      canvas: null
    })
    
    console.log(`BackgroundManager: 已注册背景 "${name}"`)
  }

  /**
   * 激活指定背景
   * @param {string} name - 背景名称
   */
  async activate(name) {
    const bg = this.backgrounds.get(name)
    if (!bg) {
      console.warn(`BackgroundManager: 未找到背景 "${name}"`)
      return
    }

    // 如果已是当前激活的背景，跳过
    if (this.activeBackground === name) return

    // 停用当前背景
    if (this.activeBackground) {
      await this.deactivate(this.activeBackground)
    }

    // 创建画布
    const canvas = document.createElement('canvas')
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    `
    this.canvasContainer.appendChild(canvas)
    bg.canvas = canvas

    // 初始化并启动背景
    try {
      await bg.instance.init(canvas, {
        performanceMode: this.performanceMode,
        container: this.container
      })
      bg.instance.start()
      bg.active = true
      this.activeBackground = name
      
      // 淡入动画
      canvas.style.opacity = '0'
      canvas.style.transition = 'opacity 0.5s ease-in-out'
      requestAnimationFrame(() => {
        canvas.style.opacity = '1'
      })
      
      console.log(`BackgroundManager: 已激活背景 "${name}"`)
    } catch (error) {
      console.error(`BackgroundManager: 激活背景 "${name}" 失败`, error)
    }
  }

  /**
   * 停用指定背景
   * @param {string} name - 背景名称
   */
  async deactivate(name) {
    const bg = this.backgrounds.get(name)
    if (!bg || !bg.active) return

    // 淡出动画
    if (bg.canvas) {
      bg.canvas.style.opacity = '0'
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    bg.instance.stop()
    bg.instance.destroy()
    
    if (bg.canvas && bg.canvas.parentNode) {
      bg.canvas.parentNode.removeChild(bg.canvas)
    }
    
    bg.active = false
    bg.canvas = null
    
    if (this.activeBackground === name) {
      this.activeBackground = null
    }
    
    console.log(`BackgroundManager: 已停用背景 "${name}"`)
  }

  /**
   * 销毁所有背景
   */
  destroy() {
    for (const [name] of this.backgrounds) {
      this.deactivate(name)
    }
    this.backgrounds.clear()
    
    if (this.canvasContainer && this.canvasContainer.parentNode) {
      this.canvasContainer.parentNode.removeChild(this.canvasContainer)
    }
    
    this.container = null
    this.canvasContainer = null
    this.activeBackground = null
    
    console.log('BackgroundManager: 已销毁')
  }

  /**
   * 获取当前性能模式
   * @returns {'high'|'medium'|'low'}
   */
  getPerformanceMode() {
    return this.performanceMode
  }

  /**
   * 设置性能模式
   * @param {'high'|'medium'|'low'} mode
   */
  setPerformanceMode(mode) {
    this.performanceMode = mode
    // 重新初始化当前激活的背景
    if (this.activeBackground) {
      const currentBg = this.activeBackground
      this.deactivate(currentBg)
      this.activate(currentBg)
    }
  }
}

// 全局单例
let instance = null

export function getBackgroundManager() {
  if (!instance) {
    instance = new BackgroundManager()
  }
  return instance
}
