export function playMeow() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio error", e);
  }
}

export function playEatSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error("Audio error", e);
  }
}

export function playBark() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Audio error", e);
  }
}

export function playGameOverSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch (e) {
    console.error("Audio error", e);
  }
}

let bgmCtx: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let bgmTimeout: any = null;
let rainNode: AudioBufferSourceNode | null = null;

export function playBGM(weather: 'day' | 'night' | 'rain' = 'day') {
  if (bgmCtx) return; 
  try {
    bgmCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let chords = [
      [261.63, 329.63, 392.00], // C4, E4, G4
      [220.00, 261.63, 329.63], // A3, C4, E4
      [174.61, 220.00, 261.63], // F3, A3, C4
      [196.00, 246.94, 293.66], // G3, B3, D4
    ];
    
    if (weather === 'night') {
      chords = [
        [220.00, 261.63, 329.63], // A minor
        [196.00, 233.08, 293.66], // G minor
        [174.61, 207.65, 261.63], // F minor
      ];
    }
    
    bgmGain = bgmCtx.createGain();
    bgmGain.gain.value = weather === 'rain' ? 0.02 : 0.03; 
    bgmGain.connect(bgmCtx.destination);
    
    // Simulate Rain if weather is rain (White Noise)
    if (weather === 'rain' && bgmCtx) {
      const bufferSize = bgmCtx.sampleRate * 2;
      const buffer = bgmCtx.createBuffer(1, bufferSize, bgmCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      rainNode = bgmCtx.createBufferSource();
      rainNode.buffer = buffer;
      rainNode.loop = true;
      
      const rainFilter = bgmCtx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1000;
      
      const rainGain = bgmCtx.createGain();
      rainGain.gain.value = 0.05;
      
      rainNode.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(bgmCtx.destination);
      rainNode.start();
    }
    
    let currentChord = 0;
    
    const playNextChord = () => {
      if (!bgmCtx) return;
      
      const chord = chords[currentChord];
      currentChord = (currentChord + 1) % chords.length;
      
      const now = bgmCtx.currentTime;
      
      chord.forEach((freq) => {
        const osc = bgmCtx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const oscGain = bgmCtx!.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.2, now + 1.5);
        oscGain.gain.linearRampToValueAtTime(0, now + 3.5);
        
        osc.connect(oscGain);
        oscGain.connect(bgmGain!);
        
        osc.start(now);
        osc.stop(now + 4);
      });
      
      bgmTimeout = setTimeout(playNextChord, 3500); 
    };
    
    playNextChord();
  } catch(e) {
    console.error(e);
  }
}

export function stopBGM() {
  if (bgmTimeout) clearTimeout(bgmTimeout);
  if (rainNode) {
    try { rainNode.stop(); } catch(e) {}
    rainNode = null;
  }
  if (bgmCtx) {
    bgmCtx.close();
    bgmCtx = null;
    bgmGain = null;
  }
}
