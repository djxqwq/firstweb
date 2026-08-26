<template>
  <div class="interactive-background" ref="containerRef">
    <div class="background-canvas-container" ref="canvasContainer"></div>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getBackgroundManager } from '../backgrounds/BackgroundManager.js'

const props = defineProps({
  background: {
    type: String,
    default: 'fluid'
  },
  enabled: {
    type: Boolean,
    default: true
  }
})

const containerRef = ref(null)
const canvasContainer = ref(null)
const bgManager = getBackgroundManager()

onMounted(() => {
  if (!props.enabled || !canvasContainer.value) return
  
  bgManager.init(canvasContainer.value)
  
  if (props.background) {
    bgManager.activate(props.background)
  }
})

watch(() => props.background, (newBg) => {
  if (!props.enabled) return
  bgManager.activate(newBg)
})

watch(() => props.enabled, (enabled) => {
  if (enabled && props.background) {
    bgManager.activate(props.background)
  } else {
    bgManager.deactivate(props.background)
  }
})

onUnmounted(() => {
  bgManager.destroy()
})
</script>

<style scoped>
.interactive-background {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.background-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.background-canvas-container :deep(canvas) {
  pointer-events: auto;
}
</style>
