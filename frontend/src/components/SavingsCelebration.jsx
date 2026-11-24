import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../Style/SavingsCelebration.css";

const COLORS = ["#eff04c", "#ffffff", "#ff5fa2", "#3ddc97", "#ff9f1c", "#4cc9f0", "#164e74"];
const EMOJIS = ["🎉", "🎊", "✨", "💸"];
const POPUP_MS = 2600;
const CONFETTI_FADE_AT = 3600;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Two confetti cannons fire from the bottom corners; pieces arc up, flutter and fall.
function fireConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const power = Math.max(height, 600) / 27;
  const pieces = [];
  const launch = (x, direction) => {
    for (let i = 0; i < 80; i += 1) {
      // Upward kick scales with screen height; sideways drift with screen width,
      // so pieces cover the screen on phones and desktops alike (drag 0.985 => travel ≈ v / 0.015).
      const rise = power * (0.75 + Math.random() * 0.35);
      const drift = width * (0.1 + Math.random() * 0.75) * 0.015;
      const emoji = i % 10 === 0 ? EMOJIS[(i / 10) % EMOJIS.length] : null;
      pieces.push({
        x,
        y: height + 10,
        vx: direction * drift,
        vy: -rise,
        size: emoji ? 22 + Math.random() * 8 : 6 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: emoji || (Math.random() < 0.7 ? "rect" : "circle"),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.1,
        delay: Math.random() * 120,
      });
    }
  };
  launch(-10, 1);
  launch(width + 10, -1);

  const start = performance.now();
  let last = start;
  let frame;

  const tick = (now) => {
    const dt = Math.min((now - last) / 16.67, 3); // smooth on 60/120 Hz screens
    last = now;
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);

    let alive = 0;
    for (const p of pieces) {
      if (elapsed < p.delay) {
        alive += 1;
        continue;
      }
      p.vx *= Math.pow(0.985, dt);
      p.vy = p.vy * Math.pow(0.985, dt) + 0.3 * dt;
      p.vy = Math.min(p.vy, 3.6); // gentle, floaty fall
      p.x += (p.vx + Math.sin(p.wobble) * 0.6) * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      p.wobble += p.wobbleSpeed * dt;
      if (p.y > height + 40) continue;
      alive += 1;

      const fade = elapsed > CONFETTI_FADE_AT ? Math.max(0, 1 - (elapsed - CONFETTI_FADE_AT) / 800) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.shape === "rect" || p.shape === "circle") {
        ctx.scale(1, Math.cos(p.wobble)); // paper flipping in the air
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.shape, 0, 0);
      }
      ctx.restore();
    }

    if (alive > 0 && elapsed < CONFETTI_FADE_AT + 800) frame = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/**
 * Full-screen "you saved" moment: confetti from both corners plus a popup that
 * springs in and closes itself. Remount it (change its `key`) to play it again.
 */
export default function SavingsCelebration({ amount, percent, onDone }) {
  const canvasRef = useRef(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const stopConfetti = canvasRef.current && !prefersReducedMotion() ? fireConfetti(canvasRef.current) : null;
    const timer = setTimeout(() => doneRef.current?.(), CONFETTI_FADE_AT + 900);
    return () => {
      stopConfetti?.();
      clearTimeout(timer);
    };
  }, []);

  return createPortal(
    <div className="sc-layer">
      <canvas ref={canvasRef} className="sc-confetti" aria-hidden="true" />
      <div className="sc-popup-wrap" onClick={() => doneRef.current?.()}>
        <div className="sc-popup" role="status" aria-live="polite" style={{ "--sc-hold": `${POPUP_MS}ms` }}>
          <span className="sc-popup-emoji" aria-hidden="true">🎉</span>
          <strong className="sc-popup-amount">You saved {amount}!</strong>
          <span className="sc-popup-text">{percent}% UPI discount applied on this order</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
