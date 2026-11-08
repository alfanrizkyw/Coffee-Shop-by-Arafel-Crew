'use client';

let ctx: AudioContext | null = null;

// Browser mewajibkan gesture user sebelum audio bunyi — panggil sekali saat tap pertama.
export function unlockAudio() {
  try {
    ctx = ctx || new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // audio tidak tersedia — notifikasi visual tetap jalan
  }
}

interface Note { f: number; at: number; dur: number }

function play(notes: Note[], volume: number) {
  try {
    ctx = ctx || new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + n.at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.05);
    }
  } catch {
    // abaikan — banner visual tetap muncul
  }
}

export function playNewOrderBeep() {
  play([{ f: 880, at: 0, dur: 0.2 }, { f: 1174.7, at: 0.22, dur: 0.2 }], 0.25);
}

// Chime lembut 3 nada (E5-G5-C6) — terdengar jelas tapi tidak mengagetkan.
export function playReadyChime() {
  play([
    { f: 659.3, at: 0, dur: 0.35 },
    { f: 784, at: 0.2, dur: 0.35 },
    { f: 1046.5, at: 0.4, dur: 0.6 },
  ], 0.16);
}