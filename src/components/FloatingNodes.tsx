import { useEffect, useRef } from "react";

// Lightweight canvas-based floating nodes — zero Framer Motion, one RAF loop.
// Replaces the previous 15-motion.div implementation that ran 15 concurrent
// Framer Motion animation loops on every page.
export const FloatingNodes = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip entirely if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let W = 0;
    let H = 0;

    type Node = {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      opacity: number;
      opacityDir: number;
    };

    const nodes: Node[] = [];
    const COUNT = 7;

    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function init() {
      resize();
      nodes.length = 0;
      for (let i = 0; i < COUNT; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.1 + 0.03,
          opacityDir: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (const n of nodes) {
        // drift
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;

        // breathe
        n.opacity += n.opacityDir * 0.0003;
        if (n.opacity > 0.13 || n.opacity < 0.02) n.opacityDir *= -1;

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,77,0,${n.opacity})`;
        ctx!.fill();
      }
      rafId = requestAnimationFrame(draw);
    }

    init();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 hidden md:block"
      aria-hidden="true"
    />
  );
};
