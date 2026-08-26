import { BaseBackground } from './BaseBackground.js'

/**
 * WebGL 流体背景
 * 基于 Navier-Stokes 方程的简化流体模拟
 * 鼠标移动产生流体扰动和色彩变化
 */
export class FluidBackground extends BaseBackground {
  constructor() {
    super()
    this.gl = null
    this.programs = {}
    this.framebuffers = {}
    this.pointers = []
    this.config = {}
    this.lastTime = Date.now()
    this.colorUpdateTimer = 0
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // WebGL 配置
    this.config = {
      SIM_RESOLUTION: this.performanceMode === 'low' ? 64 : 128,
      DYE_RESOLUTION: this.performanceMode === 'low' ? 512 : 1024,
      DENSITY_DISSIPATION: 1.0,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      BACK_COLOR: { r: 0.05, g: 0.05, b: 0.1 },
      TRANSPARENT: false,
    }

    // 初始化 WebGL
    const params = { alpha: true, depth: false, antialias: false, preserveDrawingBuffer: false }
    this.gl = canvas.getContext('webgl2', params) || canvas.getContext('webgl', params)
    
    if (!this.gl) {
      console.warn('FluidBackground: WebGL 不支持')
      return
    }

    // 如果是 WebGL2，获取扩展
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext
    if (isWebGL2) {
      this.gl.getExtension('EXT_color_buffer_float')
      this.gl.getExtension('OES_texture_float_linear')
    } else {
      this.gl.getExtension('OES_texture_half_float')
      this.gl.getExtension('OES_texture_half_float_linear')
    }

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)

    // 初始化指针
    this.pointers.push(this.createPointer())

    // 编译着色器
    this.initShaders()
    this.initFramebuffers()

