function createAudioContext() {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (e) {
    return null;
  }
}

export function unlockAudio() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // ignore
  }
}

// Shared short open/close tones using Web Audio API
export function playOpenTone(volume = 1) {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;

    const schedule = () => {
      const now = ctx.currentTime;
      const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        gainNode.gain.setValueAtTime(0.0001, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };

      const level = Math.min(0.12, 0.05 * volume);
      playTone(860, 0.14, level, 0);
      playTone(1180, 0.14, level, 0.07);
      setTimeout(() => ctx.close(), 700);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(schedule).catch(() => {});
    } else {
      schedule();
    }
  } catch (e) {
    // ignore
  }
}

export type BellTone = "traditional" | "deep" | "mechanical" | "carillon" | "siren" | "police" | "urgent" | "classic" | "double" | "school" | "soft" | "marimba" | "alert" | "church" | "ding" | "transition" | "policeAudio";
export type BellRingMode = "count" | "continuous";
let bellPatternTimeouts: number[] = [];
let activeBellContexts: AudioContext[] = [];
let activeBellAudio: HTMLAudioElement[] = [];

type BellProfile = { sequence: Array<[number, number, number]>; partials: Array<[number, number]>; gain: number; waveform: OscillatorType; sweep?: [number, number] };
type SynthBellTone = Exclude<BellTone, "church" | "ding" | "transition" | "policeAudio">;

const bellProfiles: Record<SynthBellTone, BellProfile> = {
  traditional: { sequence: [[392, 0, 1.1], [330, 0.18, 1.35]], partials: [[1, 1], [2.01, 0.42], [2.98, 0.2], [4.1, 0.1]], gain: 0.16, waveform: "sine" },
  deep: { sequence: [[262, 0, 1.35], [196, 0.2, 1.5]], partials: [[1, 1], [2, 0.5], [3.01, 0.24], [4.2, 0.12]], gain: 0.2, waveform: "sine" },
  mechanical: { sequence: [[740, 0, 0.25], [554, 0.05, 0.32], [740, 0.38, 0.25], [554, 0.43, 0.32]], partials: [[1, 1], [2.4, 0.28], [4, 0.12]], gain: 0.17, waveform: "square" },
  carillon: { sequence: [[523, 0, 0.45], [659, 0.3, 0.52], [784, 0.64, 0.68], [1046, 0.98, 1.05]], partials: [[1, 1], [2, 0.38], [3, 0.18], [4.07, 0.1]], gain: 0.14, waveform: "sine" },
  siren: { sequence: [[760, 0, 0.48], [520, 0.52, 0.48], [760, 1.04, 0.48], [520, 1.56, 0.68]], partials: [[1, 1], [2, 0.45], [3.02, 0.22], [4.1, 0.1]], gain: 0.19, waveform: "square" },
  police: { sequence: [[1, 0, 0.62], [1, 0.66, 0.62], [1, 1.32, 0.62]], partials: [[1, 1], [2, 0.3], [3, 0.14]], gain: 0.2, waveform: "sawtooth", sweep: [620, 1120] },
  urgent: { sequence: [[880, 0, 0.26], [660, 0.3, 0.26], [880, 0.6, 0.26], [660, 0.9, 0.4]], partials: [[1, 1], [2, 0.34], [3, 0.16]], gain: 0.18, waveform: "triangle" },
  classic: { sequence: [[880, 0, 0.32], [660, 0.08, 0.42]], partials: [[1, 1], [2, 0.3]], gain: 0.11, waveform: "sine" },
  double: { sequence: [[1046, 0, 0.16], [1318, 0.18, 0.2], [1046, 0.38, 0.16], [1318, 0.56, 0.3]], partials: [[1, 1], [2, 0.25]], gain: 0.11, waveform: "sine" },
  school: { sequence: [[784, 0, 0.24], [988, 0.28, 0.24], [1174, 0.56, 0.36]], partials: [[1, 1], [2, 0.25]], gain: 0.11, waveform: "sine" },
  soft: { sequence: [[659, 0, 0.28], [784, 0.12, 0.34], [988, 0.24, 0.46]], partials: [[1, 1], [2, 0.2]], gain: 0.09, waveform: "sine" },
  marimba: { sequence: [[523, 0, 0.18], [659, 0.2, 0.18], [784, 0.4, 0.22], [1046, 0.64, 0.4]], partials: [[1, 1], [2, 0.18]], gain: 0.11, waveform: "triangle" },
  alert: { sequence: [[1200, 0, 0.13], [900, 0.16, 0.13], [1200, 0.32, 0.13], [900, 0.48, 0.22]], partials: [[1, 1], [2, 0.2]], gain: 0.12, waveform: "square" },
};

