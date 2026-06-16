/* Sound Studio Widget Controller */
const SoundStudio = {
  audioCtx: null,
  masterGain: null,
  analyser: null,
  volume: 0.3,
  oscType: 'sine',
  activeOscs: {}, // Map freq -> { osc, gainNode }
  visualizerAnimId: null,
  canvas: null,
  canvasCtx: null,
  isOpened: false,

  // Mapping keys
  keyNotes: {
    'A': '261.63', // C4
    'S': '293.66', // D4
    'D': '329.63', // E4
    'F': '349.23', // F4
    'G': '392.00', // G4
    'H': '440.00', // A4
    'J': '493.88', // B4
    'K': '523.25'  // C5
  },

  keyDrums: {
    'Q': 'kick',
    'W': 'snare',
    'E': 'hihat',
    'R': 'tom'
  },

  initialized: false,
  pressedKeys: {}, // Tracks keys currently held down

  init() {
    if (this.initialized) return;
    this.initialized = true;

    console.log('SoundStudio initializing...');
    this.canvas = document.getElementById('studioVisualizer');
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
      // Set canvas display dimensions
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }

    this.bindEvents();
  },

  bindEvents() {
    const self = this;

    // Trigger floating button click
    $('#studioTrigger').on('click', function() {
      $(this).toggleClass('active');
      $('#studioPanel').toggleClass('show');
      self.isOpened = $('#studioPanel').hasClass('show');
      
      if (self.isOpened) {
        self.startAudio();
        self.startVisualizer();
      } else {
        self.stopVisualizer();
      }
    });

    // Close button click
    $('#studioCloseBtn').on('click', function() {
      $('#studioTrigger').removeClass('active');
      $('#studioPanel').removeClass('show');
      self.isOpened = false;
      self.stopVisualizer();
    });

    // Switch between Synth Keys and Drum Pads tabs
    $('.sound-studio-tab').on('click', function() {
      $('.sound-studio-tab').removeClass('active');
      $(this).addClass('active');
      
      const tab = $(this).data('tab');
      $('.studio-content-pane').removeClass('active');
      $(`#pane-${tab}`).addClass('active');
    });

    // Volume control
    $('#studioVolume').on('input', function() {
      self.volume = parseFloat($(this).val());
      if (self.masterGain) {
        self.masterGain.gain.setValueAtTime(self.volume, self.audioCtx.currentTime);
      }
    });

    // Oscillator waveform select
    $('#studioOscillator').on('change', function() {
      self.oscType = $(this).val();
    });

    // Keyboard mouse play triggers (Synth keys)
    $('.synth-key').on('mousedown', function() {
      self.startAudio();
      const freq = $(this).data('note');
      $(this).addClass('active');
      self.playNote(freq);
    }).on('mouseup mouseleave', function() {
      const freq = $(this).data('note');
      $(this).removeClass('active');
      self.stopNote(freq);
    });

    // Drum Pad mouse play triggers
    $('.drum-pad').on('mousedown', function() {
      self.startAudio();
      const drum = $(this).data('drum');
      $(this).addClass('active');
      self.playDrum(drum);
    }).on('mouseup mouseleave', function() {
      $(this).removeClass('active');
    });

    // Computer Keyboard binds
    $(window).on('keydown', function(e) {
      if ($(e.target).is('input, textarea, select')) return;

      const key = e.key.toUpperCase();
      
      // Prevent repeating triggers when holding key down
      if (self.pressedKeys[key]) return;

      // Check for synth notes
      if (self.keyNotes[key]) {
        self.startAudio();
        self.pressedKeys[key] = true;
        const freq = self.keyNotes[key];
        const $el = $(`.synth-key[data-key="${key}"]`);
        $el.addClass('active');
        self.playNote(freq);
      }

      // Check for drum pads
      if (self.keyDrums[key]) {
        self.startAudio();
        self.pressedKeys[key] = true;
        const drum = self.keyDrums[key];
        const $el = $(`.drum-pad[data-key="${key}"]`);
        $el.addClass('active');
        self.playDrum(drum);
      }
    });

    $(window).on('keyup', function(e) {
      const key = e.key.toUpperCase();
      self.pressedKeys[key] = false;

      // Stop synth notes
      if (self.keyNotes[key]) {
        const freq = self.keyNotes[key];
        const $el = $(`.synth-key[data-key="${key}"]`);
        $el.removeClass('active');
        self.stopNote(freq);
      }

      // Release drum pads
      if (self.keyDrums[key]) {
        const $el = $(`.drum-pad[data-key="${key}"]`);
        $el.removeClass('active');
      }
    });

    // Resize canvas visualizer dynamically
    $(window).on('resize.studio', function() {
      if (self.canvas) {
        self.canvas.width = self.canvas.clientWidth;
        self.canvas.height = self.canvas.clientHeight;
      }
    });
  },

  startAudio() {
    if (this.audioCtx) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      
      // Master Volume Control node
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      
      // Real-time Analyser node for oscilloscope visualizer
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      
      // Connection routing: engine -> masterGain -> analyser -> output speakers
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      
      console.log('Web Audio Context initialized successfully!');
    } catch (e) {
      console.error('Web Audio API is not supported in this browser:', e);
    }
  },

  playNote(freq) {
    if (!this.audioCtx) return;
    
    // Resume audio context if suspended by browser security policy
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    // If note is already playing, stop it first to prevent overlapping issues
    if (this.activeOscs[freq]) {
      this.stopNote(freq);
    }

    // Create oscillator and note-specific gain envelope
    const osc = this.audioCtx.createOscillator();
    const noteGain = this.audioCtx.createGain();

    osc.type = this.oscType;
    osc.frequency.setValueAtTime(parseFloat(freq), now);

    // Apply clean ADSR envelope (Attack: 0.015s, Release: 0.15s)
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(1.0, now + 0.015);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(now);

    this.activeOscs[freq] = { osc, noteGain };
  },

  stopNote(freq) {
    if (!this.activeOscs[freq]) return;

    const now = this.audioCtx.currentTime;
    const oscInfo = this.activeOscs[freq];
    
    // Remove pointer immediately to avoid duplicate stop triggers
    delete this.activeOscs[freq];

    // Trigger exponential release phase (0.15s decay)
    oscInfo.noteGain.gain.cancelScheduledValues(now);
    oscInfo.noteGain.gain.setValueAtTime(oscInfo.noteGain.gain.value, now);
    oscInfo.noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscInfo.osc.stop(now + 0.16);
    setTimeout(() => {
      try {
        oscInfo.osc.disconnect();
        oscInfo.noteGain.disconnect();
      } catch (e) {}
    }, 200);
  },

  playDrum(type) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    if (type === 'kick') {
      // Synth Kick drum: fast pitch sweep down with gain decay
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.12);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.13);
    } 
    else if (type === 'tom') {
      // Tom drum: pitch sweep down starting at a higher pitch than kick
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    }
    else if (type === 'snare') {
      // Snare drum: highpass noise + mid frequency pop
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();

      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Snare tone "pop" (simulating head snap)
      const snapOsc = this.audioCtx.createOscillator();
      const snapGain = this.audioCtx.createGain();

      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(180, now);
      snapGain.gain.setValueAtTime(0.5, now);
      snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      snapOsc.connect(snapGain);
      snapGain.connect(this.masterGain);

      noise.start(now);
      snapOsc.start(now);
      
      noise.stop(now + 0.2);
      snapOsc.stop(now + 0.09);
    } 
    else if (type === 'hihat') {
      // Hi-Hat cymbal: high-pass filtered white noise with very short decay
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.06);
    }
  },

  createNoiseBuffer() {
    const bufferSize = this.audioCtx.sampleRate * 0.4;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  startVisualizer() {
    if (!this.canvasCtx || !this.analyser) return;
    this.stopVisualizer(); // Clear existing loops

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const self = this;

    function draw() {
      self.visualizerAnimId = requestAnimationFrame(draw);
      self.analyser.getByteTimeDomainData(dataArray);

      const width = self.canvas.width;
      const height = self.canvas.height;
      const ctx = self.canvasCtx;

      // Draw background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);

      // Set line style (rose gold neon glow)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#FB7185';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(251, 113, 133, 0.7)';

      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Normalizing data to -1..1 range
        const v = dataArray[i] / 128.0; 
        const y = (v * height) / 2.0;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // Reset shadow blur
      ctx.shadowBlur = 0;
    }

    draw();
  },

  stopVisualizer() {
    if (this.visualizerAnimId) {
      cancelAnimationFrame(this.visualizerAnimId);
      this.visualizerAnimId = null;
    }

    // Reset visualizer canvas to a straight horizontal line
    if (this.canvasCtx) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.canvasCtx.fillRect(0, 0, w, h);
      this.canvasCtx.lineWidth = 1.5;
      this.canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.canvasCtx.shadowBlur = 0;
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(0, h / 2);
      this.canvasCtx.lineTo(w, h / 2);
      this.canvasCtx.stroke();
    }
  }
};

$(document).ready(() => {
  SoundStudio.init();
});
