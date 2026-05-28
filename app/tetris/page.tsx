'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'

const COLS = 10
const ROWS = 20
const BLOCK = 36

const COLORS: Record<string, string> = {
  I: '#00F5FF',
  O: '#FFE000',
  T: '#CC00FF',
  S: '#00FF88',
  Z: '#FF2244',
  J: '#0055FF',
  L: '#FF8800',
}

const PIECES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
}

const PIECE_NAMES = Object.keys(PIECES)

type Board = (string | null)[][]
type Piece = { name: string; shape: number[][]; x: number; y: number }

function randomPiece(): Piece {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)]
  return { name, shape: PIECES[name], x: Math.floor(COLS / 2) - 1, y: 0 }
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map((row) => row[i]).reverse())
}

function fits(board: Board, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = y + r
      const nc = x + c
      if (nc < 0 || nc >= COLS || nr >= ROWS) return false
      if (nr >= 0 && board[nr][nc]) return false
    }
  }
  return true
}

function place(board: Board, shape: number[][], x: number, y: number, color: string): Board {
  const nb = board.map((r) => [...r])
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) nb[y + r][x + c] = color
    }
  }
  return nb
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const newBoard = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - newBoard.length
  const empty: Board = Array.from({ length: cleared }, () => Array(COLS).fill(null))
  return { board: [...empty, ...newBoard], cleared }
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
  return `rgb(${r},${g},${b})`
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount)
  return `rgb(${r},${g},${b})`
}

