// audio.js — tiny WebAudio synth: gunshots, hits, explosions, pickups,
// engine hum tied to speed, two-tone siren while wanted, rain noise.
import { S, stars } from "./state.js";

let ctx = null, master = null;
let engineOsc = null, engineGain = null;
let sirenOsc = null, sirenGain = null, sirenLfo = null;
let rainSrc = null, rainGain = null;
let noiseBuf = null;

export function initAudio() {
  try {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // shared noise buffer
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // engine
    engineOsc = ctx.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 50;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(master);
    engineOsc.start();

    // siren (two-tone via LFO on frequency)
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = "triangle";
    sirenOsc.frequency.value = 660;
    sirenLfo = ctx.createOscillator();
    sirenLfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(master);
    sirenOsc.start(); sirenLfo.start();

    // rain loop
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf; rainSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.4;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(bp).connect(rainGain).connect(master);
    rainSrc.start();
  } catch { ctx = null; }
}

function burst(vol, dur, freq) {
  if (!ctx || S.muted) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(master);
    src.start(); src.stop(ctx.currentTime + dur + 0.05);
  } catch { /* ignore */ }
}

function chime(freq, dur = 0.16, vol = 0.25) {
  if (!ctx || S.muted) return;
  try {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  } catch { /* ignore */ }
}

export const playShot = (vol = 0.5) => burst(vol, 0.12, 2400);
export const playHit = () => burst(0.3, 0.08, 900);
export const playExplosion = () => { burst(0.8, 0.7, 500); chime(70, 0.5, 0.4); };
export const playEnter = () => { chime(220, 0.1, 0.2); chime(330, 0.14, 0.15); };
export const playPickup = () => { chime(660, 0.1, 0.22); chime(880, 0.18, 0.2); };

export function updateAudio() {
  if (!ctx) return;
  try {
    const p = S.player;
    const driving = p && p.inCar;
    const sp = driving ? Math.hypot(p.inCar.vx, p.inCar.vy) : 0;
    engineGain.gain.value = S.muted ? 0 : (driving ? 0.05 + Math.min(0.06, sp / 5000) : 0);
    engineOsc.frequency.value = 42 + sp * 0.28;
    const wanted = stars() > 0;
    sirenGain.gain.value = S.muted || !wanted ? 0 : 0.05;
    rainGain.gain.value = S.muted ? 0 : S.rain * 0.06;
  } catch { /* ignore */ }
}

export function toggleMute() {
  S.muted = !S.muted;
  if (master) master.gain.value = S.muted ? 0 : 0.5;
  return S.muted;
}
