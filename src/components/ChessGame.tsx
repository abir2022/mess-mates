import { useEffect, useMemo, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Flag, RefreshCw, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Pill } from './ui'
import type { GameRoom } from '../lib/types'
import { timeAgo } from '../lib/format'
import { START_FEN } from '../lib/chess'
import { memberName } from '../lib/ledger'

export { START_FEN }

const glyphs: Record<string, string> = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔',
}

export function ChessGame({ room }: { room: GameRoom }) {
  const { ws, user, backend, run, busy, refresh } = useApp()
  const [fen, setFen] = useState<string>(String(room.state.fen ?? START_FEN))
  const [history, setHistory] = useState<string[]>(Array.isArray(room.state.history) ? (room.state.history as string[]) : [])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    (room.state.lastMove as { from: string; to: string } | null) ?? null,
  )
  const [selected, setSelected] = useState<Square | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const incoming = String(room.state.fen ?? START_FEN)
    setFen(incoming)
    setHistory(Array.isArray(room.state.history) ? (room.state.history as string[]) : [])
    setLastMove((room.state.lastMove as { from: string; to: string } | null) ?? null)
    setSelected(null)
  }, [room.state.fen, room.state.history, room.state.lastMove])

  const chess = useMemo(() => {
    try {
      return new Chess(fen)
    } catch {
      return new Chess(START_FEN)
    }
  }, [fen])

  const finished = chess.isGameOver()
  const turn = chess.turn()
  const targets = useMemo(
    () => (selected ? chess.moves({ square: selected, verbose: true }).map((move) => move.to) : []),
    [chess, selected],
  )

  if (!ws || !user) return null

  const nameOf = (id: string | null) =>
    id ? memberName(ws.members.find((member) => member.user_id === id)) : null

  const makeMove = async (from: Square, to: Square) => {
    const game = new Chess(fen)
    const move = (() => {
      try {
        return game.move({ from, to, promotion: 'q' })
      } catch {
        return null
      }
    })()
    if (!move) return
    setError(null)
    const nextFen = game.fen()
    const nextHistory = [...history, move.san]
    const isOver = game.isGameOver()
    const isMate = game.isCheckmate()

    setFen(nextFen)
    setHistory(nextHistory)
    setLastMove({ from: move.from, to: move.to })
    setSelected(null)

    const ok = await run(async () => {
      await backend.updateGame(room.id, {
        state: { fen: nextFen, history: nextHistory, lastMove: { from: move.from, to: move.to } },
        status: isOver ? 'finished' : 'active',
        ...(isMate ? { winnerUserId: user.id } : {}),
      })
      if (isMate) await backend.awardGame(room.id)
    })
    if (!ok) setError('Could not sync the move. Try refreshing the board.')
  }

  const onSquare = (square: Square) => {
    if (finished || room.status === 'finished') return
    if (selected) {
      if (square === selected) {
        setSelected(null)
        return
      }
      if (targets.includes(square)) {
        makeMove(selected, square)
        return
      }
    }
    const piece = chess.get(square)
    if (piece && piece.color === turn) setSelected(square)
    else setSelected(null)
  }

  const reset = () =>
    run(async () => {
      await backend.updateGame(room.id, {
        state: { fen: START_FEN, history: [], lastMove: null },
        status: 'active',
        winnerUserId: null,
      })
      setFen(START_FEN)
      setHistory([])
      setLastMove(null)
    }, 'New board ready')

  const boardRows = [0, 1, 2, 3, 4, 5, 6, 7].map((row) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
      const rowIndex = flipped ? 7 - row : row
      const colIndex = flipped ? 7 - col : col
      const square = `${'abcdefgh'[colIndex]}${8 - rowIndex}` as Square
      return {
        square,
        piece: chess.get(square),
        dark: (rowIndex + colIndex) % 2 === 1,
      }
    }),
  )

  const statusText = chess.isCheckmate()
    ? `Checkmate — ${nameOf(room.winner_user_id) ?? 'winner'} takes it`
    : chess.isStalemate()
      ? 'Stalemate — draw'
      : finished
        ? 'Game over'
        : `${turn === 'w' ? 'White' : 'Black'} to move${chess.inCheck() ? ' · check!' : ''}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill tone={finished ? 'gold' : 'brand'}>{statusText}</Pill>
          <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-500">{room.code}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setFlipped((value) => !value)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-ink-500 hover:bg-ink-100">
            Flip
          </button>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-ink-500 hover:bg-ink-100"
          >
            <RefreshCw className="h-3 w-3" /> Sync
          </button>
          <button
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-ink-500 hover:bg-ink-100"
          >
            <RotateCcw className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-ink-800/10">
        <div className="grid grid-cols-8">
          {boardRows.map((row, rowIndex) =>
            row.map((cell) => {
              const isSelected = selected === cell.square
              const isTarget = targets.includes(cell.square)
              const isLast = lastMove?.from === cell.square || lastMove?.to === cell.square
              return (
                <button
                  key={`${rowIndex}-${cell.square}`}
                  onClick={() => onSquare(cell.square)}
                  className={`relative flex aspect-square items-center justify-center text-[clamp(1.35rem,6.4vw,2.15rem)] leading-none transition ${
                    cell.dark ? 'bg-brand-700' : 'bg-brand-50'
                  } ${isSelected ? 'ring-2 ring-inset ring-amber-400' : ''} ${
                    isLast ? 'bg-amber-200/70' : ''
                  }`}
                  aria-label={cell.square}
                >
                  {cell.piece ? (
                    <span
                      className={`${cell.piece.color === 'w' ? 'text-white' : 'text-ink-900'} drop-shadow-sm`}
                      style={{ textShadow: cell.piece.color === 'w' ? '0 1px 1px rgba(0,0,0,.45)' : '0 1px 1px rgba(255,255,255,.25)' }}
                    >
                      {glyphs[`${cell.piece.color === 'w' ? cell.piece.type.toUpperCase() : cell.piece.type}`]}
                    </span>
                  ) : null}
                  {isTarget ? (
                    <span
                      className={`absolute rounded-full ${
                        cell.piece ? 'h-full w-full border-[3px] border-amber-400/80' : 'h-2.5 w-2.5 bg-amber-500/80'
                      }`}
                    />
                  ) : null}
                </button>
              )
            }),
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500">
        <span>Hot-seat: pass the device after each turn. Moves sync to the room so a mate can continue remotely.</span>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Flag className="h-3 w-3" /> {history.length} moves
        </span>
      </div>

      {history.length ? (
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-lg bg-ink-50 p-2 font-mono text-[10px] text-ink-600">
          {history.map((san, index) => (
            <span key={`${san}-${index}`} className={`rounded px-1.5 py-0.5 ${index === history.length - 1 ? 'bg-brand-100 font-bold text-brand-800' : ''}`}>
              {index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''}
              {san}
            </span>
          ))}
        </div>
      ) : null}

      {room.points_awarded ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          🏆 +25 guild points and +10 XP already awarded for this room.
        </p>
      ) : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{error}</p> : null}
      <p className="text-right text-[10px] text-ink-300">Last sync {timeAgo(room.updated_at)}</p>
    </div>
  )
}