export default function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextCanvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)

  const stateRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) as Board,
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    paused: false,
    started: false,
    dropInterval: 800,
    lastDrop: 0,
    animFrame: 0,
  })

  const drawBlock = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, ghost = false) => {
      const px = x * BLOCK
      const py = y * BLOCK
      const s = BLOCK - 2
      if (ghost) {
        ctx.globalAlpha = 0.2
        ctx.fillStyle = color
        ctx.fillRect(px + 1, py + 1, s, s)
        ctx.globalAlpha = 1
        return
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(px + 4, py + 4, s, s)
      const grad = ctx.createLinearGradient(px, py, px + s, py + s)
      grad.addColorStop(0, lighten(color, 40))
      grad.addColorStop(0.5, color)
      grad.addColorStop(1, darken(color, 40))
      ctx.fillStyle = grad
      ctx.fillRect(px + 1, py + 1, s, s)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(px + 1, py + 1, s, 5)
      ctx.fillRect(px + 1, py + 1, 5, s)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(px + 1, py + s - 4, s, 5)
      ctx.fillRect(px + s - 4, py + 1, 5, s)
    },
    []
  )

  const drawBoard = useCallback(
    (ctx: CanvasRenderingContext2D, board: Board) => {
      ctx.fillStyle = '#0a0a1a'
      ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath()
        ctx.moveTo(c * BLOCK, 0)
        ctx.lineTo(c * BLOCK, ROWS * BLOCK)
        ctx.stroke()
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * BLOCK)
        ctx.lineTo(COLS * BLOCK, r * BLOCK)
        ctx.stroke()
      }
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]) drawBlock(ctx, c, r, board[r][c] as string)
        }
      }
    },
    [drawBlock]
  )

  const getGhostY = useCallback((board: Board, shape: number[][], x: number, y: number): number => {
    let gy = y
    while (fits(board, shape, x, gy + 1)) gy++
    return gy
  }, [])

  const drawPiece = useCallback(
    (ctx: CanvasRenderingContext2D, board: Board, piece: Piece) => {
      const color = COLORS[piece.name]
      const gy = getGhostY(board, piece.shape, piece.x, piece.y)
      if (gy !== piece.y) {
        for (let r = 0; r < piece.shape.length; r++)
          for (let c = 0; c < piece.shape[r].length; c++)
            if (piece.shape[r][c]) drawBlock(ctx, piece.x + c, gy + r, color, true)
      }
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          if (piece.shape[r][c]) drawBlock(ctx, piece.x + c, piece.y + r, color)
    },
    [drawBlock, getGhostY]
  )

  const drawNext = useCallback(
    (ctx: CanvasRenderingContext2D, piece: Piece) => {
      ctx.fillStyle = '#0a0a1a'
      ctx.fillRect(0, 0, 5 * BLOCK, 5 * BLOCK)
      const color = COLORS[piece.name]
      const offX = Math.floor((4 - piece.shape[0].length) / 2)
      const offY = Math.floor((4 - piece.shape.length) / 2)
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          if (piece.shape[r][c]) drawBlock(ctx, offX + c, offY + r, color)
    },
    [drawBlock]
  )

  const tick = useCallback(() => {
    const s = stateRef.current
    if (s.gameOver || s.paused || !s.started) return
    const now = performance.now()
    if (now - s.lastDrop < s.dropInterval) return
    s.lastDrop = now
    const { current, board } = s
    if (fits(board, current.shape, current.x, current.y + 1)) {
      s.current = { ...current, y: current.y + 1 }
    } else {
      const placed = place(board, current.shape, current.x, current.y, COLORS[current.name])
      const { board: newBoard, cleared } = clearLines(placed)
      s.board = newBoard
      if (cleared) {
        const pts = [0, 100, 300, 500, 800][cleared] * s.level
        s.score += pts
        s.lines += cleared
        s.level = Math.floor(s.lines / 10) + 1
        s.dropInterval = Math.max(100, 800 - (s.level - 1) * 70)
        setScore(s.score)
        setLines(s.lines)
        setLevel(s.level)
      }
      s.current = s.next
      s.next = randomPiece()
      if (!fits(s.board, s.current.shape, s.current.x, s.current.y)) {
        s.gameOver = true
        setGameOver(true)
      }
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const nextCanvas = nextCanvasRef.current
    if (!canvas || !nextCanvas) return
    const ctx = canvas.getContext('2d')
    const nctx = nextCanvas.getContext('2d')
    if (!ctx || !nctx) return
    const s = stateRef.current
    drawBoard(ctx, s.board)
    if (s.started && !s.gameOver) drawPiece(ctx, s.board, s.current)
    drawNext(nctx, s.next)
  }, [drawBoard, drawPiece, drawNext])

  const loop = useCallback(() => {
    tick()
    render()
    stateRef.current.animFrame = requestAnimationFrame(loop)
  }, [tick, render])

  useEffect(() => {
    stateRef.current.animFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(stateRef.current.animFrame)
  }, [loop])

  const hardDrop = useCallback(() => {
    const s = stateRef.current
    if (s.gameOver || s.paused || !s.started) return
    const gy = getGhostY(s.board, s.current.shape, s.current.x, s.current.y)
    s.current = { ...s.current, y: gy }
    s.lastDrop = 0
  }, [getGhostY])

  const move = useCallback((dx: number) => {
    const s = stateRef.current
    if (s.gameOver || s.paused || !s.started) return
    if (fits(s.board, s.current.shape, s.current.x + dx, s.current.y))
      s.current = { ...s.current, x: s.current.x + dx }
  }, [])

  const rotatePiece = useCallback(() => {
    const s = stateRef.current
    if (s.gameOver || s.paused || !s.started) return
    const rotated = rotate(s.current.shape)
    for (const kick of [0, 1, -1, 2, -2]) {
      if (fits(s.board, rotated, s.current.x + kick, s.current.y)) {
        s.current = { ...s.current, shape: rotated, x: s.current.x + kick }
        return
      }
    }
  }, [])

  const softDrop = useCallback(() => {
    const s = stateRef.current
    if (s.gameOver || s.paused || !s.started) return
    if (fits(s.board, s.current.shape, s.current.x, s.current.y + 1)) {
      s.current = { ...s.current, y: s.current.y + 1 }
      s.score += 1
      setScore(s.score)
    }
    s.lastDrop = performance.now()
  }, [])

  const startGame = useCallback(() => {
    const s = stateRef.current
    s.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)) as Board
    s.current = randomPiece()
    s.next = randomPiece()
    s.score = 0
    s.level = 1
    s.lines = 0
    s.gameOver = false
    s.paused = false
    s.started = true
    s.dropInterval = 800
    s.lastDrop = performance.now()
    setScore(0)
    setLevel(1)
    setLines(0)
    setGameOver(false)
    setPaused(false)
    setStarted(true)
  }, [])

  const togglePause = useCallback(() => {
    const s = stateRef.current
    if (s.gameOver || !s.started) return
    s.paused = !s.paused
    s.lastDrop = performance.now()
    setPaused(s.paused)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          move(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          move(1)
          break
        case 'ArrowDown':
          e.preventDefault()
          softDrop()
          break
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault()
          rotatePiece()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePause()
          break
        case 'Enter':
          if (!stateRef.current.started || stateRef.current.gameOver) startGame()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, softDrop, rotatePiece, hardDrop, togglePause, startGame])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a2e 0%, #16003a 50%, #0a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', sans-serif",
        userSelect: 'none',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 900,
          letterSpacing: '0.15em',
          marginBottom: '24px',
          background: 'linear-gradient(90deg, #00f5ff, #cc00ff, #ff8800)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(0,245,255,0.5))',
        }}
      >
        TETRIS
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={COLS * BLOCK}
            height={ROWS * BLOCK}
            style={{
              display: 'block',
              border: '2px solid rgba(0,245,255,0.4)',
              borderRadius: '8px',
              boxShadow: '0 0 30px rgba(0,245,255,0.2), inset 0 0 30px rgba(0,0,0,0.5)',
            }}
          />
          {(!started || gameOver || paused) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.82)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                gap: '16px',
              }}
            >
              {paused && !gameOver && (
                <div style={{ fontSize: '2.5rem', color: '#FFE000', fontWeight: 700 }}>PAUSA</div>
              )}
              {gameOver && (
                <>
                  <div style={{ fontSize: '2rem', color: '#FF2244', fontWeight: 700 }}>
                    GAME OVER
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                    Puntos: <strong style={{ color: '#00f5ff' }}>{score}</strong>
                  </div>
                </>
              )}
              {!started && !gameOver && (
                <div style={{ fontSize: '1.8rem', color: '#00f5ff', fontWeight: 700 }}>TETRIS</div>
              )}
              <button
                type="button"
                onClick={started && !gameOver ? togglePause : startGame}
                style={{
                  marginTop: '8px',
                  padding: '12px 36px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00f5ff, #cc00ff)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  boxShadow: '0 0 20px rgba(0,245,255,0.5)',
                }}
              >
                {paused ? '▶  REANUDAR' : '▶  JUGAR'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '140px' }}>
          <Panel title="SIGUIENTE">
            <canvas
              ref={nextCanvasRef}
              width={4 * BLOCK}
              height={4 * BLOCK}
              style={{ display: 'block', borderRadius: '4px' }}
            />
          </Panel>
          <Panel title="PUNTOS">
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#00f5ff' }}>{score}</span>
          </Panel>
          <Panel title="NIVEL">
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFE000' }}>{level}</span>
          </Panel>
          <Panel title="LÍNEAS">
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#00FF88' }}>{lines}</span>
          </Panel>
          <Panel title="CONTROLES">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                ['←→', 'Mover'],
                ['↑ / X', 'Rotar'],
                ['↓', 'Bajar'],
                ['ESPACIO', 'Caer'],
                ['P', 'Pausa'],
                ['ENTER', 'Inicio'],
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <kbd
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}
                  </kbd>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}
          >
            <div />
            <MobileBtn onClick={rotatePiece} label="↑" color="#CC00FF" />
            <div />
            <MobileBtn onClick={() => move(-1)} label="←" color="#00F5FF" />
            <MobileBtn onClick={softDrop} label="↓" color="#00FF88" />
            <MobileBtn onClick={() => move(1)} label="→" color="#00F5FF" />
            <div />
            <MobileBtn onClick={hardDrop} label="⬇⬇" color="#FF8800" />
            <div />
          </div>

          <button
            type="button"
            onClick={togglePause}
            style={{
              padding: '8px',
              background: paused ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {paused ? '▶ Reanudar' : '⏸ Pausa'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div
        style={{
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function MobileBtn({
  onClick,
  label,
  color,
}: {
  onClick: () => void
  label: string
  color: string
}) {
  return (
    <button
      type="button"
      onTouchStart={(e) => {
        e.preventDefault()
        onClick()
      }}
      onClick={onClick}
      style={{
        padding: '10px 0',
        background: `rgba(${hexToRgb(color)},0.15)`,
        border: `1px solid ${color}44`,
        borderRadius: '8px',
        color,
        fontSize: '1rem',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
