'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Side = 'left' | 'right'

interface Message {
  id: string
  side: Side
  text: string
}

// ---- Estilo tipo DM de Instagram (modo oscuro) ----
const W = 460 // ancho lógico del lienzo
const SCALE = 2 // exportación nítida (retina)
const SIDE_PAD = 16
const TOP_PAD = 22
const BOTTOM_PAD = 22
const PAD_X = 15
const PAD_Y = 11
const RADIUS = 22
const FONT_SIZE = 17
const LINE_HEIGHT = 23
const AVATAR = 30
const AVATAR_GAP = 9
const GAP_NORMAL = 12
const GAP_SAME = 3
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const COLORS = {
  bg: '#000000',
  rightBubble: '#dfd6d1',
  rightText: '#1c1c1e',
  leftBubble: '#202020',
  leftText: '#ffffff',
  avatarFallback: '#3a3a3c',
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(' ')
    let current = ''
    for (const word of words) {
      // Palabra más larga que la burbuja: partir carácter a carácter
      if (ctx.measureText(word).width > maxWidth) {
        if (current) {
          lines.push(current)
          current = ''
        }
        let chunk = ''
        for (const ch of word) {
          const test = chunk + ch
          if (ctx.measureText(test).width > maxWidth && chunk) {
            lines.push(chunk)
            chunk = ch
          } else {
            chunk = test
          }
        }
        current = chunk
        continue
      }
      const test = current ? current + ' ' + word : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    lines.push(current)
  }
  return lines
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export default function ConversationSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const avatarImgRef = useRef<HTMLImageElement | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    { id: 'a', side: 'right', text: 'Es malo sobre pensar?' },
    {
      id: 'b',
      side: 'left',
      text: 'Si, cuando no filtras tus pensamientos.\n\nPero si aprendes a usar tu mente, la convertirás en tu superpoder.',
    },
    { id: 'c', side: 'right', text: 'Mi superpoder?' },
    {
      id: 'd',
      side: 'left',
      text: 'Claro.\nComo cuando descubres la página de trucos del GTA',
    },
  ])

  const [draft, setDraft] = useState('')
  const [side, setSide] = useState<Side>('left')
  const [avatarSrc, setAvatarSrc] = useState<string | null>('/static/images/avatar-default.jpg')
  const [avatarReady, setAvatarReady] = useState(false)

  // Cargar avatar
  useEffect(() => {
    if (!avatarSrc) {
      avatarImgRef.current = null
      setAvatarReady(false)
      return
    }
    const img = new Image()
    img.onload = () => {
      avatarImgRef.current = img
      setAvatarReady(true)
    }
    img.src = avatarSrc
  }, [avatarSrc])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = `${FONT_SIZE}px ${FONT_STACK}`
    ctx.textBaseline = 'top'

    const maxBubble = W * 0.74
    const maxTextWidth = maxBubble - PAD_X * 2
    const leftIndent = SIDE_PAD + AVATAR + AVATAR_GAP

    // ---- Pase de medición ----
    type Laid = {
      msg: Message
      lines: string[]
      bubbleW: number
      bubbleH: number
      lastOfGroup: boolean
    }
    const laid: Laid[] = messages.map((msg, i) => {
      const lines = wrapText(ctx, msg.text, maxTextWidth)
      let textW = 0
      for (const line of lines) textW = Math.max(textW, ctx.measureText(line).width)
      const bubbleW = Math.ceil(Math.min(maxBubble, textW + PAD_X * 2))
      const bubbleH = lines.length * LINE_HEIGHT + PAD_Y * 2
      const next = messages[i + 1]
      const lastOfGroup = !next || next.side !== msg.side
      return { msg, lines, bubbleW, bubbleH, lastOfGroup }
    })

    let totalH = TOP_PAD + BOTTOM_PAD
    laid.forEach((l, i) => {
      totalH += l.bubbleH
      if (i < laid.length - 1) {
        totalH += laid[i + 1].msg.side === l.msg.side ? GAP_SAME : GAP_NORMAL
      }
    })
    totalH = Math.max(totalH, 200)

    // ---- Tamaño del lienzo ----
    canvas.width = W * SCALE
    canvas.height = Math.ceil(totalH) * SCALE
    canvas.style.width = '100%'
    canvas.style.maxWidth = W + 'px'
    canvas.style.height = 'auto'

    ctx.scale(SCALE, SCALE)
    ctx.font = `${FONT_SIZE}px ${FONT_STACK}`
    ctx.textBaseline = 'top'

    // Lienzo siempre transparente: la descarga sale sin fondo (solo burbujas y foto).
    ctx.clearRect(0, 0, W, totalH)

    // ---- Dibujo ----
    let y = TOP_PAD
    laid.forEach((l, i) => {
      const isLeft = l.msg.side === 'left'
      const x = isLeft ? leftIndent : W - SIDE_PAD - l.bubbleW

      // burbuja
      ctx.fillStyle = isLeft ? COLORS.leftBubble : COLORS.rightBubble
      roundRect(ctx, x, y, l.bubbleW, l.bubbleH, RADIUS)
      ctx.fill()

      // texto
      ctx.fillStyle = isLeft ? COLORS.leftText : COLORS.rightText
      l.lines.forEach((line, li) => {
        ctx.fillText(line, x + PAD_X, y + PAD_Y + li * LINE_HEIGHT + (LINE_HEIGHT - FONT_SIZE) / 2)
      })

      // avatar (solo en el último mensaje del grupo de la izquierda)
      if (isLeft && l.lastOfGroup) {
        const ay = y + l.bubbleH - AVATAR
        ctx.save()
        ctx.beginPath()
        ctx.arc(SIDE_PAD + AVATAR / 2, ay + AVATAR / 2, AVATAR / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        if (avatarImgRef.current) {
          const img = avatarImgRef.current
          const ratio = Math.max(AVATAR / img.width, AVATAR / img.height)
          const dw = img.width * ratio
          const dh = img.height * ratio
          ctx.drawImage(
            img,
            SIDE_PAD + AVATAR / 2 - dw / 2,
            ay + AVATAR / 2 - dh / 2,
            dw,
            dh
          )
        } else {
          ctx.fillStyle = COLORS.avatarFallback
          ctx.fillRect(SIDE_PAD, ay, AVATAR, AVATAR)
        }
        ctx.restore()
      }

      y += l.bubbleH
      if (i < laid.length - 1) {
        y += laid[i + 1].msg.side === l.msg.side ? GAP_SAME : GAP_NORMAL
      }
    })
  }, [messages, avatarReady])

  useEffect(() => {
    draw()
  }, [draw])

  const addMessage = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { id: crypto.randomUUID(), side, text }])
    setDraft('')
  }

  const removeMessage = (id: string) => setMessages((m) => m.filter((x) => x.id !== id))

  const move = (id: string, dir: -1 | 1) => {
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= m.length) return m
      const copy = [...m]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  const onAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `conversacion-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      addMessage()
    }
  }

  return (
    <div className="mx-auto flex max-w-[460px] flex-col gap-4">
      {/* ----- Controles ----- */}
      <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex gap-1.5 rounded-xl bg-gray-100 p-1.5 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setSide('left')}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              side === 'left'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-200'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            ⬅️ Izquierda
          </button>
          <button
            type="button"
            onClick={() => setSide('right')}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              side === 'right'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-200'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Derecha (tú) ➡️
          </button>
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Escribe el mensaje…  (Enter = salto de línea)"
          className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={addMessage}
          className="mt-3 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
        >
          Publicar
        </button>
      </div>

      {/* ----- Foto ----- */}
      <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
          Foto de perfil (lado izquierdo)
          <input
            type="file"
            accept="image/*"
            onChange={onAvatarUpload}
            className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-gray-200 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-300 dark:file:bg-gray-700 dark:file:text-gray-100"
          />
        </label>
      </div>

      {/* ----- Vista previa + descarga ----- */}
      <div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black dark:border-gray-700">
          <canvas ref={canvasRef} className="block w-full" />
        </div>
        <button
          type="button"
          onClick={download}
          className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-900 ring-1 ring-gray-300 transition hover:bg-gray-100 dark:ring-gray-600"
        >
          ⬇️ Descargar imagen
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          Fondo transparente · solo la conversación y la foto
        </p>
      </div>

      {/* ----- Lista de mensajes ----- */}
      <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
          MENSAJES
        </h3>
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Aún no hay mensajes. Publica el primero arriba.</p>
        )}
        <ul className="space-y-2">
          {messages.map((m, i) => (
            <li
              key={m.id}
              className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-2.5 text-sm dark:bg-gray-800"
            >
              <span
                className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                  m.side === 'left' ? 'bg-gray-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {m.side === 'left' ? 'Izq' : 'Der'}
              </span>
              <span className="grow whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                {m.text}
              </span>
              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => move(m.id, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(m.id, 1)}
                  disabled={i === messages.length - 1}
                  className="rounded px-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                  title="Bajar"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeMessage(m.id)}
                  className="rounded px-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40"
                  title="Eliminar"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
