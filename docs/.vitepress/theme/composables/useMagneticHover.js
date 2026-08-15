import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 磁性悬浮 composable
 * 元素被鼠标吸引，产生磁性悬浮效果
 */
export function useMagneticHover(options = {}) {
  const {
    strength = 0.3,
    maxDistance = 100,
    scale = 1.05
  } = options

  const elementRef = ref(null)
  let isHovering = false
  let animationFrame = null

  function handleMouseMove(e) {
    if (!elementRef.value) return
    
    const rect = elementRef.value.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < maxDistance + Math.max(rect.width, rect.height) / 2) {
      isHovering = true
      
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      
      animationFrame = requestAnimationFrame(() => {
        const force = Math.max(0, 1 - distance / (maxDistance + Math.max(rect.width, rect.height) / 2))
        const moveX = dx * strength * force
        const moveY = dy * strength * force
        
        elementRef.value.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + (scale - 1) * force})`
        elementRef.value.style.transition = 'transform 0.2s ease-out'
      })
    } else if (isHovering) {
      resetPosition()
    }
  }

  function handleMouseLeave() {
    resetPosition()
  }

  function resetPosition() {
    isHovering = false
    if (elementRef.value) {
      elementRef.value.style.transform = 'translate(0, 0) scale(1)'
      elementRef.value.style.transition = 'transform 0.4s ease-out'
    }
  }

  onMounted(() => {
    if (elementRef.value) {
      elementRef.value.addEventListener('mousemove', handleMouseMove)
      elementRef.value.addEventListener('mouseleave', handleMouseLeave)
    }
  })

  onUnmounted(() => {
    if (elementRef.value) {
      elementRef.value.removeEventListener('mousemove', handleMouseMove)
      elementRef.value.removeEventListener('mouseleave', handleMouseLeave)
    }
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  })

  return { elementRef }
}