export function playBellTone(tone: BellTone = "classic", volume = 1) {
  const audioSources: Partial<Record<BellTone, string>> = {
    church: "/bells/church-bells.mp3",
    ding: "/bells/ding.mp3",
    transition: "/bells/bell-transition.mp3",
    policeAudio: "/bells/police-siren.mp3",
  };
  const audioSource = audioSources[tone];
  if (audioSource) {
    const audio = new Audio(audioSource);
    audio.volume = Math.min(1, Math.max(0, volume));
    activeBellAudio.push(audio);
    audio.addEventListener("ended", () => {
      activeBellAudio = activeBellAudio.filter((activeAudio) => activeAudio !== audio);
    }, { once: true });
    audio.play().catch(() => {
      activeBellAudio = activeBellAudio.filter((activeAudio) => activeAudio !== audio);
    });
    return;
  }

  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    activeBellContexts.push(ctx);
    const profile = bellProfiles[tone as SynthBellTone] || bellProfiles.traditional;
    const schedule = () => {
      const start = ctx.currentTime;
      profile.sequence.forEach(([frequency, delay, duration], sequenceIndex) => {
        profile.partials.forEach(([ratio, volume]) => {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = profile.waveform;
          const sweepStart = profile.sweep ? profile.sweep[sequenceIndex % 2] : frequency;
          const sweepEnd = profile.sweep ? profile.sweep[sequenceIndex % 2 ? 0 : 1] : frequency;
          oscillator.frequency.setValueAtTime(sweepStart * ratio, start + delay);
          oscillator.frequency.linearRampToValueAtTime(sweepEnd * ratio, start + delay + duration);
          gain.gain.setValueAtTime(0.0001, start + delay);
          gain.gain.exponentialRampToValueAtTime(Math.min(0.24, profile.gain * volume), start + delay + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start(start + delay);
          oscillator.stop(start + delay + duration + 0.04);
        });
      });
      const profileDuration = Math.max(...profile.sequence.map(([, delay, duration]) => delay + duration));
      setTimeout(() => {
        activeBellContexts = activeBellContexts.filter((activeContext) => activeContext !== ctx);
        ctx.close().catch(() => {});
      }, (profileDuration + 0.3) * 1000);
    };
    if (ctx.state === "suspended") ctx.resume().then(schedule).catch(() => {});
    else schedule();
  } catch (error) {
    // Audio is optional and may be unavailable in the browser.
  }
}

export function playBellPattern(tone: BellTone, ringMode: BellRingMode, ringCount: number, shouldPlay: () => boolean = () => true) {
  stopBellPattern();
  const count = ringMode === "continuous" ? 10 : Math.max(1, Math.min(5, ringCount));
  for (let index = 0; index < count; index += 1) {
    const timeout = window.setTimeout(() => {
      if (shouldPlay()) playBellTone(tone);
    }, index * 3000);
    bellPatternTimeouts.push(timeout);
  }
}

export function stopBellPattern() {
  bellPatternTimeouts.forEach((timeout) => window.clearTimeout(timeout));
  bellPatternTimeouts = [];
  activeBellContexts.forEach((ctx) => ctx.close().catch(() => {}));
  activeBellContexts = [];
  activeBellAudio.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  activeBellAudio = [];
}

