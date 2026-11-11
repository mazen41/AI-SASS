'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface StudioCanvas3DProps {
  variant?: 'hero' | 'auth' | 'admin';
  className?: string;
}

export default function StudioCanvas3D({
  variant = 'hero',
  className = '',
}: StudioCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === 'undefined') return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const width = mount.clientWidth || 400;
    const height = mount.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.z = variant === 'hero' ? 6 : variant === 'auth' ? 5 : 4.5;

    // 3. Renderer with performance constraints
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // 4. Lighting in NazStudio Brand Palette
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Primary Neon Blue / Cyan Light
    const cyanLight = new THREE.PointLight(0x22d3ee, 2.5, 15);
    cyanLight.position.set(3, 4, 3);
    scene.add(cyanLight);

    // Accent Purple / Pink Light
    const pinkLight = new THREE.PointLight(0xff2e93, 2.0, 15);
    pinkLight.position.set(-3, -3, 2);
    scene.add(pinkLight);

    // 5. Meshes according to variant
    const group = new THREE.Group();
    scene.add(group);

    const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];

    if (variant === 'hero') {
      // Hero: Floating crystal core + orbiting celestial rings
      const crystalGeo = new THREE.IcosahedronGeometry(1.4, 0);
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x1e90ff,
        metalness: 0.15,
        roughness: 0.2,
        transmission: 0.6,
        thickness: 1.2,
        transparent: true,
        opacity: 0.88,
        wireframe: false,
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      group.add(crystalMesh);
      disposables.push({ geometry: crystalGeo, material: crystalMat });

      // Inner wireframe glow
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x53cbf3,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const wireMesh = new THREE.Mesh(crystalGeo, wireMat);
      crystalMesh.add(wireMesh);
      disposables.push({ material: wireMat });

      // Orbiting Golden / Cyan Ring
      const ringGeo = new THREE.TorusGeometry(2.3, 0.04, 12, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffde42,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x332600,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 3;
      ringMesh.rotation.y = Math.PI / 6;
      group.add(ringMesh);
      disposables.push({ geometry: ringGeo, material: ringMat });

      // Secondary floating orbital satellite
      const satGeo = new THREE.OctahedronGeometry(0.35, 0);
      const satMat = new THREE.MeshStandardMaterial({
        color: 0xff2e93,
        roughness: 0.3,
        metalness: 0.5,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.position.set(2.4, 1.2, 0);
      group.add(satMesh);
      disposables.push({ geometry: satGeo, material: satMat });
    } else if (variant === 'auth') {
      // Auth: Subtle pulsing neural sphere with soft rings
      const sphereGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);
      disposables.push({ geometry: sphereGeo, material: sphereMat });

      const ringGeo = new THREE.TorusGeometry(1.9, 0.03, 8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 4;
      group.add(ring);
      disposables.push({ geometry: ringGeo, material: ringMat });
    } else {
      // Admin: Minimal micro atmospheric orb
      const orbGeo = new THREE.IcosahedronGeometry(1.0, 0);
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x1e90ff,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      group.add(orb);
      disposables.push({ geometry: orbGeo, material: orbMat });
    }

    // 6. Interactive mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 0.8;
      targetY = y * 0.8;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 7. Visibility Observer (Pause when offscreen to save 100% CPU/GPU)
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(mount);

    // 8. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      group.rotation.y = elapsed * 0.25 + mouseX;
      group.rotation.x = Math.sin(elapsed * 0.2) * 0.15 + mouseY;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // 10. Cleanup & Full Resource Disposal
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', handleResize);

      disposables.forEach((item) => {
        if (item.geometry) item.geometry.dispose();
        if (item.material) item.material.dispose();
      });

      renderer.dispose();
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
