// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Scroll progress bar + warp factor (0..1)
const progress = document.getElementById('scroll-progress');
let warpT = 0; // 0 at top, 1 at bottom

function updateProgress(){
  const h = document.documentElement;
  const denom = Math.max(1, h.scrollHeight - h.clientHeight);
  const scrolled = Math.max(0, Math.min(1, (h.scrollTop) / denom));
  if (progress) progress.style.width = `${scrolled * 100}%`;
  warpT = scrolled; // expose to starfield as warp throttle
}
document.addEventListener('scroll', updateProgress, {passive:true});
updateProgress();

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// Tilt effect on hover (lightweight)
document.querySelectorAll('[data-tilt]').forEach(card => {
  let rAF = null;
  function onMove(e){
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 4;
    const ry = (x - 0.5) * 6;
    if (!rAF){
      rAF = requestAnimationFrame(() => {
        card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        rAF = null;
      });
    }
  }
  function reset(){ card.style.transform = ''; }
  card.addEventListener('mousemove', onMove, {passive:true});
  card.addEventListener('mouseleave', reset);
});

// MP4s behave like GIFs: autoplay, loop, muted, inline; pause when out of view
const videos = Array.from(document.querySelectorAll('.gif-video'));
const vio = new IntersectionObserver((entries) => {
  entries.forEach(({isIntersecting, target}) => {
    if (isIntersecting) target.play().catch(()=>{});
    else target.pause();
  });
}, { threshold: 0.4 });
videos.forEach(v => vio.observe(v));

/* =======================
   3D Starfield Background
   - Perspective projection (1/z)
   - Mouse parallax
   - Depth-based size/brightness
   - Motion streaks
   - High-DPI aware
   - Warp strength tied to scroll (warpT)
======================= */
(function starfield3D() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });

  // -------- Base parameters (tweak to taste) --------
  const P = {
    DENSITY: 0.00100,     // stars per CSS pixel
    FOV_BASE: 420,        // base focal length
    DEPTH: 5000,          // z-range (1..DEPTH)
    SPEED_BASE: 1000,       // forward units/sec at calm
    SPEED_VARIANCE: 0.9,  // per-star speed variety
    SIZE_NEAR: 3.2,       // max size when near camera
    SIZE_FAR: 0.30,       // min size when far
    STREAK_BASE: 0.55,    // baseline streakiness (0..1+)
    COLORIZE: true        // subtle blue/white hue
  };

  // -------- Warp response to scroll (t = warpT from 0..1) --------
  function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function warpParams(tRaw){
    const t = easeInOutCubic(Math.max(0, Math.min(1, tRaw || 0)));
    return {
      speedMul: 1 + t * 7.0,        // up to ~8x speed at bottom
      fovMul:   1 + t * 0.40,       // widen FOV slightly during warp
      streakMul:1 + t * 0.80,       // longer trails in warp
      vignette: t * 0.10            // mild center glow in warp
    };
  }

  let w = 0, h = 0, cx = 0, cy = 0, dpr = 1;
  let stars = [], N = 0;
  let last = performance.now();

  // Camera (leans with mouse)
  const cam = { x: 0, y: 0 };
  const look = { x: 0, y: 0 };

  // High-DPI aware sizing
  function setSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
    w = window.innerWidth; h = window.innerHeight; cx = w / 2; cy = h / 2;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  }

  function makeStar(z = Math.random() * P.DEPTH) {
    // Spread stars beyond screen so parallax doesn’t show edges
    const spread = Math.max(w, h) * 1.6;
    return {
      x: (Math.random() - 0.5) * spread * 2,
      y: (Math.random() - 0.5) * spread * 2,
      z,
      speed: 0.5 + Math.random() * P.SPEED_VARIANCE,
      hue: 205 + Math.random() * 40, // cool whites → faint blue
      tw: Math.random() * Math.PI * 2,
      px: 0, py: 0 // previous projected position (for streaks)
    };
  }

  function resetStars() {
    N = Math.floor(w * h * P.DENSITY);
    stars = new Array(N).fill(0).map(() => makeStar(Math.random() * P.DEPTH));
  }

  // Mouse look (parallax)
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / w) * 2 - 1;
    const ny = (e.clientY / h) * 2 - 1;
    look.x = nx * 100; // how far the camera "leans" with mouse
    look.y = ny * 60;
  }, { passive: true });

  window.addEventListener('resize', () => { setSize(); resetStars(); });

  setSize();
  resetStars();

  function project(s, fov) {
    const z = Math.max(1, s.z);
    const f = fov / z;  // 1/z perspective
    const sx = (s.x - cam.x) * f + cx;
    const sy = (s.y - cam.y) * f + cy;
    const size = Math.max(P.SIZE_FAR, P.SIZE_NEAR * f);
    const alpha = Math.min(1, 0.18 + 0.95 * f * 1.2); // brighter when closer
    return { sx, sy, size, alpha };
  }

  // Respect reduced motion users
  let animate = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) animate = false;

  function drawFrame(dt) {
    // Ease camera towards target look
    //cam.x += (look.x - cam.x) * 0.06;
    //cam.y += (look.y - cam.y) * 0.06;

    // Warp params from scroll
    const W = warpParams(typeof warpT !== 'undefined' ? warpT : 0);

    // Backdrop
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Soft center wash to deepen contrast (scales with warp)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    g.addColorStop(0, `rgba(40,40,55,${0.10 + W.vignette})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const fov = P.FOV_BASE * W.fovMul;

    for (let i = 0; i < N; i++) {
      const s = stars[i];

      // Move star towards the camera (faster in warp)
      s.z -= (P.SPEED_BASE * W.speedMul * s.speed) * dt;
      if (s.z <= 1) { // Passed camera; respawn far away
        stars[i] = makeStar(P.DEPTH);
        continue;
      }

      const p = project(s, fov);

      // Keep old projected pos for streaks (first frame uses current pos)
      const prevX = s.px || p.sx;
      const prevY = s.py || p.sy;
      s.px = p.sx; s.py = p.sy;

      // Skip if far off screen (save fill/stroke work)
      if (p.sx < -50 || p.sx > w + 50 || p.sy < -50 || p.sy > h + 50) continue;

      // Motion streak: longer with warp and proximity
      const baseLen = (1 - s.z / P.DEPTH) * 18;
      const len = baseLen * P.STREAK_BASE * W.streakMul;

      // Direction from motion between frames
      const dx = (p.sx - prevX), dy = (p.sy - prevY);
      const mag = Math.hypot(dx, dy) + 1e-4;
      const ux = dx / mag, uy = dy / mag;

      ctx.strokeStyle = P.COLORIZE
        ? `hsla(${s.hue}, 25%, 82%, ${p.alpha})`
        : `rgba(255,255,255,${p.alpha})`;
      ctx.lineWidth = Math.max(1, p.size * 0.6);
      ctx.beginPath();
      ctx.moveTo(p.sx - ux * len, p.sy - uy * len);
      ctx.lineTo(p.sx, p.sy);
      ctx.stroke();
    }
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); // clamp big pauses
    last = now;

    drawFrame(dt);
    if (animate) requestAnimationFrame(frame);
  }

  if (animate) requestAnimationFrame(frame);
  else {
    // Static render for reduced-motion users
    drawFrame(0);
  }
})();

// Subtle parallax on headshot
const heroImage = document.querySelector('.hero .headshot');
if (heroImage){
  window.addEventListener('scroll', () => {
    const offset = window.scrollY * 0.1;
    heroImage.style.transform = `translateY(${offset}px)`;
  }, {passive:true});
}
