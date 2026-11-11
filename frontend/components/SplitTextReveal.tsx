'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import SplitType from 'split-type';

export interface SplitTextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
  by?: 'chars' | 'words' | 'lines';
  delay?: number;
  duration?: number;
  stagger?: number;
  y?: number;
}

export default function SplitTextReveal({
  children,
  as: Component = 'div',
  className = '',
  style,
  by = 'words',
  delay = 0.1,
  duration = 0.75,
  stagger = 0.03,
  y = 20,
}: SplitTextRevealProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let splitInstance: SplitType | null = null;
    let animCtx: gsap.Context | null = null;

    try {
      splitInstance = new SplitType(el, {
        types: by === 'chars' ? 'chars,words' : by === 'lines' ? 'lines' : 'words',
        tagName: 'span',
      });

      const targets =
        by === 'chars'
          ? splitInstance.chars
          : by === 'lines'
          ? splitInstance.lines
          : splitInstance.words;

      if (targets && targets.length > 0) {
        animCtx = gsap.context(() => {
          gsap.from(targets, {
            opacity: 0,
            y,
            stagger,
            duration,
            delay,
            ease: 'power3.out',
            clearProps: 'all',
          });
        }, el);
      }
    } catch {
      // Fallback silently if DOM modification fails
    }

    return () => {
      if (animCtx) animCtx.revert();
      if (splitInstance) splitInstance.revert();
    };
  }, [children, by, delay, duration, stagger, y]);

  return React.createElement(
    Component,
    {
      ref: containerRef,
      className,
      style: { display: 'inline-block', ...style },
      'aria-label': children,
    },
    children
  );
}
