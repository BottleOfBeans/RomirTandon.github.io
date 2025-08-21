// Scroll progress bar
const progress = document.getElementById('scroll-progress');
function updateProgress() {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
  progress.style.width = `${Math.min(100, scrolled * 100)}%`;
}
document.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// Tilt effect on hover
document.querySelectorAll('[data-tilt]').forEach(card => {
  let rAF = null;
  function onMove(e) {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 4;
    const ry = (x - 0.5) * 6;
    if (!rAF) {
      rAF = requestAnimationFrame(() => {
        card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        rAF = null;
      });
    }
  }
  function reset() { card.style.transform = ''; }
  card.addEventListener('mousemove', onMove, { passive: true });
  card.addEventListener('mouseleave', reset);
});

// Enhanced starfield with sparkle, size variation, and galaxies
(function starfield(){
  const c = document.getElementById('starfield');
  const ctx = c.getContext('2d', { alpha: false });
  function resize(){ c.width = innerWidth; c.height = innerHeight; }
  addEventListener('resize', resize); resize();

  const N = Math.min(500, Math.floor((innerWidth * innerHeight) / 6000));
  const stars = new Array(N).fill(0).map(() => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    z: Math.random() * 1.5 + 0.5,
    s: Math.random() * 0.6 + 0.2,
    sparkle: Math.random() * 0.5 + 0.5
  }));

  const galaxies = new Array(10).fill(0).map(() => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    r: Math.random() * 20 + 10,
    a: 0
  }));

  function frame(){
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, c.width, c.height);

    for(const st of stars){
      const size = st.z * st.sparkle;
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005 + st.x) * 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, size, 0, Math.PI * 2);
      ctx.fill();
      st.x += st.s * 0.05; st.y += st.s * 0.02;
      if (st.x > c.width) st.x = 0;
      if (st.y > c.height) st.y = 0;
    }

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#8888ff';
    for(const g of galaxies){
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.a);
      ctx.beginPath();
      for(let i = 0; i < 6; i++){
        const angle = i * Math.PI / 3;
        const dx = Math.cos(angle) * g.r;
        const dy = Math.sin(angle) * g.r;
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
      }
      ctx.stroke();
      ctx.restore();
      g.a += 0.002;
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
})();

// Cursor-based background movement
const starfield = document.getElementById('starfield');
window.addEventListener('mousemove', e => {
  const x = e.clientX / window.innerWidth - 0.5;
  const y = e.clientY / window.innerHeight - 0.5;
  starfield.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
});

// Black hole with gravitational lensing and trails
(function blackHole(){
  const canvas = document.getElementById('blackhole');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 300;

  let angle = 0;
  const trail = [];

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(angle);

    const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(0.5, '#222');
    gradient.addColorStop(1, '#000');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    trail.push({x: Math.cos(angle) * 100, y: Math.sin(angle) * 100});
    if (trail.length > 50) trail.shift();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.restore();
    angle += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();
