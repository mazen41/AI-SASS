'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AnimatedScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 45;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x6f6fff, 0.7);
    const point = new THREE.PointLight(0x00d4ff, 2.2, 250);
    point.position.set(0, 0, 40);
    scene.add(ambient, point);

    const particleCount = 1400;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 130;
      positions[i3 + 1] = (Math.random() - 0.5) * 90;
      positions[i3 + 2] = (Math.random() - 0.5) * 90;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0x8c8cff, size: 0.24, transparent: true, opacity: 0.8 });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const blobGeometry = new THREE.IcosahedronGeometry(6, 12);
    const blobMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x5f7dff,
      emissive: 0x4c00ff,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.45,
      transparent: true,
      opacity: 0.75,
      transmission: 0.5,
    });
    const blob = new THREE.Mesh(blobGeometry, blobMaterial);
    blob.position.set(-10, 2, -10);
    scene.add(blob);

    const blob2 = blob.clone();
    blob2.position.set(15, -6, -22);
    blob2.scale.set(0.7, 0.7, 0.7);
    scene.add(blob2);

    const mouse = { x: 0, y: 0 };
    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      particles.rotation.y += 0.0007;
      particles.rotation.x += 0.0002;

      blob.rotation.x += 0.002;
      blob.rotation.y += 0.003;
      blob.position.y = Math.sin(Date.now() * 0.001) * 1.8;

      blob2.rotation.x -= 0.0018;
      blob2.rotation.y += 0.0024;
      blob2.position.y = Math.cos(Date.now() * 0.0012) * 2.2;

      camera.position.x += (mouse.x * 8 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 5 - camera.position.y) * 0.02;

      point.position.x = camera.position.x * 2.4;
      point.position.y = camera.position.y * 2.4;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="scene" />;
}
