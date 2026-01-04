document.addEventListener('DOMContentLoaded', function () {
    const voiceButton = document.getElementById('voiceButton');
    const textInput = document.getElementById('textInput');
    const searchButton = document.getElementById('searchButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const voiceInstruction = document.getElementById('voiceInstruction');
    const resultsSection = document.getElementById('resultsSection');
    const queryText = document.getElementById('queryText');
    const resultsContainer = document.getElementById('resultsContainer');
    const canvas = document.getElementById('audioVisualization');
  
    const videoResultsSection = document.getElementById('videoResultsSection');
    const videoContainer = document.getElementById('videoContainer');
    const pauseAllBtn = document.getElementById('pauseAllBtn');
    const muteAllBtn = document.getElementById('muteAllBtn');
    const unmuteAllBtn = document.getElementById('unmuteAllBtn');
  
    const videoLibrary = [
      {
        id: 'v1',
        title: 'City',
        tags: ['city', 'timelapse', 'night', 'lights', 'urban'],
        src: 'videos/city.mp4',
        poster: 'videos/posters/city.jpg'
      },
      {
        id: 'v2',
        title: 'Fiction',
        tags: ['fiction', 'fire', 'dragon', 'nature', 'magic'],
        src: 'videos/fiction.mp4',
        poster: 'videos/posters/fiction.jpg'
      },
      {
        id: 'v3',
        title: 'Forest Walk',
        tags: ['forest', 'walk', 'nature', 'trees', 'calm'],
        src: 'videos/forest-walk.mp4',
        poster: 'videos/posters/forest.jpg'
      },
      {
        id: 'v4',
        title: 'Future',
        tags: ['future', 'robots', 'utopia', 'new', 'dawn'],
        src: 'videos/future.mp4',
        poster: 'videos/posters/future.jpg'
      },
    ];
  
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let dataArray = null;
    let isRecording = false;
    let animationFrameId = null;
  
    let recognition = null;
    let isSpeechRecognitionSupported = false;
  
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      isSpeechRecognitionSupported = true;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
  
      recognition.onresult = function (event) {
        let interimTranscript = '';
        let finalTranscript = '';
  
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
  
        if (finalTranscript) {
          textInput.value = finalTranscript.trim();
        } else if (interimTranscript) {
          textInput.value = interimTranscript;
        }
      };
  
      recognition.onerror = function (event) {
        if (event.error === 'no-speech') {
          voiceInstruction.textContent = 'No speech detected. Try again.';
        } else if (event.error === 'audio-capture') {
          voiceInstruction.textContent = 'No microphone found.';
        } else if (event.error === 'not-allowed') {
          voiceInstruction.textContent = 'Microphone permission denied.';
        }
      };
  
      recognition.onend = function () {
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };
    } else {
      voiceInstruction.textContent = 'Speech recognition not supported. Please use Chrome or Edge.';
    }
  
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
  
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      window.addEventListener('resize', () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        if (!isRecording) {
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      });
    }
  
    voiceButton.addEventListener('click', async function () {
      if (!isRecording) {
        try {
          await startRecording();
        } catch (error) {
          voiceInstruction.textContent = 'Error: Could not access microphone';
          voiceInstruction.style.color = '#ea4335';
          setTimeout(() => {
            voiceInstruction.textContent = 'Click to start voice search';
            voiceInstruction.style.color = '';
          }, 3000);
        }
      } else {
        stopRecording();
      }
    });
  
    async function startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
  
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
  
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
  
      microphone.connect(analyser);
  
      isRecording = true;
      voiceButton.classList.add('recording');
      recordingStatus.style.display = 'flex';
      voiceInstruction.textContent = 'Listening... Click again to stop';
      voiceInstruction.style.color = '';
  
      visualize();
  
      if (isSpeechRecognitionSupported && recognition) {
        try {
          recognition.start();
        } catch (e) {}
      }
    }
  
    function stopRecording() {
      if (isSpeechRecognitionSupported && recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
  
      if (microphone) {
        microphone.mediaStream.getTracks().forEach((track) => track.stop());
        microphone.disconnect();
        microphone = null;
      }
  
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
      }
  
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
  
      isRecording = false;
      voiceButton.classList.remove('recording');
      recordingStatus.style.display = 'none';
  
      if (textInput.value.trim()) {
        voiceInstruction.textContent = 'Click to search or speak again';
        setTimeout(() => {
          if (textInput.value.trim() && !isRecording) {
            performSearch(textInput.value);
          }
        }, 500);
      } else {
        voiceInstruction.textContent = 'Click to start voice search';
      }
  
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  
    function visualize() {
      if (!analyser || !canvas) return;
  
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
  
      function draw() {
        if (!isRecording || !analyser) return;
  
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
  
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
  
        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;
  
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * height;
  
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
  
          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
  
          x += barWidth + 1;
        }
      }
  
      draw();
    }
  
    searchButton.addEventListener('click', function () {
      performSearch(textInput.value);
    });
  
    textInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        performSearch(textInput.value);
      }
    });
  
    if (pauseAllBtn) {
      pauseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('video[data-video-card="true"]').forEach((v) => v.pause());
      });
    }
  
    if (muteAllBtn) {
      muteAllBtn.addEventListener('click', () => {
        document.querySelectorAll('video[data-video-card="true"]').forEach((v) => {
          v.muted = true;
        });
        syncAllMuteButtons();
      });
    }
  
    if (unmuteAllBtn) {
      unmuteAllBtn.addEventListener('click', () => {
        document.querySelectorAll('video[data-video-card="true"]').forEach((v) => {
          v.muted = false;
        });
        syncAllMuteButtons();
      });
    }
  
    function performSearch(query) {
      const q = (query || '').trim();
      if (!q) return;
  
      queryText.textContent = q;
      resultsSection.style.display = 'block';
  
      resultsContainer.innerHTML = `
        <div class="result-item">
          <div class="result-title"><a href="#">Sample Search Result 1</a></div>
          <div class="result-url">https://example.com/result1</div>
          <div class="result-snippet">
            This is a sample search result snippet. In later stages, this will be populated with actual search results based on your voice query.
          </div>
        </div>
        <div class="result-item">
          <div class="result-title"><a href="#">Sample Search Result 2</a></div>
          <div class="result-url">https://example.com/result2</div>
          <div class="result-snippet">
            Another sample result. The search functionality will be fully implemented in later stages with Audio API integration.
          </div>
        </div>
      `;
  
      renderVideoResults(q);
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    function renderVideoResults(query) {
      if (!videoResultsSection || !videoContainer) return;
  
      const q = query.toLowerCase();
      const matches = videoLibrary.filter((v) => {
        const inTitle = (v.title || '').toLowerCase().includes(q);
        const inTags = Array.isArray(v.tags) && v.tags.some((t) => String(t).toLowerCase().includes(q));
        return inTitle || inTags;
      });
  
      videoResultsSection.style.display = 'block';
  
      if (matches.length === 0) {
        videoContainer.innerHTML = `
          <div class="video-placeholder">
            No local videos matched: <strong>${escapeHtml(query)}</strong><br/>
            Try: city, ocean, forest, coffee, workout, coding
          </div>
        `;
        return;
      }
  
      videoContainer.innerHTML = '';
      matches.forEach((videoData) => {
        videoContainer.appendChild(createVideoCard(videoData));
      });
  
      videoResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    function createVideoCard(videoData) {
      const card = document.createElement('div');
      card.className = 'video-item';
  
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'video-media';
  
      const video = document.createElement('video');
      video.setAttribute('preload', 'metadata');
      video.setAttribute('playsinline', 'true');
      video.dataset.videoCard = 'true';
      video.src = videoData.src;
  
      if (videoData.poster) video.poster = videoData.poster;
  
      const overlay = document.createElement('div');
      overlay.className = 'video-overlay';
  
      const playBig = document.createElement('button');
      playBig.className = 'video-big-play';
      playBig.type = 'button';
      playBig.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14l11-7z"></path>
        </svg>
      `;
  
      overlay.appendChild(playBig);
      mediaWrap.appendChild(video);
      mediaWrap.appendChild(overlay);
  
      const meta = document.createElement('div');
      meta.className = 'video-meta';
  
      const title = document.createElement('div');
      title.className = 'video-title';
      title.textContent = videoData.title || 'Untitled';
  
      const tags = document.createElement('div');
      tags.className = 'video-tags';
      tags.textContent = Array.isArray(videoData.tags) ? videoData.tags.join(' • ') : '';
  
      meta.appendChild(title);
      meta.appendChild(tags);
  
      const controls = document.createElement('div');
      controls.className = 'video-controls';
  
      const left = document.createElement('div');
      left.className = 'video-controls-left';
  
      const btnPlay = document.createElement('button');
      btnPlay.type = 'button';
      btnPlay.className = 'video-btn';
      btnPlay.textContent = 'Play';
  
      const btnMute = document.createElement('button');
      btnMute.type = 'button';
      btnMute.className = 'video-btn';
      btnMute.textContent = 'Mute';
  
      const time = document.createElement('div');
      time.className = 'video-time';
      time.textContent = '0:00 / 0:00';
  
      left.appendChild(btnPlay);
      left.appendChild(btnMute);
      left.appendChild(time);
  
      const progressWrap = document.createElement('div');
      progressWrap.className = 'video-progress-wrap';
  
      const progress = document.createElement('input');
      progress.type = 'range';
      progress.min = '0';
      progress.max = '1000';
      progress.value = '0';
      progress.className = 'video-progress';
  
      progressWrap.appendChild(progress);
  
      const right = document.createElement('div');
      right.className = 'video-controls-right';
  
      const speed = document.createElement('select');
      speed.className = 'video-speed';
      [
        { label: '0.5x', value: 0.5 },
        { label: '0.75x', value: 0.75 },
        { label: '1x', value: 1 },
        { label: '1.25x', value: 1.25 },
        { label: '1.5x', value: 1.5 },
        { label: '2x', value: 2 }
      ].forEach((opt) => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (opt.value === 1) o.selected = true;
        speed.appendChild(o);
      });
  
      const btnPiP = document.createElement('button');
      btnPiP.type = 'button';
      btnPiP.className = 'video-btn';
      btnPiP.textContent = 'PiP';
  
      const btnFs = document.createElement('button');
      btnFs.type = 'button';
      btnFs.className = 'video-btn';
      btnFs.textContent = 'Full';
  
      right.appendChild(speed);
      right.appendChild(btnPiP);
      right.appendChild(btnFs);
  
      controls.appendChild(left);
      controls.appendChild(progressWrap);
      controls.appendChild(right);
  
      card.appendChild(mediaWrap);
      card.appendChild(meta);
      card.appendChild(controls);
  
      function setPlayUi(isPlaying) {
        btnPlay.textContent = isPlaying ? 'Pause' : 'Play';
        overlay.style.opacity = isPlaying ? '0' : '1';
        overlay.style.pointerEvents = isPlaying ? 'none' : 'auto';
      }
  
      function setMuteUi(isMuted) {
        btnMute.textContent = isMuted ? 'Unmute' : 'Mute';
      }
  
      function fmtTime(s) {
        if (!Number.isFinite(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
      }
  
      function updateTime() {
        const cur = video.currentTime || 0;
        const dur = video.duration || 0;
        time.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
  
        if (dur > 0) {
          const val = Math.round((cur / dur) * 1000);
          progress.value = String(Math.min(1000, Math.max(0, val)));
        } else {
          progress.value = '0';
        }
      }
  
      function pauseOthers() {
        document.querySelectorAll('video[data-video-card="true"]').forEach((v) => {
          if (v !== video) v.pause();
        });
      }
  
      async function togglePlay() {
        if (video.paused) {
          pauseOthers();
          try {
            await video.play();
          } catch (e) {}
        } else {
          video.pause();
        }
      }
  
      btnPlay.addEventListener('click', togglePlay);
      playBig.addEventListener('click', togglePlay);
      video.addEventListener('click', togglePlay);
  
      btnMute.addEventListener('click', () => {
        video.muted = !video.muted;
        setMuteUi(video.muted);
      });
  
      video.addEventListener('play', () => setPlayUi(true));
      video.addEventListener('pause', () => setPlayUi(false));
      video.addEventListener('ended', () => setPlayUi(false));
  
      video.addEventListener('loadedmetadata', updateTime);
      video.addEventListener('timeupdate', updateTime);
      video.addEventListener('durationchange', updateTime);
  
      progress.addEventListener('input', () => {
        const dur = video.duration || 0;
        if (dur <= 0) return;
        const ratio = Number(progress.value) / 1000;
        video.currentTime = ratio * dur;
      });
  
      speed.addEventListener('change', () => {
        const val = Number(speed.value);
        video.playbackRate = Number.isFinite(val) ? val : 1;
      });
  
      btnFs.addEventListener('click', async () => {
        const el = mediaWrap;
        const doc = document;
        if (doc.fullscreenElement) {
          try {
            await doc.exitFullscreen();
          } catch (e) {}
          return;
        }
        if (el.requestFullscreen) {
          try {
            await el.requestFullscreen();
          } catch (e) {}
        }
      });
  
      btnPiP.addEventListener('click', async () => {
        const pipSupported = typeof document.pictureInPictureEnabled === 'boolean' && document.pictureInPictureEnabled;
        if (!pipSupported || !video.requestPictureInPicture) {
          btnPiP.textContent = 'PiP N/A';
          setTimeout(() => (btnPiP.textContent = 'PiP'), 1200);
          return;
        }
  
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            pauseOthers();
            if (video.paused) {
              try {
                await video.play();
              } catch (e) {}
            }
            await video.requestPictureInPicture();
          }
        } catch (e) {}
      });
  
      video.addEventListener('volumechange', () => setMuteUi(video.muted));
      setPlayUi(false);
      setMuteUi(video.muted);
      updateTime();
  
      return card;
    }
  
    function syncAllMuteButtons() {
      document.querySelectorAll('.video-item').forEach((card) => {
        const v = card.querySelector('video[data-video-card="true"]');
        const btn = card.querySelector('.video-controls .video-controls-left .video-btn:nth-child(2)');
        if (v && btn) btn.textContent = v.muted ? 'Unmute' : 'Mute';
      });
    }
  
    function escapeHtml(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
  });
  