    // 绑定事件
    this.bindFluidEvents()
  }

  createPointer() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: [0.5, 0.5, 0.5]
    }
  }

  initShaders() {
    const gl = this.gl

    // 基础着色器
    const baseVertexShader = this.compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `)

    // 拷贝着色器
    const copyShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `)
    this.programs.copy = this.createProgram(baseVertexShader, copyShader)

    // 清除着色器
    const clearShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `)
    this.programs.clear = this.createProgram(baseVertexShader, clearShader)

    // 显示着色器
    const displayShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
      }
    `)
    this.programs.display = this.createProgram(baseVertexShader, displayShader)

    // 溅射着色器
    const splatShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `)
    this.programs.splat = this.createProgram(baseVertexShader, splatShader)

    // 吸附着色器
    const advectionShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
    `)
    this.programs.advection = this.createProgram(baseVertexShader, advectionShader)

    // 散度着色器
    const divergenceShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `)
    this.programs.divergence = this.createProgram(baseVertexShader, divergenceShader)

    // 压力着色器
    const pressureShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `)
    this.programs.pressure = this.createProgram(baseVertexShader, pressureShader)

    // 梯度着色器
    const gradientSubtractShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `)
    this.programs.gradientSubtract = this.createProgram(baseVertexShader, gradientSubtractShader)

    // 涡度着色器
    const vorticityShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `)
    this.programs.vorticity = this.createProgram(baseVertexShader, vorticityShader)

    // 涡度力着色器
    const vorticityForceShader = this.compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uVorticity;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uVorticity, vL).x;
        float R = texture2D(uVorticity, vR).x;
        float T = texture2D(uVorticity, vT).x;
        float B = texture2D(uVorticity, vB).x;
        float C = texture2D(uVorticity, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `)
    this.programs.vorticityForce = this.createProgram(baseVertexShader, vorticityForceShader)
  }

  compileShader(type, source) {
    const gl = this.gl
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader 编译错误:', gl.getShaderInfoLog(shader))
    }
    
    return shader
  }

  createProgram(vertexShader, fragmentShader) {
    const gl = this.gl
    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program 链接错误:', gl.getProgramInfoLog(program))
    }
    
    const uniforms = this.getUniforms(program)
    return { program, uniforms }
  }

  getUniforms(program) {
    const gl = this.gl
    const uniforms = {}
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    
    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(program, i).name
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName)
    }
    
    return uniforms
  }

  initFramebuffers() {
    const gl = this.gl
    
    // 创建帧缓冲
    this.framebuffers.dye = this.createDoubleFBO(
      this.config.DYE_RESOLUTION,
      this.config.DYE_RESOLUTION,
      gl.RGBA,
      gl.RGBA,
      this.getHalfFloatType()
    )
    
    this.framebuffers.velocity = this.createDoubleFBO(
      this.config.SIM_RESOLUTION,
      this.config.SIM_RESOLUTION,
      gl.RGBA,
      gl.RGBA,
      this.getHalfFloatType()
    )
    
    this.framebuffers.pressure = this.createDoubleFBO(
      this.config.SIM_RESOLUTION,
      this.config.SIM_RESOLUTION,
      gl.RGBA,
      gl.RGBA,
      this.getHalfFloatType()
    )
    
    this.framebuffers.divergence = this.createFBO(
      this.config.SIM_RESOLUTION,
      this.config.SIM_RESOLUTION,
      gl.RGBA,
      gl.RGBA,
      this.getHalfFloatType()
    )
    
    this.framebuffers.vorticity = this.createFBO(
      this.config.SIM_RESOLUTION,
      this.config.SIM_RESOLUTION,
      gl.RGBA,
      gl.RGBA,
      this.getHalfFloatType()
    )
  }

  getHalfFloatType() {
    const gl = this.gl
    if (this.gl instanceof WebGL2RenderingContext) {
      return gl.HALF_FLOAT
    }
    return gl.getExtension('OES_texture_half_float').HALF_FLOAT_OES
  }

  createFBO(w, h, internalFormat, format, type) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
    
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, w, h)
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    return {
      texture,
      fbo,
      width: w,
      height: h,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        return id
      }
    }
  }

  createDoubleFBO(w, h, internalFormat, format, type) {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type)
    let fbo2 = this.createFBO(w, h, internalFormat, format, type)
    
    return {
      width: w,
      height: h,
      texelSizeX: 1.0 / w,
      texelSizeY: 1.0 / h,
      get read() { return fbo1 },
      set read(value) { fbo1 = value },
      get write() { return fbo2 },
      set write(value) { fbo2 = value },
      swap() {
        const temp = fbo1
        fbo1 = fbo2
        fbo2 = temp
      }
    }
  }

  bindFluidEvents() {
    const canvas = this.canvas
    canvas.addEventListener('mousedown', (e) => {
      const pointer = this.pointers[0]
      const rect = canvas.getBoundingClientRect()
      const posX = (e.clientX - rect.left) / rect.width
      const posY = 1.0 - (e.clientY - rect.top) / rect.height
      pointer.down = true
      pointer.color = this.generateColor()
      pointer.moved = true
      pointer.texcoordX = posX
      pointer.texcoordY = posY
      pointer.prevTexcoordX = posX
      pointer.prevTexcoordY = posY
    })
    
    canvas.addEventListener('mousemove', (e) => {
      const pointer = this.pointers[0]
      const rect = canvas.getBoundingClientRect()
      const posX = (e.clientX - rect.left) / rect.width
      const posY = 1.0 - (e.clientY - rect.top) / rect.height
      pointer.moved = true
      pointer.texcoordX = posX
      pointer.texcoordY = posY
      if (!pointer.down) {
        pointer.color = this.generateColor()
      }
    })
    
    window.addEventListener('mouseup', () => {
      this.pointers[0].down = false
    })
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touches = e.targetTouches
      const rect = canvas.getBoundingClientRect()
      for (let i = 0; i < touches.length; i++) {
        const posX = (touches[i].clientX - rect.left) / rect.width
        const posY = 1.0 - (touches[i].clientY - rect.top) / rect.height
        if (i >= this.pointers.length) {
          this.pointers.push(this.createPointer())
        }
        const pointer = this.pointers[i]
        pointer.id = touches[i].identifier
        pointer.down = true
        pointer.color = this.generateColor()
        pointer.moved = true
        pointer.texcoordX = posX
        pointer.texcoordY = posY
        pointer.prevTexcoordX = posX
        pointer.prevTexcoordY = posY
      }
    })
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touches = e.targetTouches
      const rect = canvas.getBoundingClientRect()
      for (let i = 0; i < touches.length; i++) {
        const pointer = this.pointers[i]
        if (!pointer) continue
        const posX = (touches[i].clientX - rect.left) / rect.width
        const posY = 1.0 - (touches[i].clientY - rect.top) / rect.height
        pointer.moved = true
        pointer.texcoordX = posX
        pointer.texcoordY = posY
      }
    })
    
    canvas.addEventListener('touchend', (e) => {
      const touches = e.changedTouches
      for (let i = 0; i < touches.length; i++) {
        const pointer = this.pointers.find(p => p.id === touches[i].identifier)
        if (pointer) {
          pointer.down = false
        }
      }
    })
  }

  generateColor() {
    const c = HSVtoRGB(Math.random(), 1.0, 1.0)
    c.r *= 0.15
    c.g *= 0.15
    c.b *= 0.15
    return [c.r, c.g, c.b]
  }

  render() {
    const gl = this.gl
    if (!gl) return
    
    const dt = this.calcDeltaTime()
    
    // 更新颜色
    this.colorUpdateTimer += dt
    if (this.colorUpdateTimer >= 1 / this.config.COLOR_UPDATE_SPEED) {
      this.colorUpdateTimer = 0
      this.pointers.forEach(p => {
        if (!p.down) {
          p.color = this.generateColor()
        }
      })
    }
    
    // 应用输入
    this.applyInputs()
    
    // 模拟步骤
    this.step(dt)
    
    // 渲染到屏幕
    this.renderToScreen()
  }

  calcDeltaTime() {
    const now = Date.now()
    let dt = (now - this.lastTime) / 1000
    dt = Math.min(dt, 0.016666)
    this.lastTime = now
    return dt
  }

  applyInputs() {
    const splatStack = []
    this.pointers.forEach(pointer => {
      if (pointer.moved) {
        pointer.moved = false
        const dx = (pointer.texcoordX - pointer.prevTexcoordX) * this.config.SPLAT_FORCE
        const dy = (pointer.texcoordY - pointer.prevTexcoordY) * this.config.SPLAT_FORCE
        splatStack.push({
          x: pointer.texcoordX,
          y: pointer.texcoordY,
          dx,
          dy,
          color: pointer.color
        })
      }
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
    })
    
    splatStack.forEach(s => {
      this.splat(s.x, s.y, s.dx, s.dy, s.color)
    })
  }

  splat(x, y, dx, dy, color) {
    const gl = this.gl
    const program = this.programs.splat
    
    gl.useProgram(program.program)
    
    // 溅射速度
    gl.uniform1i(program.uniforms.uTarget, this.framebuffers.velocity.read.attach(0))
    gl.uniform1f(program.uniforms.aspectRatio, this.canvas.width / this.canvas.height)
    gl.uniform2f(program.uniforms.point, x, y)
    gl.uniform3f(program.uniforms.color, dx, dy, 0.0)
    gl.uniform1f(program.uniforms.radius, this.correctRadius(this.config.SPLAT_RADIUS / 100.0))
    this.blit(this.framebuffers.velocity.write)
    this.framebuffers.velocity.swap()
    
    // 溅射染料
    gl.uniform1i(program.uniforms.uTarget, this.framebuffers.dye.read.attach(0))
    gl.uniform3f(program.uniforms.color, color[0], color[1], color[2])
    this.blit(this.framebuffers.dye.write)
    this.framebuffers.dye.swap()
  }

  correctRadius(radius) {
    const aspectRatio = this.canvas.width / this.canvas.height
    if (aspectRatio > 1) {
      radius *= aspectRatio
    }
    return radius
  }

  step(dt) {
    const gl = this.gl
    
    // 涡度
    gl.useProgram(this.programs.vorticity.program)
    gl.uniform1i(this.programs.vorticity.uniforms.uVelocity, this.framebuffers.velocity.read.attach(0))
    this.blit(this.framebuffers.vorticity)
    
    // 涡度力
    gl.useProgram(this.programs.vorticityForce.program)
    gl.uniform1i(this.programs.vorticityForce.uniforms.uVelocity, this.framebuffers.velocity.read.attach(0))
    gl.uniform1i(this.programs.vorticityForce.uniforms.uVorticity, this.framebuffers.vorticity.attach(1))
    gl.uniform1f(this.programs.vorticityForce.uniforms.curl, this.config.CURL)
    gl.uniform1f(this.programs.vorticityForce.uniforms.dt, dt)
    this.blit(this.framebuffers.velocity.write)
    this.framebuffers.velocity.swap()
    
    // 吸附速度
    gl.useProgram(this.programs.advection.program)
    gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.framebuffers.velocity.read.attach(0))
    gl.uniform1i(this.programs.advection.uniforms.uSource, this.framebuffers.velocity.read.attach(0))
    gl.uniform2f(this.programs.advection.uniforms.texelSize, 
      this.framebuffers.velocity.texelSizeX, 
      this.framebuffers.velocity.texelSizeY)
    gl.uniform2f(this.programs.advection.uniforms.dyeTexelSize, 
      this.framebuffers.velocity.texelSizeX, 
      this.framebuffers.velocity.texelSizeY)
    gl.uniform1f(this.programs.advection.uniforms.dt, dt)
    gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.VELOCITY_DISSIPATION)
    this.blit(this.framebuffers.velocity.write)
    this.framebuffers.velocity.swap()
    
    // 吸附染料
    gl.useProgram(this.programs.advection.program)
    gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.framebuffers.velocity.read.attach(0))
    gl.uniform1i(this.programs.advection.uniforms.uSource, this.framebuffers.dye.read.attach(1))
    gl.uniform2f(this.programs.advection.uniforms.dyeTexelSize, 
      1.0 / this.config.DYE_RESOLUTION, 
      1.0 / this.config.DYE_RESOLUTION)
    gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.DENSITY_DISSIPATION)
    this.blit(this.framebuffers.dye.write)
    this.framebuffers.dye.swap()
    
    // 计算散度
    gl.useProgram(this.programs.divergence.program)
    gl.uniform1i(this.programs.divergence.uniforms.uVelocity, this.framebuffers.velocity.read.attach(0))
    gl.uniform2f(this.programs.divergence.uniforms.texelSize, 
      this.framebuffers.velocity.texelSizeX, 
      this.framebuffers.velocity.texelSizeY)
    this.blit(this.framebuffers.divergence)
    
    // 清除压力
    gl.useProgram(this.programs.clear.program)
    gl.uniform1i(this.programs.clear.uniforms.uTexture, this.framebuffers.pressure.read.attach(0))
    gl.uniform1f(this.programs.clear.uniforms.value, this.config.PRESSURE)
    this.blit(this.framebuffers.pressure.write)
    this.framebuffers.pressure.swap()
    
    // 压力求解
    gl.useProgram(this.programs.pressure.program)
    gl.uniform1i(this.programs.pressure.uniforms.uDivergence, this.framebuffers.divergence.attach(0))
    gl.uniform2f(this.programs.pressure.uniforms.texelSize, 
      this.framebuffers.velocity.texelSizeX, 
      this.framebuffers.velocity.texelSizeY)
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(this.programs.pressure.uniforms.uPressure, this.framebuffers.pressure.read.attach(1))
      this.blit(this.framebuffers.pressure.write)
      this.framebuffers.pressure.swap()
    }
    
    // 梯度减去压力
    gl.useProgram(this.programs.gradientSubtract.program)
    gl.uniform1i(this.programs.gradientSubtract.uniforms.uPressure, this.framebuffers.pressure.read.attach(0))
    gl.uniform1i(this.programs.gradientSubtract.uniforms.uVelocity, this.framebuffers.velocity.read.attach(1))
    gl.uniform2f(this.programs.gradientSubtract.uniforms.texelSize, 
      this.framebuffers.velocity.texelSizeX, 
      this.framebuffers.velocity.texelSizeY)
    this.blit(this.framebuffers.velocity.write)
    this.framebuffers.velocity.swap()
  }

  blit(target) {
    const gl = this.gl
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.viewport(0, 0, target.width, target.height)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  renderToScreen() {
    const gl = this.gl
    gl.useProgram(this.programs.display.program)
    gl.uniform1i(this.programs.display.uniforms.uTexture, this.framebuffers.dye.read.attach(0))
    this.blit(null)
  }

  destroy() {
    super.destroy()
    if (this.gl) {
      // 清理 WebGL 资源
      Object.values(this.programs).forEach(p => {
        if (p.program) this.gl.deleteProgram(p.program)
      })
      Object.values(this.framebuffers).forEach(fb => {
        if (fb.read) {
          this.gl.deleteTexture(fb.read.texture)
          this.gl.deleteFramebuffer(fb.read.fbo)
        }
        if (fb.write) {
          this.gl.deleteTexture(fb.write.texture)
          this.gl.deleteFramebuffer(fb.write.fbo)
        }
        if (fb.texture) this.gl.deleteTexture(fb.texture)
        if (fb.fbo) this.gl.deleteFramebuffer(fb.fbo)
      })
    }
  }
}

function HSVtoRGB(h, s, v) {
  let r, g, b
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  
  return { r, g, b }
}
