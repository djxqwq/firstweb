import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 内容渐显 composable
 * 基于 Intersection Observer 实现内容渐显动画
 */
export function useReveal(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    delay = 0,
    duration = 600
  } = options

  const elementRef = ref(null)
  const isVisible = ref(false)
  let observer = null

  function handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          isVisible.value = true
          if (elementRef.value) {
            elementRef.value.style.opacity = '1'
            elementRef.value.style.transform = 'translateY(0)'
          }
        }, delay)
        
        observer.unobserve(entry.target)
      }
    })
  }

  onMounted(() => {
    if (elementRef.value) {
      elementRef.value.style.opacity = '0'
      elementRef.value.style.transform = 'translateY(20px)'
      elementRef.value.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
      
      observer = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin
      })
      
      observer.observe(elementRef.value)
    }
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return { elementRef, isVisible }
}
