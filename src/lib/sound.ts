/**
 * High-quality Web Audio API notification sounds
 * No external files or network requests required.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Play a gentle, crisp double-chime for incoming messages
 */
export function playMessageSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // First tone (E5 ~ 659Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Second tone (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.08)
    gain2.gain.setValueAtTime(0.12, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.3)
  } catch (e) {
    // Audio autoplay might be blocked before first user interaction
    console.debug('Notification sound suppressed:', e)
  }
}

/**
 * Play a bell tone for urgent alerts (e.g. Work Update Request)
 */
export function playAlertSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Chime (G5 -> C6)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(783.99, now)
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.45)
  } catch (e) {
    console.debug('Alert sound suppressed:', e)
  }
}
