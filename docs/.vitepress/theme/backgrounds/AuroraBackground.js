import { BaseBackground } from './BaseBackground.js'

/**
 * 极光背景
 * WebGL Shader 实现极光模拟，鼠标移动改变极光颜色和形态
 */
export class AuroraBackground extends BaseBackground {
  constructor() {
    super()
    this.gl = null
    this.program = null
    this.uniforms = {}
    this.startTime = Date.now()
    this.mouseUniform = { x: 0.5, y: 0.5 }
  }

  async init(canvas, options = {}) {
    await super.init(canvas, options)
    
    // 初始化 WebGL
    const params = { alpha: true, antialias: false }
    this.gl = canvas.getContext('webgl', params)
    
    if (!this.gl) {
      console.warn('AuroraBackground: WebGL 不支持')
      return
    }

    this.initShaders()
    this.initBuffers()
  }

  initShaders() {
    const gl = this.gl
    
    // 顶点着色器
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `
    
    // 片段着色器（极光效果）
    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec2 u_resolution;
      
      // 噪声函数
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      // 分形噪声
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }
      
      void main() {
        vec2 uv = v_uv;
        vec2 pos = uv * 2.0 - 1.0;
        pos.x *= u_resolution.x / u_resolution.y;
        
        float time = u_time * 0.3;
        
        // 鼠标影响
        vec2 mouseInfluence = (u_mouse - 0.5) * 0.5;
        
        // 多层极光
        float aurora1 = fbm(pos * 1.5 + vec2(time * 0.2, mouseInfluence.x));
        float aurora2 = fbm(pos * 2.0 + vec2(time * 0.3, -mouseInfluence.y));
        float aurora3 = fbm(pos * 2.5 + vec2(-time * 0.25, mouseInfluence.x * 0.5));
        
        // 垂直渐变（极光通常在上方）
        float verticalGradient = smoothstep(0.3, 0.9, uv.y);
        
        // 极光形状
        float auroraShape = aurora1 * 0.5 + aurora2 * 0.3 + aurora3 * 0.2;
        auroraShape = smoothstep(0.4, 0.8, auroraShape) * verticalGradient;
        
        // 颜色混合
        vec3 color1 = vec3(0.1, 0.8, 0.6); // 青绿色
        vec3 color2 = vec3(0.3, 0.5, 0.9); // 蓝色
        vec3 color3 = vec3(0.6, 0.3, 0.8); // 紫色
        
        float colorMix1 = sin(time * 0.5 + aurora1 * 3.0) * 0.5 + 0.5;
        float colorMix2 = cos(time * 0.4 + aurora2 * 2.0) * 0.5 + 0.5;
        
        vec3 auroraColor = mix(color1, color2, colorMix1);
        auroraColor = mix(auroraColor, color3, colorMix2 * 0.5);
        
        // 背景色（深色）
        vec3 bgColor = vec3(0.02, 0.02, 0.08);
        
        // 混合极光和背景
        vec3 finalColor = mix(bgColor, auroraColor, auroraShape * 0.8);
        
        // 添加一些星星
        float stars = step(0.998, hash(floor(uv * 200.0)));
        finalColor += stars * 0.3;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
    
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    
    this.program = gl.createProgram()
    gl.attachShader(this.program, vertexShader)
    gl.attachShader(this.program, fragmentShader)
    gl.linkProgram(this.program)
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program 链接错误:', gl.getProgramInfoLog(this.program))
    }
    
    // 获取 uniform 位置
    this.uniforms.time = gl.getUniformLocation(this.program, 'u_time')
    this.uniforms.mouse = gl.getUniformLocation(this.program, 'u_mouse')
    this.uniforms.resolution = gl.getUniformLocation(this.program, 'u_resolution')
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

  initBuffers() {
    const gl = this.gl
    
    // 创建全屏四边形
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ])
    
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    
    const positionLocation = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  }

  handleMouseMove(e) {
    super.handleMouseMove(e)
    this.mouseUniform.x = this.mouse.x / this.width
    this.mouseUniform.y = 1.0 - (this.mouse.y / this.height)
  }

  render() {
    const gl = this.gl
    if (!gl) return
    
    gl.viewport(0, 0, this.width, this.height)
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    gl.useProgram(this.program)
    
    // 更新 uniforms
    const time = (Date.now() - this.startTime) * 0.001
    gl.uniform1f(this.uniforms.time, time)
    gl.uniform2f(this.uniforms.mouse, this.mouseUniform.x, this.mouseUniform.y)
    gl.uniform2f(this.uniforms.resolution, this.width, this.height)
    
    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  destroy() {
    super.destroy()
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
  }
}
