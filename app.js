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
    fogImg.src = 'assets/scratch_fog.webp';

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

  // ---- BGM: MP3 Audio with fallback ----
  let bgmAudio = null;

  function initBGM() {
    if (bgmAudio) return;
    bgmAudio = new Audio();
    // 默认加载西游记主题曲/轻音乐
    bgmAudio.src = 'assets/bgm.mp3';
    bgmAudio.loop = true;
    bgmAudio.volume = 0.5;
    
    // 如果没有找到文件，使用静音避免报错
    bgmAudio.addEventListener('error', () => {
      console.warn('bgm.mp3 not found. Place a file named bgm.mp3 in assets/ folder.');
      isMusicPlaying = false;
      updateMusicIcon();
    });
  }

  function startBGM() {
    if (!bgmAudio) initBGM();
    
    const playPromise = bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isMusicPlaying = true;
        updateMusicIcon();
        // 如果页面隐藏，暂停播放
        if (document.hidden) stopBGM();
      }).catch(err => {
        console.log('BGM auto-play prevented by browser:', err);
        isMusicPlaying = false;
        updateMusicIcon();
      });
    }
  }

  function stopBGM() {
    if (bgmAudio) {
      bgmAudio.pause();
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

    // Loading screen: preload only title bg, then dismiss
    dismissLoadingScreen();
  }

  function dismissLoadingScreen() {
    const loadScreen = document.getElementById('loading-screen');
    const loadBar = document.getElementById('load-bar');
    if (!loadScreen) return;

    // Animate progress bar
    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(progress + 8 + Math.random() * 12, 90);
      if (loadBar) loadBar.style.width = progress + '%';
    }, 100);

    // Preload just the title background (critical for first page)
    const img = new Image();
    img.src = 'assets/title_bg.webp';

    function finish() {
      clearInterval(tick);
      if (loadBar) loadBar.style.width = '100%';
      setTimeout(() => {
        loadScreen.style.opacity = '0';
        setTimeout(() => {
          loadScreen.style.display = 'none';
        }, 600);
      }, 200);
    }

    img.onload = finish;
    img.onerror = finish;
    // Fallback: dismiss after 3s max even if image fails
    setTimeout(finish, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
