<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SASS AI — Cognitive Operating Layer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body>
<canvas id="ai-cosmos"></canvas>
<div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<header class="nav glass">
    <div class="logo">SASS.AI</div>
    <nav>
        <a href="#landing">Product</a><a href="#login">Login</a><a href="#register">Register</a>
    </nav>
</header>
<main>
    <section id="landing" class="hero section">
        <p class="eyebrow">PREMIUM COGNITIVE PLATFORM</p>
        <h1 class="headline">Ship intelligence with a cinematic AI control surface.</h1>
        <p class="sub">A launch-grade experience designed for funded AI teams: real-time orchestration, adaptive agents, and neural workflows in one immersive layer.</p>
        <div class="cta-row">
            <a href="#register" class="btn btn-primary">Start Building</a>
            <a href="#login" class="btn btn-ghost">Open Console</a>
        </div>
    </section>

    <section class="section feature-grid">
        <article class="glass tilt card"><h3>Neural Runtime</h3><p>Autonomous chains adapt in motion with live inferencing telemetry.</p></article>
        <article class="glass tilt card"><h3>Vector Memory</h3><p>Persistent context graphing with semantic recall and secure shards.</p></article>
        <article class="glass tilt card"><h3>Launch Analytics</h3><p>Cinematic dashboards track model confidence and user flow in depth.</p></article>
    </section>

    <section id="login" class="section auth-wrap">
        <form class="glass auth tilt">
            <h2>Welcome Back</h2>
            <p>Enter your credentials to continue into the AI command layer.</p>
            <label>Email<input type="email" placeholder="you@company.ai"></label>
            <label>Password<input type="password" placeholder="••••••••"></label>
            <button type="button" class="btn btn-primary">Login</button>
        </form>
    </section>

    <section id="register" class="section auth-wrap">
        <form class="glass auth tilt">
            <h2>Create Your Workspace</h2>
            <p>Provision your startup-grade AI environment in under a minute.</p>
            <label>Full Name<input type="text" placeholder="Alex Carter"></label>
            <label>Email<input type="email" placeholder="founder@company.ai"></label>
            <label>Password<input type="password" placeholder="Create secure password"></label>
            <button type="button" class="btn btn-primary">Register</button>
        </form>
    </section>
</main>

<script type="module">
import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js';
gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('ai-cosmos');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 24;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const particles = new THREE.BufferGeometry();
const count = 900;
const pos = new Float32Array(count * 3);
for (let i=0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
particles.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const material = new THREE.PointsMaterial({ color: 0x80c5ff, size: 0.13, transparent: true, opacity: 0.9 });
const cloud = new THREE.Points(particles, material);
scene.add(cloud);

const spheres = [];
for (let i = 0; i < 6; i++) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + Math.random(), 1), new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${210 + i * 20}, 100%, 65%)`), emissive: 0x2233ff, metalness: 0.45, roughness: 0.25
  }));
  mesh.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 16);
  scene.add(mesh); spheres.push(mesh);
}
scene.add(new THREE.AmbientLight(0x4050ff, 0.85));
const key = new THREE.PointLight(0xa0d4ff, 2.2, 120); key.position.set(18, 8, 22); scene.add(key);

let mx = 0, my = 0;
addEventListener('mousemove', (e) => { mx = (e.clientX / innerWidth - 0.5) * 2; my = (e.clientY / innerHeight - 0.5) * 2; });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.00022;
  cloud.rotation.y += 0.00085;
  cloud.rotation.x = Math.sin(t) * 0.07;
  camera.position.x += (mx * 2.5 - camera.position.x) * 0.03;
  camera.position.y += (-my * 1.8 - camera.position.y) * 0.03;
  spheres.forEach((s, i) => { s.rotation.x += 0.004 + i * 0.0003; s.rotation.y += 0.005; s.position.y += Math.sin(t * 7 + i) * 0.004; });
  renderer.render(scene, camera);
}
animate();

gsap.from('.hero > *', { y: 38, opacity: 0, duration: 1.2, stagger: 0.14, ease: 'power3.out' });
gsap.utils.toArray('.section').forEach((section) => {
  gsap.from(section.querySelectorAll('h2,h3,p,.btn,.card,label,input'), {
    scrollTrigger: { trigger: section, start: 'top 76%' },
    y: 30, opacity: 0, duration: 0.95, stagger: 0.08, ease: 'power2.out'
  });
});

const tilts = document.querySelectorAll('.tilt');
tilts.forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 8).toFixed(2)}deg) scale3d(1.015,1.015,1.015)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'; });
});
</script>
</body>
</html>
