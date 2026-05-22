'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    const glow = glowRef.current;
    if (!dot || !ring || !glow) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let glowX = 0, glowY = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';

      glowX += (mouseX - glowX) * 0.06;
      glowY += (mouseY - glowY) * 0.06;
      glow.style.left = glowX + 'px';
      glow.style.top = glowY + 'px';

      rafId = requestAnimationFrame(loop);
    };

    const onEnter = () => {
      dot.style.opacity = '1';
      ring.style.opacity = '0.7';
      glow.style.opacity = '1';
    };

    const onLeave = () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      glow.style.opacity = '0';
    };

    const onLinkEnter = () => {
      dot.style.width = '12px';
      dot.style.height = '12px';
    };

    const onLinkLeave = () => {
      dot.style.width = '8px';
      dot.style.height = '8px';
    };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);

    const addLinkListeners = () => {
      document.querySelectorAll('a, button, [data-cursor]').forEach(el => {
        el.addEventListener('mouseenter', onLinkEnter);
        el.addEventListener('mouseleave', onLinkLeave);
      });
    };
    addLinkListeners();

    // Re-add listeners if new elements are added
    const observer = new MutationObserver(addLinkListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div id="cursor-dot" ref={dotRef} style={{ opacity: 0 }} />
      <div id="cursor-ring" ref={ringRef} style={{ opacity: 0 }} />
      <div id="cursor-glow" ref={glowRef} style={{ opacity: 0 }} />
    </>
  );
}
