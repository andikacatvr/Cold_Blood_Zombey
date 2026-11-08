import { gameSettings } from '../config/settings.js';

    /* =========================================================================
       SYNTHESIZED WEB AUDIO (WIND, CHURCH BELL, CHOIR SCREAMS, SHOTGUN, SPLATS)
       ========================================================================= */
    const Sfx = {
      ctx: null,
      masterGain: null,
      windNode: null,
      horrorDroneNode: null,
      waterfallRoarNode: null,
      waterfallRoarGain: null,
      lastHeartbeatTime: 0,
      bellAmbientActive: false,
      bellTimer: null,
      bossVoiceAudio: null,
      nonaBataviaVoiceAudio: null,
      lastStepTime: 0,
      gameState: null,
      isGameActive() {
        if (!this.gameState) return true;
        return this.gameState.running && !this.gameState.isPaused;
      },
      init(stateRef) {
        if (stateRef) this.gameState = stateRef;
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(gameSettings.volume, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
          this.startWinterWind();
          this.startHorrorSubDrone();
          this.startSmallBellAmbient();
          this.startWaterfallRoar();
        }
        if (!this.bossVoiceAudio) {
          try {
            this.bossVoiceAudio = new Audio('/audio/whatsapp_boss_voicenote.ogg');
            this.bossVoiceAudio.preload = 'auto';
            this.bossVoiceAudio.load();
          } catch (e) {}
        }
        if (!this.nonaBataviaVoiceAudio) {
          try {
            this.nonaBataviaVoiceAudio = new Audio('/audio/nonabatavianoice.ogg');
            this.nonaBataviaVoiceAudio.preload = 'auto';
            this.nonaBataviaVoiceAudio.load();
          } catch (e) {}
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      },
      dest() {
        return this.masterGain || (this.ctx ? this.ctx.destination : null);
      },
      setVolume(val) {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
        }
        if (this.bossVoiceAudio) {
          this.bossVoiceAudio.volume = Math.min(1.0, val * 1.25);
        }
        if (this.nonaBataviaVoiceAudio) {
          this.nonaBataviaVoiceAudio.volume = Math.min(1.0, val * 1.35);
        }
      },
      playLifeLost() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.65);
      },
      startWinterWind() {
        if (!this.ctx || this.windNode) return;
        const bufSize = this.ctx.sampleRate * 3;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, this.ctx.currentTime);
        filter.Q.setValueAtTime(4.2, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest());
        noise.start();
        this.windNode = noise;
      },
      // Psychological Horror Sub-Bass Drone (unsettling low tension hum)
      startHorrorSubDrone() {
        if (!this.ctx || this.horrorDroneNode) return;
        try {
          const now = this.ctx.currentTime;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(50, now);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(51.4, now); // Slow 1.4Hz binaural dread beating

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(105, now);

          gain.gain.setValueAtTime(0.24, now);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.dest());

          osc1.start();
          osc2.start();
          this.horrorDroneNode = { osc1, osc2, gain };
        } catch (e) {}
      },
      startWaterfallRoar() {
        if (!this.ctx || this.waterfallRoarNode) return;
        try {
          const bufSize = this.ctx.sampleRate * 2;
          const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.6;
          }

          const source = this.ctx.createBufferSource();
          source.buffer = buf;
          source.loop = true;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, this.ctx.currentTime);
          filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

          source.connect(filter);
          filter.connect(gain);
          gain.connect(this.dest());
          source.start();

          this.waterfallRoarNode = source;
          this.waterfallRoarGain = gain;
        } catch (e) {}
      },
      updateWaterfallSpatialAudio(playerPos) {
        if (!this.waterfallRoarGain || !this.ctx || !playerPos) return;
        const dist = Math.hypot(playerPos.x - 42.0, playerPos.z - (-56.2));
        if (dist > 38.0) {
          this.waterfallRoarGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
        } else {
          const factor = Math.max(0, 1.0 - (dist / 38.0));
          const vol = factor * factor * 0.42 * (gameSettings.volume || 0.8);
          this.waterfallRoarGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.12);
        }
      },
      // Dread Heartbeat ("lub-dub" visceral pulse when surrounded or wounded)
      playHeartbeat(urgency = 1.0) {
        if (!this.ctx) return;
        const now = performance.now();
        const minGap = urgency > 1.2 ? 550 : 850;
        if (now - this.lastHeartbeatTime < minGap) return;
        this.lastHeartbeatTime = now;

        try {
          const t = this.ctx.currentTime;
          // First thud ("lub")
          const o1 = this.ctx.createOscillator();
          const g1 = this.ctx.createGain();
          o1.type = 'sine';
          o1.frequency.setValueAtTime(56, t);
          o1.frequency.exponentialRampToValueAtTime(30, t + 0.14);
          g1.gain.setValueAtTime(0.55 * urgency, t);
          g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          o1.connect(g1);
          g1.connect(this.dest());
          o1.start(t);
          o1.stop(t + 0.16);

          // Second thud ("dub")
          const o2 = this.ctx.createOscillator();
          const g2 = this.ctx.createGain();
          o2.type = 'sine';
          o2.frequency.setValueAtTime(48, t + 0.20);
          o2.frequency.exponentialRampToValueAtTime(26, t + 0.35);
          g2.gain.setValueAtTime(0.42 * urgency, t + 0.20);
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.37);
          o2.connect(g2);
          g2.connect(this.dest());
          o2.start(t + 0.20);
          o2.stop(t + 0.38);
        } catch (e) {}
      },
      // Eerie small brass/silver church bell & wind chime sound (lonceng kecil misterius)
      playSmallBell(customFreq = null, volumeScale = 1.0) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bellNotes = [1568, 1760, 2093, 2349, 2637, 3136]; // G6, A6, C7, D7, E7, G7 (crystal pentatonic)
        const f0 = customFreq || bellNotes[Math.floor(Math.random() * bellNotes.length)];

        // 1. Subtle metallic click/ping clapper transient (highpass noise burst)
        try {
          const clickLen = Math.floor(this.ctx.sampleRate * 0.012);
          const clickBuf = this.ctx.createBuffer(1, clickLen, this.ctx.sampleRate);
          const clickData = clickBuf.getChannelData(0);
          for (let i = 0; i < clickLen; i++) {
            clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.002));
          }
          const clickSrc = this.ctx.createBufferSource();
          clickSrc.buffer = clickBuf;
          const clickFilter = this.ctx.createBiquadFilter();
          clickFilter.type = 'highpass';
          clickFilter.frequency.setValueAtTime(3600, now);
          const clickGain = this.ctx.createGain();
          clickGain.gain.setValueAtTime(0.04 * volumeScale, now);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
          clickSrc.connect(clickFilter);
          clickFilter.connect(clickGain);
          clickGain.connect(this.dest());
          clickSrc.start(now);
        } catch (e) {}

        // 2. Bell physical harmonic modes (prime, minor 3rd tierce, fifth, octave, high chime overtone)
        const modes = [
          { mult: 1.000, detune: 0.0, vol: 0.14, decay: 2.2 },   // fundamental core
          { mult: 1.000, detune: 1.6, vol: 0.09, decay: 2.0 },   // twin shimmer detune (acoustic bell beating)
          { mult: 1.205, detune: 0.0, vol: 0.09, decay: 1.5 },   // minor third tierce (haunting bell color)
          { mult: 1.503, detune: 0.0, vol: 0.07, decay: 1.2 },   // fifth
          { mult: 2.012, detune: 0.0, vol: 0.05, decay: 0.8 },   // octave
          { mult: 2.980, detune: 0.0, vol: 0.03, decay: 0.45 }   // high chime sparkle
        ];

        modes.forEach(m => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f0 * m.mult + m.detune, now);

          const targetVol = m.vol * volumeScale;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVol, now + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + m.decay);

          osc.connect(gain);
          gain.connect(this.dest());
          osc.start(now);
          osc.stop(now + m.decay + 0.05);
        });
      },
      // Continuous eerie ambient background loop (backsound lonceng kecil yang berdering di hembusan angin)
      startSmallBellAmbient() {
        if (!this.ctx || this.bellAmbientActive) return;
        this.bellAmbientActive = true;

        const scheduleNextBell = () => {
          // Delay between 3.5 and 7.5 seconds for natural wind bell chimes
          const delay = 3500 + Math.random() * 4000;
          this.bellTimer = setTimeout(() => {
            if (this.ctx && this.ctx.state === 'running' && this.isGameActive()) {
              const roll = Math.random();
              if (roll < 0.60) {
                // Single gentle bell chime
                this.playSmallBell(null, 0.9);
              } else if (roll < 0.88) {
                // Melodic dual chime (ting... ting...)
                const note1 = [1760, 2093, 2349][Math.floor(Math.random() * 3)];
                const note2 = [2349, 2637, 3136][Math.floor(Math.random() * 3)];
                this.playSmallBell(note1, 0.85);
                setTimeout(() => {
                  if (this.isGameActive()) this.playSmallBell(note2, 0.8);
                }, 260 + Math.random() * 180);
              } else {
                // Breeze wind chime triplet (ting.. ting. ting...)
                const notes = [1760, 2093, 2637];
                this.playSmallBell(notes[0], 0.75);
                setTimeout(() => {
                  if (this.isGameActive()) this.playSmallBell(notes[1], 0.75);
                }, 200 + Math.random() * 80);
                setTimeout(() => {
                  if (this.isGameActive()) this.playSmallBell(notes[2], 0.7);
                }, 440 + Math.random() * 120);
              }
            }
            scheduleNextBell();
          }, delay);
        };

        // First gentle chime shortly after game begins
        setTimeout(() => {
          if (this.ctx && this.isGameActive()) {
            this.playSmallBell(2093, 0.8);
          }
        }, 1800);

        scheduleNextBell();
      },
      playSnowStep() {
        if (!this.ctx) return;
        const now = performance.now();
        if (now - this.lastStepTime < 340) return;
        this.lastStepTime = now;

        const t = this.ctx.currentTime;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.08);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest());
        src.start(t);
      },
      playWaterSplash() {
        if (!this.ctx) return;
        const now = performance.now();
        if (now - this.lastStepTime < 320) return;
        this.lastStepTime = now;

        const t = this.ctx.currentTime;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.14);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, t);
        filter.frequency.exponentialRampToValueAtTime(320, t + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest());
        src.start(t);
      },
      playShotgun() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.28);
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.32);

        const bufSize = this.ctx.sampleRate * 0.26;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.045));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(260, now + 0.24);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.9, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.dest());
        noise.start(now);
      },
      playPumpRack() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0.0, 0.12].forEach((delay, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(idx === 0 ? 340 : 580, now + delay);
          osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 580 : 280, now + delay + 0.07);

          gain.gain.setValueAtTime(0.16, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

          osc.connect(gain);
          gain.connect(this.dest());
          osc.start(now + delay);
          osc.stop(now + delay + 0.08);
        });
      },
      playSpinCock() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0.0, 0.15].forEach((delay, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(idx === 0 ? 580 : 760, now + delay);
          osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 280 : 380, now + delay + 0.05);

          gain.gain.setValueAtTime(0.26, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

          osc.connect(gain);
          gain.connect(this.dest());
          osc.start(now + delay);
          osc.stop(now + delay + 0.07);
        });
      },
      playShellInsert() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.07);
      },
      playBladeWhoosh() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufSize = Math.floor(this.ctx.sampleRate * 0.20);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2.8;
        filter.frequency.setValueAtTime(1150, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.18);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest());
        noise.start(now);
      },
      playBladeCleave() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Sharp metallic edge slice
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.20);

        // Visceral flesh splat crunch
        const bufSize = Math.floor(this.ctx.sampleRate * 0.18);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.75, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(nGain);
        nGain.connect(this.dest());
        noise.start(now);
      },
      playDoorBlast() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Heavy low-end impact of door blast
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(26, now + 0.38);
        gain.gain.setValueAtTime(0.92, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.42);

        // 2. High-energy wood splintering & cracking crash
        const bufSize = Math.floor(this.ctx.sampleRate * 0.36);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.065));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2.0;
        filter.frequency.setValueAtTime(1450, now);
        filter.frequency.exponentialRampToValueAtTime(260, now + 0.32);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.9, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.dest());
        noise.start(now);
      },
      playZombieGroan() {
        this.playL4DRoar();
      },
      // Left 4 Dead iconic infected frenzy shrieks & guttural growls
      playL4DRoar() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = 0.55 + Math.random() * 0.35;

        // 1. Manic rasping vocal screech (sawtooth through swept aggressive vocal formant)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const startPitch = 240 + Math.random() * 110;
        osc.frequency.setValueAtTime(startPitch, now);
        osc.frequency.exponentialRampToValueAtTime(startPitch * 1.6, now + dur * 0.35);
        osc.frequency.exponentialRampToValueAtTime(startPitch * 0.55, now + dur);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 3.4;
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(1600, now + dur * 0.4);
        filter.frequency.linearRampToValueAtTime(450, now + dur);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.36, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + dur + 0.05);

        // 2. Guttural wet throat rattle
        try {
          const bufLen = Math.floor(this.ctx.sampleRate * dur);
          const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (dur * 0.65)));
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;
          const nFilt = this.ctx.createBiquadFilter();
          nFilt.type = 'bandpass';
          nFilt.Q.value = 4.2;
          nFilt.frequency.setValueAtTime(620, now);
          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.25, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
          noise.connect(nFilt);
          nFilt.connect(nGain);
          nGain.connect(this.dest());
          noise.start(now);
        } catch (e) {}
      },
      // Left 4 Dead aggressive claw swipe whoosh & bite snap
      playL4DAttackSwipe() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.14);
        this.playImpactSplat();
      },
      // Left 4 Dead hit stagger gasp / bullet impact stumble grunt
      playL4DStagger() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
        gain.gain.setValueAtTime(0.30, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.20);
      },
      // Left 4 Dead shotgun headshot decapitation bone crunch & wet pop
      playL4DHeadDecap() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.18);
        this.playImpactSplat();
      },
      playImpactSplat() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(290, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.13);
      },
      playSnowThud(weight = 1.0) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110 * weight, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.24);
        gain.gain.setValueAtTime(0.6 * weight, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.26);
      },
      // SISTER VALENTINA BOSS AUDIO
      playChurchBellToll() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [156, 312, 468, 624].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.3 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

          osc.connect(gain);
          gain.connect(this.dest());
          osc.start(now);
          osc.stop(now + 3.0);
        });
      },
      playNunChoirScream() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Dual dissonant wailing oscs (Banshee Choir)
        [587.33, 622.25].forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + 0.8);
          osc.frequency.linearRampToValueAtTime(freq * 0.4, now + 1.8);

          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.setValueAtTime(6.0, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.dest());
          osc.start(now);
          osc.stop(now + 1.9);
        });
      },
      playTeleportWhoosh() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.48);
      },
      playCurseOrbCast() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.35);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.38);
      },
      // WhatsApp Voice Note audio when Sister Valentina Boss appears
      playBossVoiceNote() {
        try {
          if (!this.bossVoiceAudio) {
            this.bossVoiceAudio = new Audio('/audio/whatsapp_boss_voicenote.ogg');
          }
          const vol = (gameSettings && gameSettings.volume !== undefined) ? gameSettings.volume : 0.8;
          this.bossVoiceAudio.volume = Math.min(1.0, Math.max(0.1, vol * 1.25));
          this.bossVoiceAudio.currentTime = 0;
          const p = this.bossVoiceAudio.play();
          if (p && p.catch) {
            p.catch(err => {
              console.warn("Retrying boss voice note with fallback path:", err);
              const alt = new Audio('/audio/WhatsApp%20Ptt%202026-10-23%20at%2017.20.48.ogg');
              alt.volume = this.bossVoiceAudio.volume;
              alt.play().catch(e => console.warn("Fallback boss voice note failed:", e));
            });
          }
        } catch (e) {
          console.warn("playBossVoiceNote error:", e);
        }
      },
      // Dramatic Boss Death Shockwave & Detonation Boom
      playBossDeathBoom() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Heavy Sub-Bass Cinematic Boom (180Hz drop to 28Hz)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(180, now);
        subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.6);
        subGain.gain.setValueAtTime(0.85, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        subOsc.connect(subGain);
        subGain.connect(this.dest());
        subOsc.start(now);
        subOsc.stop(now + 1.85);

        // 2. Aggressive Blast Noise & Shatter Transients
        const bufSize = Math.floor(this.ctx.sampleRate * 1.5);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 1.2);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.75, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.dest());
        noise.start(now);

        // 3. High-Pitched Glass/Crystal Spectral Shatter Burst
        const shatterOsc = this.ctx.createOscillator();
        const shatterGain = this.ctx.createGain();
        shatterOsc.type = 'triangle';
        shatterOsc.frequency.setValueAtTime(2800, now);
        shatterOsc.frequency.exponentialRampToValueAtTime(420, now + 0.6);
        shatterGain.gain.setValueAtTime(0.45, now);
        shatterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        shatterOsc.connect(shatterGain);
        shatterGain.connect(this.dest());
        shatterOsc.start(now);
        shatterOsc.stop(now + 0.7);
      },

      // Overcharging Eerie Screech right before boss detonation
      playNonaBataviaDeathCharge() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(880, now + 1.7);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 1.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 1.85);
      },

      // Voice recording & scream for Nona Batavia (Ghost Boss Cutscene)
      playNonaBataviaVoice() {
        try {
          if (!this.nonaBataviaVoiceAudio) {
            this.nonaBataviaVoiceAudio = new Audio('/audio/nonabatavianoice.ogg');
          }
          const vol = (gameSettings && gameSettings.volume !== undefined) ? gameSettings.volume : 0.8;
          this.nonaBataviaVoiceAudio.volume = Math.min(1.0, Math.max(0.1, vol * 1.35));
          this.nonaBataviaVoiceAudio.currentTime = 0;
          const p = this.nonaBataviaVoiceAudio.play();
          if (p && p.catch) {
            p.catch(err => console.warn('playNonaBataviaVoice play failed:', err));
          }
        } catch (e) {
          console.warn('playNonaBataviaVoice error:', e);
        }
      },
      stopNonaBataviaVoice() {
        try {
          if (this.nonaBataviaVoiceAudio) {
            this.nonaBataviaVoiceAudio.pause();
            this.nonaBataviaVoiceAudio.currentTime = 0;
          }
        } catch (e) {}
      },
      // Ethereal wail for Nona Batavia (Floating Boss Selingan)
      playNonaBataviaScream() {
        this.playNonaBataviaVoice();
        this.playLadyMithrillScream();
      },
      playLadyMithrillScream() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(620, now);
        osc1.frequency.linearRampToValueAtTime(1080, now + 0.35);
        osc1.frequency.exponentialRampToValueAtTime(380, now + 1.3);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(625, now);
        osc2.frequency.linearRampToValueAtTime(1095, now + 0.35);
        osc2.frequency.exponentialRampToValueAtTime(375, now + 1.3);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.42, now + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.dest());
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.45);
        osc2.stop(now + 1.45);
      },
      // Eerie resonance when Lady Mithrill summons zombie horde
      playSpectralSummonChime() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(this.dest());
        osc.start(now);
        osc.stop(now + 0.9);
      },
      // Terrifying Victorian Bride horror jumpscare sting (piercing screech + harsh noise burst + sub bass shock)
      playBrideJumpscareScream() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. High screeching dissonant scream (minor second interval)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const screamGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(1380, now);
        osc1.frequency.exponentialRampToValueAtTime(2450, now + 0.10);
        osc1.frequency.exponentialRampToValueAtTime(720, now + 0.58);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1460, now);
        osc2.frequency.exponentialRampToValueAtTime(2520, now + 0.10);
        osc2.frequency.exponentialRampToValueAtTime(690, now + 0.58);

        screamGain.gain.setValueAtTime(0.85, now);
        screamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc1.connect(screamGain);
        osc2.connect(screamGain);
        screamGain.connect(this.dest());
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.68);
        osc2.stop(now + 0.68);

        // 2. Sudden harsh noise blast (throat hiss & visceral breath blast)
        try {
          const bufSize = Math.floor(this.ctx.sampleRate * 0.48);
          const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;

          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(1900, now);
          noiseFilter.Q.setValueAtTime(1.8, now);

          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.9, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.dest());
          noise.start(now);
          noise.stop(now + 0.55);
        } catch (e) {}

        // 3. Low sub-bass chest thump
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(130, now);
        subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.42);
        subGain.gain.setValueAtTime(0.95, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        subOsc.connect(subGain);
        subGain.connect(this.dest());
        subOsc.start(now);
        subOsc.stop(now + 0.50);
      }
    };

export default Sfx;
export { Sfx };
