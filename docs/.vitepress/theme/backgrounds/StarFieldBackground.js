import { BaseBackground } from './BaseBackground.js'

/**
 * 3D 粒子星空背景
 * 使用 Three.js 实现 3D 粒子系统，支持鼠标视差和引力效果
 */
export class StarFieldBackground extends BaseBackground {
  constructor() {
    super()
    this.scene = null
    this.camera = null
    this.renderer = null
    this.particles = null
    this.particleCount = 0
    this.mouseInfluence = { x: 0, y: 0 }
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 动态导入 Three.js
    const THREE = await import('three')
    
    // 根据性能模式调整粒子数量
    this.particleCount = this.performanceMode === 'low' ? 2000 : 
                         this.performanceMode === 'medium' ? 5000 : 10000
    
    // 初始化 Three.js 场景
    this.scene = new THREE.Scene()
    
    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 50
    
    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: this.performanceMode === 'high'
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    
    // 创建粒子系统
    this.createParticles(THREE)
  }

  createParticles(THREE) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.particleCount * 3)
    const colors = new Float32Array(this.particleCount * 3)
    const sizes = new Float32Array(this.particleCount)
    const velocities = new Float32Array(this.particleCount * 3)
    
    // 生成粒子
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      // 位置（球形分布）
      const radius = 100 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)
      
      // 颜色（蓝白色系）
      const colorChoice = Math.random()
      if (colorChoice < 0.6) {
        // 蓝色
        colors[i3] = 0.4 + Math.random() * 0.2
        colors[i3 + 1] = 0.6 + Math.random() * 0.2
        colors[i3 + 2] = 1.0
      } else if (colorChoice < 0.9) {
        // 白色
        colors[i3] = 0.9 + Math.random() * 0.1
        colors[i3 + 1] = 0.9 + Math.random() * 0.1
        colors[i3 + 2] = 1.0
      } else {
        // 紫色
        colors[i3] = 0.7 + Math.random() * 0.2
        colors[i3 + 1] = 0.4 + Math.random() * 0.2
        colors[i3 + 2] = 1.0
      }
      
      // 大小
      sizes[i] = Math.random() * 2 + 0.5
      
      // 速度（缓慢漂移）
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.userData.velocities = velocities
    
    // 创建材质
    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
    
    // 创建粒子系统
    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  resize() {
    super.resize()
    
    if (this.camera && this.renderer) {
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
    }
  }

  handleMouseMove(e) {
    super.handleMouseMove(e)
    
    // 计算鼠标影响
    const centerX = this.width / 2
    const centerY = this.height / 2
    this.mouseInfluence.x = (this.mouse.x - centerX) / centerX
    this.mouseInfluence.y = (this.mouse.y - centerY) / centerY
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return
    
    const THREE = window.THREE || require('three')
    const positions = this.particles.geometry.attributes.position.array
    const velocities = this.particles.geometry.userData.velocities
    const sizes = this.particles.geometry.attributes.size.array
    
    // 更新粒子位置和大小
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      // 基础移动
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
      
      // 鼠标引力效果
      const dx = this.mouse.x - (this.width / 2 + positions[i3])
      const dy = this.mouse.y - (this.height / 2 - positions[i3 + 1])
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 200) {
        const force = (200 - distance) / 200 * 0.01
        velocities[i3] += dx * force * 0.001
        velocities[i3 + 1] -= dy * force * 0.001
      }
      
      // 速度衰减
      velocities[i3] *= 0.99
      velocities[i3 + 1] *= 0.99
      velocities[i3 + 2] *= 0.99
      
      // 闪烁效果
      sizes[i] = (Math.sin(Date.now() * 0.001 + i) + 1) * 0.5 + 0.5
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true
    this.particles.geometry.attributes.size.needsUpdate = true
    
    // 鼠标视差效果
    this.camera.position.x += (this.mouseInfluence.x * 10 - this.camera.position.x) * 0.05
    this.camera.position.y += (-this.mouseInfluence.y * 10 - this.camera.position.y) * 0.05
    this.camera.lookAt(this.scene.position)
    
    // 缓慢旋转
    this.particles.rotation.y += 0.0005
    
    this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    super.destroy()
    
    if (this.renderer) {
      this.renderer.dispose()
    }
    
    if (this.particles) {
      this.particles.geometry.dispose()
      this.particles.material.dispose()
    }
  }
}