let supportAlertToneState:
  | {
      ctx: AudioContext;
      carrier: OscillatorNode;
      lfo: OscillatorNode;
    }
  | null = null;

export function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 410;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.04, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // ignore
  }
}

function playSessionTone(notes: number[], duration: number, volume: number) {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;

    const schedule = () => {
      const start = ctx.currentTime;
      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = start + index * duration * 0.72;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + duration + 0.03);
      });
      window.setTimeout(() => ctx.close().catch(() => {}), (notes.length * duration) * 1000);
    };

    if (ctx.state === "suspended") ctx.resume().then(schedule).catch(() => {});
    else schedule();
  } catch {
    // Audio is optional and may be unavailable in the browser.
  }
}

export function playLoginSuccessTone() {
  playSessionTone([523, 659, 784], 0.18, 0.045);
}

export function playClassClap(volume = 1) {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;

    const schedule = () => {
      const start = ctx.currentTime + 0.015;
      const claps = [0, 0.12, 0.25, 0.39, 0.52, 0.68, 0.82];
      claps.forEach((delay, index) => {
        const duration = 0.075 + Math.random() * 0.035;
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let sample = 0; sample < samples.length; sample += 1) samples[sample] = Math.random() * 2 - 1;

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        source.buffer = buffer;
        filter.type = "bandpass";
        filter.frequency.value = 1150 + (index % 3) * 260;
        filter.Q.value = 0.75;
        const clapStart = start + delay;
        gain.gain.setValueAtTime(0.0001, clapStart);
        gain.gain.exponentialRampToValueAtTime(Math.min(0.075, 0.045 * volume), clapStart + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, clapStart + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(clapStart);
      });
      window.setTimeout(() => ctx.close().catch(() => {}), 1300);
    };

    if (ctx.state === "suspended") ctx.resume().then(schedule).catch(() => {});
    else schedule();
  } catch {
    // Audio is optional and may be unavailable in the browser.
  }
}

export function playLogoutTone() {
  playSessionTone([659, 523, 392], 0.16, 0.04);
}

export function startSupportAlertTone() {
  if (supportAlertToneState) return;

  try {
    const ctx = createAudioContext();
    if (!ctx) return;

    const start = () => {
      const carrier = ctx.createOscillator();
      const carrierGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      carrier.type = "triangle";
      carrier.frequency.value = 520;
      carrierGain.gain.value = 0.04;

      lfo.type = "sine";
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 0.015;

      carrier.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      lfo.connect(lfoGain);
      lfoGain.connect(carrierGain.gain);

      carrier.start();
      lfo.start();

      supportAlertToneState = { ctx, carrier, lfo };
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(start).catch(() => {});
    } else {
      start();
    }
  } catch (e) {
    // ignore
  }
}

export function stopSupportAlertTone() {
  if (!supportAlertToneState) return;

  try {
    supportAlertToneState.carrier.stop();
    supportAlertToneState.lfo.stop();
    supportAlertToneState.ctx.close();
  } catch (e) {
    // ignore
  } finally {
    supportAlertToneState = null;
  }
}

let supportAlertSpeechTimer: number | null = null;

function speakSupportAlertMessage() {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const message =
      "Hello SchoolBase. You have a new support ticket. Please attend to it now.";
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.volume = 1;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    synth.cancel();
    synth.speak(utterance);
  } catch (e) {
    // ignore if speech synthesis is unavailable or blocked
  }
}

export function announceSupportAlert() {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    stopSupportAlertSpeech();
    speakSupportAlertMessage();

    supportAlertSpeechTimer = window.setInterval(() => {
      if (!synth.speaking) {
        speakSupportAlertMessage();
      }
    }, 12000);
  } catch (e) {
    // ignore if speech synthesis is unavailable or blocked
  }
}

export function stopSupportAlertSpeech() {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
  } catch (e) {
    // ignore
  } finally {
    if (supportAlertSpeechTimer !== null) {
      window.clearInterval(supportAlertSpeechTimer);
      supportAlertSpeechTimer = null;
    }
  }
}
