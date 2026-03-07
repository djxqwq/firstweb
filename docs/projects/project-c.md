# 🔥 浓烟环境人体目标判别系统

<div class="project-meta">
  <div class="project-links">
    <a href="https://github.com/djxqwq" target="_blank" class="project-link">📦 GitHub</a>
    <a href="#" target="_blank" class="project-link">📝 技术报告</a>
  </div>
  <div class="project-tags">
    <span class="tag">Python</span>
    <span class="tag">OpenCV</span>
    <span class="tag">YOLOv5</span>
    <span class="tag">PyTorch</span>
  </div>
</div>

## 项目简介

聚焦火灾救援痛点开发智能判别系统，辅助消防机器人定位被困人员；基于 Python 搭建框架，通过 OpenCV 预处理烟雾图像，集成 YOLOv5 并基于 PyTorch/CUDA 优化推理性能，设计多线程架构保障运行效率。

## 核心功能

- 🔍 **目标检测**: 在浓烟环境中识别人体目标
- 🎯 **精准定位**: 实时定位被困人员位置
- ⚡ **实时处理**: 多线程架构保障实时性
- � **可视化**: 检测结果可视化展示
- 🚀 **性能优化**: GPU加速推理
- 🌫️ **烟雾适应**: 专门针对烟雾环境优化

## 技术栈

### 核心技术
- **深度学习框架**: PyTorch + CUDA
- **目标检测**: YOLOv5
- **图像处理**: OpenCV
- **开发语言**: Python 3.8+

### 硬件支持
- **GPU**: NVIDIA CUDA 支持
- **内存**: 16GB+ RAM
- **存储**: SSD 优化数据读取

## 项目架构

```
project-c/
├── src/
│   ├── components/     # UI 组件
│   ├── utils/         # 工具函数
│   ├── types/         # TypeScript 类型定义
│   └── styles/        # 样式文件
├── docs/              # 文档
├── tests/             # 测试文件
└── examples/          # 示例代码
```

## 主要特性

### 1. 组件库
- Button、Input、Modal 等基础组件
- Form、Table、Chart 等复杂组件
- 支持主题定制和样式覆盖

### 2. 工具函数
- 字符串处理、数组操作、日期处理
- 数据验证、格式化、转换
- DOM 操作、事件处理

### 3. 开发体验
- TypeScript 类型提示
- 热更新开发环境
- 自动化测试和代码检查

## 安装使用

```bash
npm install project-c
```

```typescript
import { Button, formatDate } from 'project-c'

// 使用组件
<Button onClick={() => console.log('clicked')}>Click me</Button>

// 使用工具函数
const date = formatDate(new Date(), 'YYYY-MM-DD')
```

## 性能指标

- 📦 **打包体积**: 核心库仅 15KB（gzipped）
- ⚡ **构建速度**: Vite 构建，毫秒级热更新
- 🧪 **测试覆盖率**: 95%+ 代码覆盖率
- 📈 **下载量**: npm 周下载量 1000+

## 项目亮点

1. **完全 TypeScript**: 类型安全，开发体验优秀
2. **模块化设计**: 支持按需引入，减少无用代码
3. **性能优化**: 基于 Vite 的极速构建和热更新
4. **文档完善**: 详细的 API 文档和使用示例
5. **测试覆盖**: 完整的单元测试和集成测试

## 未来规划

- [ ] 添加更多组件和工具函数
- [ ] 支持移动端适配
- [ ] 国际化支持
- [ ] 主题系统完善

---

## 📊 项目数据

- **开发周期**: 3 个月
- **代码行数**: 5000+
- **测试用例**: 200+
- **文档页面**: 50+
- **GitHub Stars**: 50+
- **npm 下载量**: 1000+/周
