// ========== H5 Interactive Application ==========
// 《天命人·悟空传》漫游指南 — 适配微信浏览器

(function () {
  'use strict';

  // ---- State ----
  let currentPage = 0;
  let slideIndex = 0;
  let slideTimer = null;
  let isMusicPlaying = false;
  let isAudioPlaying = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let isTransitioning = false;
  const totalPages = 6;

  // ---- DOM Helpers ----
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // ---- Page Navigation ----
  function goToPage(idx) {
    if (idx < 0 || idx >= totalPages || idx === currentPage || isTransitioning) return;
    isTransitioning = true;

    const pages = $$('.page');
    pages[currentPage].classList.remove('active');
    pages[idx].classList.add('active');
    currentPage = idx;

    $$('.page-indicator-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });

    if (idx === 2) startSlideshow();
    else stopSlideshow();

    // Re-init scratch canvas when entering scratch page
    if (idx === 5) setTimeout(initScratch, 100);

    setTimeout(() => { isTransitioning = false; }, 700);
  }

  // ---- Slideshow ----
  function startSlideshow() {
    stopSlideshow();
    slideIndex = 0;
    updateSlide();
    slideTimer = setInterval(() => {
      slideIndex = (slideIndex + 1) % 3;
      updateSlide();
    }, 3000);
  }

  function stopSlideshow() {
    if (slideTimer) { clearInterval(slideTimer); slideTimer = null; }
  }

  function updateSlide() {
    const track = $('.slideshow-track');
    if (!track) return;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    $$('.slideshow-dot').forEach((d, i) => {
      d.classList.toggle('active', i === slideIndex);
    });
  }

  // ---- Scratch / Erase Glass ----
  let scratchInited = false;

  function initScratch() {
    const container = $('.scratch-container');
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw fog overlay
    const fogImg = new Image();
    fogImg.crossOrigin = 'anonymous';
    fogImg.src = 'assets/scratch_fog.png';

    fogImg.onload = function () {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(fogImg, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-out';
    };

    // If image fails to load, draw a solid fog
    fogImg.onerror = function () {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(30, 20, 10, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw some misty texture
      for (let i = 0; i < 200; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height,
          Math.random() * 30 + 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${40 + Math.random() * 30}, ${25 + Math.random() * 20}, ${10 + Math.random() * 15}, ${Math.random() * 0.3})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'destination-out';
    };

    if (scratchInited) return;
    scratchInited = true;

    let scratching = false;

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - r.left) * (canvas.width / r.width),
        y: (t.clientY - r.top) * (canvas.height / r.height)
      };
    }

    function scratch(pos) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
      ctx.fill();
      updateProgress();
    }

    function updateProgress() {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let cleared = 0;
      // Sample every 16th pixel for performance
      for (let i = 3; i < pixels.length; i += 64) {
        if (pixels[i] === 0) cleared++;
      }
      const total = pixels.length / 64;
      const pct = Math.min(100, (cleared / total) * 100);
      const bar = $('.scratch-progress-bar');
      if (bar) bar.style.width = pct + '%';

      if (pct > 65) {
        canvas.style.transition = 'opacity 0.8s';
        canvas.style.opacity = '0';
        const hint = $('.scratch-hint');
        if (hint) hint.textContent = '🎉 恭喜通关！天命人，前路漫漫亦灿灿！';
      }
    }

    canvas.addEventListener('mousedown', (e) => { scratching = true; scratch(getPos(e)); });
    canvas.addEventListener('mousemove', (e) => { if (scratching) scratch(getPos(e)); });
    canvas.addEventListener('mouseup', () => { scratching = false; });
    canvas.addEventListener('mouseleave', () => { scratching = false; });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      scratching = true; scratch(getPos(e));
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (scratching) scratch(getPos(e));
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.stopPropagation(); scratching = false;
    });
  }

  // ---- Character Voice (TTS) ----
  function playCharacterVoice() {
    if (isAudioPlaying) return;
    isAudioPlaying = true;
    const waveEl = $('.audio-wave');
    if (waveEl) waveEl.classList.add('playing');

    if ('speechSynthesis' in window) {
      // Cancel any pending speech
      speechSynthesis.cancel();

      const text = '这不仅是一款游戏，更是属于我们这一代人的西游梦，是对命运最热血的回答。天命人，踏上你的取经路吧！';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      utterance.pitch = 0.9;

      const voices = speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.includes('zh'));
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => {
        isAudioPlaying = false;
        if (waveEl) waveEl.classList.remove('playing');
      };
      utterance.onerror = () => {
        isAudioPlaying = false;
        if (waveEl) waveEl.classList.remove('playing');
      };
      speechSynthesis.speak(utterance);
    } else {
      // Fallback: short melody
      playMelodyNote(440, 0.8);
      setTimeout(() => {
        isAudioPlaying = false;
        if (waveEl) waveEl.classList.remove('playing');
      }, 2000);
    }
  }

  // ---- BGM: Chinese Pentatonic Melody ----
  let bgmCtx = null;
  let bgmTimer = null;
  let bgmGainNode = null;

  // Chinese pentatonic scale: Do Re Mi Sol La (C D E G A)
  const MELODY_NOTES = [
    // 简谱: 敢问路在何方 旋律简化版 (Pentatonic melody inspired by Journey to the West)
    // Each entry: [frequency, duration_in_beats, volume]
    [523.25, 1, 0.15],   // C5
    [587.33, 0.5, 0.12], // D5
    [659.25, 1.5, 0.15], // E5
    [783.99, 1, 0.14],   // G5
    [659.25, 0.5, 0.12], // E5
    [587.33, 1, 0.13],   // D5
    [523.25, 2, 0.15],   // C5

    [392.00, 1, 0.14],   // G4
    [440.00, 0.5, 0.12], // A4
    [523.25, 1.5, 0.15], // C5
    [587.33, 1, 0.13],   // D5
    [523.25, 0.5, 0.12], // C5
    [440.00, 1, 0.13],   // A4
    [392.00, 2, 0.14],   // G4

    [523.25, 0.5, 0.13], // C5
    [587.33, 0.5, 0.12], // D5
    [659.25, 1, 0.15],   // E5
    [783.99, 0.5, 0.13], // G5
    [880.00, 1.5, 0.14], // A5
    [783.99, 1, 0.13],   // G5
    [659.25, 0.5, 0.12], // E5
    [587.33, 2, 0.14],   // D5

    [440.00, 1, 0.13],   // A4
    [523.25, 0.5, 0.12], // C5
    [587.33, 1, 0.14],   // D5
    [523.25, 0.5, 0.12], // C5
    [440.00, 1, 0.13],   // A4
    [392.00, 1, 0.14],   // G4
    [329.63, 2, 0.13],   // E4
  ];

  function startBGM() {
    if (bgmCtx) return;
    try {
      bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
      bgmGainNode = bgmCtx.createGain();
      bgmGainNode.gain.value = 0.6;
      bgmGainNode.connect(bgmCtx.destination);

      // Start ambient pad (soft background)
      startAmbientPad();
      // Start melody loop
      playMelodyLoop();

      isMusicPlaying = true;
      updateMusicIcon();
    } catch (e) {
      console.warn('BGM init failed:', e);
    }
  }

  function startAmbientPad() {
    if (!bgmCtx) return;
    // Soft ambient drone on C and G
    [130.81, 196.00, 261.63].forEach(freq => {
      const osc = bgmCtx.createOscillator();
      const gain = bgmCtx.createGain();
      const filter = bgmCtx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      gain.gain.value = 0.02;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bgmGainNode);
      osc.start();

      // Gentle LFO
      const lfo = bgmCtx.createOscillator();
      const lfoGain = bgmCtx.createGain();
      lfo.frequency.value = 0.08 + Math.random() * 0.1;
      lfoGain.gain.value = freq * 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    });
  }

  function playMelodyLoop() {
    if (!bgmCtx || !isMusicPlaying) return;

    const beatDuration = 0.35; // seconds per beat
    let time = bgmCtx.currentTime + 0.1;

    MELODY_NOTES.forEach(([freq, beats, vol]) => {
      const dur = beats * beatDuration;

      // Main tone (triangle for softer Chinese instrument sound)
      const osc = bgmCtx.createOscillator();
      const gain = bgmCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.03);
      gain.gain.setValueAtTime(vol, time + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(bgmGainNode);
      osc.start(time);
      osc.stop(time + dur + 0.05);

      // Subtle harmonic (one octave higher, very quiet)
      const osc2 = bgmCtx.createOscillator();
      const gain2 = bgmCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0, time);
      gain2.gain.linearRampToValueAtTime(vol * 0.15, time + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.5);
      osc2.connect(gain2);
      gain2.connect(bgmGainNode);
      osc2.start(time);
      osc2.stop(time + dur);

      time += dur;
    });

    // Total duration of one loop
    const totalBeats = MELODY_NOTES.reduce((s, n) => s + n[1], 0);
    const loopDuration = totalBeats * beatDuration;

    // Schedule next loop with a pause
    bgmTimer = setTimeout(() => {
      playMelodyLoop();
    }, (loopDuration + 1.5) * 1000);
  }

  function playMelodyNote(freq, dur) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, dur * 1000);
  }

  function stopBGM() {
    if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
    if (bgmCtx) {
      try { bgmCtx.close(); } catch (e) { }
      bgmCtx = null;
      bgmGainNode = null;
    }
    isMusicPlaying = false;
    updateMusicIcon();
  }

  function toggleBGM() {
    if (isMusicPlaying) stopBGM();
    else startBGM();
  }

  function updateMusicIcon() {
    const icon = $('.music-icon');
    if (icon) icon.classList.toggle('playing', isMusicPlaying);
  }

  // ---- Particles ----
  function createParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (4 + Math.random() * 6) + 's';
      p.style.animationDelay = Math.random() * 5 + 's';
      p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
      container.appendChild(p);
    }
  }

  // ---- Touch / Swipe ----
  function initSwipe() {
    const container = $('.h5-container');

    container.addEventListener('touchstart', (e) => {
      if (e.target.closest('.scratch-container')) return;
      if (e.target.closest('.btn-start') || e.target.closest('.dir-card') ||
        e.target.closest('.btn-back') || e.target.closest('.btn-back-small') ||
        e.target.closest('.character-stage') || e.target.closest('.video-placeholder')) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      if (e.target.closest('.scratch-container')) return;
      if (e.target.closest('.btn-start') || e.target.closest('.dir-card') ||
        e.target.closest('.btn-back') || e.target.closest('.btn-back-small') ||
        e.target.closest('.character-stage') || e.target.closest('.video-placeholder')) return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
        if (dy > 0) goToPage(currentPage + 1);
        else goToPage(currentPage - 1);
      }
    }, { passive: true });

    // Desktop mouse wheel
    let wheelTimeout = null;
    container.addEventListener('wheel', (e) => {
      if (isTransitioning || wheelTimeout) return;
      if (Math.abs(e.deltaY) > 20) {
        if (e.deltaY > 0) goToPage(currentPage + 1);
        else goToPage(currentPage - 1);
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 800);
      }
    }, { passive: true });
  }

  // ---- Video placeholder ----
  function initVideoPlaceholder() {
    const placeholder = $('.video-placeholder');
    if (!placeholder) return;
    placeholder.addEventListener('click', () => {
      placeholder.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="font-size:2rem;margin-bottom:10px;">⚔️</div>
          <div style="color:var(--gold);font-size:0.9rem;letter-spacing:2px;">战斗演示播放中...</div>
          <div style="margin-top:12px;font-size:0.7rem;color:var(--text-muted);">
            实际使用时此处嵌入<br>游戏录屏MP4视频
          </div>
        </div>
      `;
    });
  }

  // ---- Prevent WeChat pull-down refresh ----
  function preventWechatPullDown() {
    document.addEventListener('touchmove', (e) => {
      if (!e.target.closest('.scratch-container')) {
        // Allow default only if not at extremes
      }
    }, { passive: true });

    // Prevent double-tap zoom on iOS
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
      }
      lastTap = now;
    }, { passive: false });
  }

  // ---- Init ----
  function init() {
    const particleContainer = $('.particles');
    if (particleContainer) createParticles(particleContainer, 25);

    const btnStart = $('.btn-start');
    if (btnStart) btnStart.addEventListener('click', () => goToPage(1));

    $$('.dir-card').forEach((card, i) => {
      card.addEventListener('click', () => goToPage(i + 2));
    });

    $$('[data-goto]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToPage(parseInt(btn.dataset.goto));
      });
    });

    const charStage = $('.character-stage');
    if (charStage) charStage.addEventListener('click', playCharacterVoice);

    const musicBtn = $('.music-toggle');
    if (musicBtn) musicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBGM();
    });

    initSwipe();
    initScratch();
    initVideoPlaceholder();
    preventWechatPullDown();

    // Load TTS voices
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // Auto-start BGM on first user interaction (browser policy)
    let bgmStarted = false;
    function tryStartBGM() {
      if (!bgmStarted) {
        startBGM();
        bgmStarted = true;
      }
    }
    document.addEventListener('click', tryStartBGM, { once: true });
    document.addEventListener('touchstart', tryStartBGM, { once: true });

    // Set first page
    goToPage(0);

    // Handle visibility change (pause/resume when switching tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isMusicPlaying) {
        stopBGM();
        bgmStarted = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
