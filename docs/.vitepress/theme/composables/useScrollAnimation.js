import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 滚动动画 composable
 * 基于 Intersection Observer 实现元素进入视口时的动画
 */
export function useScrollAnimation(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    animationClass = 'animate-fade-in-up'
  } = options

  const elements = ref([])
  let observer = null

  function observe(el) {
    if (!el) return
    
    // 初始状态：隐藏
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px)'
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'
    
    elements.value.push(el)
    
    if (observer) {
      observer.observe(el)
    }
  }

  function handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        
        if (triggerOnce) {
          observer.unobserve(el)
        }
      } else if (!triggerOnce) {
        const el = entry.target
        el.style.opacity = '0'
        el.style.transform = 'translateY(30px)'
      }
    })
  }

  onMounted(() => {
    observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin
    })
    
    elements.value.forEach(el => observer.observe(el))
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return { observe }
}
