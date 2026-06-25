'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

type Phase = 'lobby' | 'ringing' | 'call'
type FacingMode = 'user' | 'environment'

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '🙂'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function CallSimulator() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [contactName, setContactName] = useState('Ana')
  const [facingMode, setFacingMode] = useState<FacingMode>('user')
  const [muted, setMuted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [showSelfView, setShowSelfView] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ---- media helpers ---------------------------------------------------
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(
    async (mode: FacingMode) => {
      setError(null)
      try {
        // stop any previous stream first (e.g. when flipping the camera)
        stopStream()
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
        streamRef.current = stream
        // respect current mute state on the freshly acquired tracks
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted))
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        return true
      } catch (err) {
        const e = err as DOMException
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          setError(
            'No diste permiso para la cámara o el micrófono. Actívalos en el navegador y vuelve a intentarlo.'
          )
        } else if (e.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.')
        } else {
          setError('No se pudo acceder a la cámara: ' + (e.message || e.name))
        }
        return false
      }
    },
    [muted, stopStream]
  )

  // ---- call lifecycle --------------------------------------------------
  const beginCall = useCallback(async () => {
    setRecordedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    // "ringing" beat for immersion, then connect
    setPhase('ringing')
    const ok = await startStream(facingMode)
    if (!ok) {
      setPhase('lobby')
      return
    }
    // small delay so the ringing screen is actually felt
    window.setTimeout(() => {
      setElapsed(0)
      setPhase('call')
    }, 1600)
  }, [facingMode, startStream])

  const endCall = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    setRecording(false)
    stopStream()
    setPhase('lobby')
  }, [stopStream])

  const flipCamera = useCallback(async () => {
    const next: FacingMode = facingMode === 'user' ? 'environment' : 'user'
    const ok = await startStream(next)
    if (ok) {
      setFacingMode(next)
    } else {
      // no camera on that side (common on laptops) — restore the previous one
      await startStream(facingMode)
    }
  }, [facingMode, startStream])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
      return next
    })
  }, [])

  // ---- recording -------------------------------------------------------
  const toggleRecording = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ]
    const mimeType = mimeCandidates.find(
      (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    )
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        setRecordedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('La grabación no está disponible en este navegador.')
    }
  }, [recording])

  // ---- timer -----------------------------------------------------------
  useEffect(() => {
    if (phase !== 'call') return
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  // ---- cleanup on unmount ---------------------------------------------
  useEffect(() => {
    return () => {
      stopStream()
      setRecordedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [stopStream])

  const mirror = facingMode === 'user'

  // =====================================================================
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black text-white select-none">
      {/* live camera fills the screen during ringing + call */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          phase === 'lobby' ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
      />

      {/* dark vignette for legible overlays */}
      {phase !== 'lobby' && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />
      )}

      {/* ---------------- LOBBY ---------------- */}
      {phase === 'lobby' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 px-6 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-semibold shadow-2xl">
            {initials(contactName)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Practica como en una videollamada</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
              Habla a la cámara imaginando que estás en una llamada con alguien. El truco mental
              para perder el miedo a hablar en público.
            </p>
          </div>

          <label className="w-full max-w-xs text-left">
            <span className="mb-1 block text-xs font-medium tracking-wide text-zinc-400 uppercase">
              ¿Con quién hablas?
            </span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nombre del contacto"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-base text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </label>

          {error && (
            <p className="max-w-xs rounded-lg bg-red-500/15 px-4 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            onClick={beginCall}
            className="flex items-center gap-3 rounded-full bg-green-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-green-400 active:scale-95"
          >
            <PhoneIcon className="h-6 w-6" />
            Iniciar videollamada
          </button>

          {recordedUrl && (
            <a
              href={recordedUrl}
              download={`practica-${Date.now()}.webm`}
              className="text-sm text-blue-400 underline underline-offset-4 hover:text-blue-300"
            >
              ⬇︎ Descargar tu última grabación
            </a>
          )}

          <p className="max-w-xs text-xs text-zinc-600">
            Todo ocurre en tu dispositivo. No se sube nada a ningún servidor.
          </p>
        </div>
      )}

      {/* ---------------- RINGING ---------------- */}
      {phase === 'ringing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-between py-24">
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm tracking-widest text-zinc-300 uppercase">FaceTime</span>
            <div className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-white/20 text-3xl font-semibold backdrop-blur">
              {initials(contactName)}
            </div>
            <h2 className="text-3xl font-semibold">{contactName || 'Contacto'}</h2>
            <p className="text-zinc-300">conectando…</p>
          </div>
        </div>
      )}

      {/* ---------------- CALL ---------------- */}
      {phase === 'call' && (
        <>
          {/* top bar: name + timer */}
          <div className="absolute top-0 right-0 left-0 flex flex-col items-center gap-1 pt-[max(1rem,env(safe-area-inset-top))]">
            <h2 className="text-xl font-semibold drop-shadow">{contactName || 'Contacto'}</h2>
            <div className="flex items-center gap-2 text-sm text-zinc-200/90">
              <span className="tabular-nums">{formatTime(elapsed)}</span>
              {recording && (
                <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
                </span>
              )}
            </div>
          </div>

          {/* self-view PiP (mimics the FaceTime look) */}
          {showSelfView && (
            <button
              onClick={() => setShowSelfView(false)}
              title="Ocultar miniatura"
              className="absolute top-20 right-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/20 shadow-xl"
            >
              <SelfView stream={streamRef} mirror={mirror} />
            </button>
          )}
          {!showSelfView && (
            <button
              onClick={() => setShowSelfView(true)}
              className="absolute top-20 right-4 rounded-full bg-black/40 px-3 py-1 text-xs backdrop-blur"
            >
              Mostrar miniatura
            </button>
          )}

          {/* bottom controls */}
          <div className="absolute right-0 bottom-0 left-0 flex flex-col items-center gap-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end justify-center gap-5">
              <ControlButton label={muted ? 'Activar' : 'Silenciar'} onClick={toggleMute} active={muted}>
                {muted ? <MicOffIcon className="h-6 w-6" /> : <MicIcon className="h-6 w-6" />}
              </ControlButton>

              <ControlButton label="Cambiar" onClick={flipCamera}>
                <FlipIcon className="h-6 w-6" />
              </ControlButton>

              <ControlButton
                label={recording ? 'Detener' : 'Grabar'}
                onClick={toggleRecording}
                active={recording}
                activeClass="bg-red-600"
              >
                {recording ? (
                  <span className="h-5 w-5 rounded-sm bg-white" />
                ) : (
                  <span className="h-5 w-5 rounded-full bg-red-500" />
                )}
              </ControlButton>

              <ControlButton label="Colgar" onClick={endCall} activeClass="bg-red-600" active>
                <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
              </ControlButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------------- small subcomponents -------------------------- */

function SelfView({
  stream,
  mirror,
}: {
  stream: RefObject<MediaStream | null>
  mirror: boolean
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (ref.current && stream.current) {
      ref.current.srcObject = stream.current
      ref.current.play().catch(() => {})
    }
  })
  return (
    <video
      ref={ref}
      playsInline
      autoPlay
      muted
      className="h-full w-full object-cover"
      style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
    />
  )
}

function ControlButton({
  children,
  label,
  onClick,
  active = false,
  activeClass = 'bg-white/30',
}: {
  children: ReactNode
  label: string
  onClick: () => void
  active?: boolean
  activeClass?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        aria-label={label}
        className={`flex h-16 w-16 items-center justify-center rounded-full backdrop-blur transition active:scale-90 ${
          active ? activeClass : 'bg-white/15 hover:bg-white/25'
        }`}
      >
        {children}
      </button>
      <span className="text-xs text-zinc-200/90">{label}</span>
    </div>
  )
}

/* ------------------------------ icons -------------------------------- */

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
    </svg>
  )
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15 11V5a3 3 0 0 0-5.9-.74l5.9 5.9V11ZM4.27 3 3 4.27l6 6V11a3 3 0 0 0 4.46 2.63l1.27 1.27A4.97 4.97 0 0 1 12 16a5 5 0 0 1-5-5 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08a6.96 6.96 0 0 0 2.4-.82L19.73 21 21 19.73 4.27 3Z" />
    </svg>
  )
}

function FlipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 4 7.17 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.17L15 4H9Zm3 13a4.5 4.5 0 0 1-4.42-3.66l-.93.93-.7-.71L8 11.59l1.06 2.05-.71.7-.6-1.17A3.5 3.5 0 1 0 12 9.5a1 1 0 1 1 0-2A5.5 5.5 0 1 1 6.5 13H6l.02-.02A4.5 4.5 0 0 0 12 17Z" />
    </svg>
  )
}
