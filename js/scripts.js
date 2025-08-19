// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Scroll progress bar
const progress = document.getElementById('scroll-progress');
function updateProgress(){
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
  progress.style.width = `${Math.min(100, scrolled * 100)}%`;
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

// Minimal starfield (monochrome, low cost)
(function starfield(){
  const c = document.getElementById('starfield');
  const ctx = c.getContext('2d', { alpha: false });
  function resize(){ c.width = innerWidth; c.height = innerHeight; }
  addEventListener('resize', resize); resize();

  const N = Math.min(300, Math.floor((innerWidth*innerHeight)/9000));
  const stars = new Array(N).fill(0).map(()=>({
    x: Math.random()*c.width,
    y: Math.random()*c.height,
    z: Math.random()*0.5 + 0.5, // depth (size/intensity)
    s: Math.random()*0.4 + 0.1   // speed factor
  }));

  function frame(){
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#fff';
    for(const st of stars){
      const size = st.z * 1.2;
      ctx.globalAlpha = 0.35 + st.z*0.5;
      ctx.fillRect(st.x, st.y, size, size);
      // subtle drift
      st.x += st.s * 0.05; st.y += st.s * 0.02;
      if (st.x > c.width) st.x = 0;
      if (st.y > c.height) st.y = 0;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
})();
