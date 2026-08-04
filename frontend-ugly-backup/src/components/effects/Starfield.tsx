/**
 * Three.js Points starfield — adapted from common InstancedMesh/Points demos
 * and McKlay/portfolio-website cosmic layer approach.
 * Ref: https://threejs.org/docs/#api/en/objects/Points
 * Ref: https://github.com/McKlay/portfolio-website
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  enabled?: boolean
  starCount?: number
}

export function Starfield({ enabled = true, starCount = 4500 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !mountRef.current) return

    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.z = 1.2

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const cCyan = new THREE.Color('#22d3ee')
    const cWhite = new THREE.Color('#e2e8f0')
    const cGreen = new THREE.Color('#4ade80')

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      const r = 1.2 + Math.random() * 2.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      const pick = Math.random()
      const col = pick > 0.92 ? cCyan : pick > 0.8 ? cGreen : cWhite
      colors[i3] = col.r
      colors[i3 + 1] = col.g
      colors[i3 + 2] = col.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.012,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const stars = new THREE.Points(geometry, material)
    scene.add(stars)

    // Simple meteor streaks — inspired by three.js particle trail demos
    const meteors: { mesh: THREE.Mesh; life: number; speed: number }[] = []
    const meteorGeo = new THREE.SphereGeometry(0.01, 6, 6)
    const meteorMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' })

    const spawnMeteor = () => {
      const mesh = new THREE.Mesh(meteorGeo, meteorMat.clone())
      mesh.position.set((Math.random() - 0.5) * 3, 1.2 + Math.random(), (Math.random() - 0.5) * 2)
      scene.add(mesh)
      meteors.push({ mesh, life: 1, speed: 0.02 + Math.random() * 0.03 })
    }

    let pointerX = 0
    let pointerY = 0
    const onMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 0.4
      pointerY = (e.clientY / window.innerHeight - 0.5) * 0.3
    }
    const onClick = () => {
      for (let i = 0; i < 4; i++) spawnMeteor()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('click', onClick)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let lastMeteor = 0
    const animate = (t: number) => {
      raf = requestAnimationFrame(animate)
      if (document.hidden) return

      stars.rotation.y += 0.00035
      stars.rotation.x += 0.00012
      stars.rotation.y += pointerX * 0.01
      stars.rotation.x += pointerY * 0.01

      if (t - lastMeteor > 2800) {
        spawnMeteor()
        lastMeteor = t
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.mesh.position.x -= m.speed
        m.mesh.position.y -= m.speed * 0.7
        m.life -= 0.012
        ;(m.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(m.life, 0)
        if (m.life <= 0) {
          scene.remove(m.mesh)
          meteors.splice(i, 1)
        }
      }

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('click', onClick)
      geometry.dispose()
      material.dispose()
      meteorGeo.dispose()
      meteorMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [enabled, starCount])

  if (!enabled) return null

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: 'radial-gradient(ellipse at center, #0a1220 0%, #030712 70%)' }}
    />
  )
}
