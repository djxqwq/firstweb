import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 视差滚动 composable
 * 多层视差滚动效果
 */
export function useParallax(options = {}) {
  const {
    layers = [],
    speed = 0.5
  } = options

  const scrollY = ref(0)
  let ticking = false

  function handleScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        scrollY.value = window.scrollY
        updateLayers()
        ticking = false
      })
      ticking = true
    }
  }

  function updateLayers() {
    layers.forEach(layer => {
      const el = typeof layer.el === 'string' ? document.querySelector(layer.el) : layer.el
      if (!el) return
      
      const layerSpeed = layer.speed || speed
      const offset = scrollY.value * layerSpeed
      el.style.transform = `translateY(${offset}px)`
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    updateLayers()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return { scrollY }
}
