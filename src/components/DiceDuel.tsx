import { useEffect, useRef, useState } from 'react'
import { Dice5, RotateCcw, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Button, Pill } from './ui'
import { memberAvatar, memberName } from '../lib/ledger'

const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const ROUNDS = 3

export function DiceDuel({
  onComplete,
}: {
  /** `winnerUserId` is null on a draw, and is the real player rather than the
   *  device owner — the duel is pass-and-play, so the device is not the winner. */
  onComplete: (results: { name: string; score: number }[], winnerUserId: string | null) => void
}) {
  const { ws } = useApp()
  const activeMembers = ws?.members.filter((member) => member.status === 'active') ?? []
  const [playerIds, setPlayerIds] = useState<string[]>(activeMembers.slice(0, 2).map((member) => member.user_id))
  const [phase, setPhase] = useState<'setup' | 'play' | 'done'>('setup')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [turn, setTurn] = useState(0)
  const [rolls, setRolls] = useState(0)
  const [dice, setDice] = useState<[number, number] | null>(null)
  const [rolling, setRolling] = useState(false)
  const reported = useRef(false)

  const nameOf = (id: string) => memberName(ws?.members.find((member) => member.user_id === id))
  const frameOf = (id: string) => ws?.members.find((member) => member.user_id === id)?.profile.avatar_frame ?? 'ring'
  const avatarOf = (id: string) => memberAvatar(ws?.members.find((member) => member.user_id === id))

  const togglePlayer = (id: string) => {
    setPlayerIds((current) => {
      if (current.includes(id)) return current.length > 2 ? current.filter((entry) => entry !== id) : current
      if (current.length >= 4) return current
      return [...current, id]
    })
  }

  const start = () => {
    const initial = Object.fromEntries(playerIds.map((id) => [id, 0]))
    setScores(initial)
    setTurn(0)
    setRolls(0)
    setDice(null)
    setPhase('play')
    reported.current = false
  }

  const roll = () => {
    if (rolling || phase !== 'play') return
    setRolling(true)
    const a = 1 + Math.floor(Math.random() * 6)
    const b = 1 + Math.floor(Math.random() * 6)
    setTimeout(() => {
      setDice([a, b])
      setRolling(false)
      const currentId = playerIds[turn]
      const nextScores = { ...scores, [currentId]: (scores[currentId] ?? 0) + a + b }
      setScores(nextScores)
      const nextRolls = rolls + 1
      setRolls(nextRolls)
      if (nextRolls >= playerIds.length * ROUNDS) {
        setPhase('done')
        if (!reported.current) {
          reported.current = true
          const rankedIds = [...playerIds].sort((x, y) => (nextScores[y] ?? 0) - (nextScores[x] ?? 0))
          const draw =
            rankedIds.length > 1 && (nextScores[rankedIds[0]] ?? 0) === (nextScores[rankedIds[1]] ?? 0)
          onComplete(
            playerIds.map((id) => ({ name: nameOf(id), score: nextScores[id] ?? 0 })),
            draw ? null : rankedIds[0],
          )
        }
      } else {
        setTurn((turn + 1) % playerIds.length)
      }
    }, 550)
  }

  useEffect(() => {
    if (phase === 'setup') reported.current = false
  }, [phase])

  const ranked = [...playerIds].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const winnerId = ranked[0]
  const tie = ranked.length > 1 && (scores[ranked[0]] ?? 0) === (scores[ranked[1]] ?? 0)
  const currentId = playerIds[turn]

  return (
    <div className="space-y-4">
      {phase === 'setup' ? (
        <>
          <p className="text-xs text-ink-500">
            Pass-and-play dice duel for 2–4 mates. Three rounds each, highest total takes the guild points.
          </p>
          <div className="space-y-2">
            {activeMembers.map((member) => {
              const selected = playerIds.includes(member.user_id)
              return (
                <button
                  key={member.user_id}
                  onClick={() => togglePlayer(member.user_id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                    selected ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Avatar name={memberName(member)} url={memberAvatar(member)} frame={member.profile.avatar_frame} size="sm" />
                    <span className="text-xs font-bold text-ink-800">{memberName(member)}</span>
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-extrabold ${
                    selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-transparent'
                  }`}
                  >
                    ✓
                  </span>
                </button>
              )
            })}
          </div>
          <Button className="w-full" onClick={start} disabled={playerIds.length < 2}>
            <Dice5 className="h-4 w-4" /> Start duel ({playerIds.length} players)
          </Button>
        </>
      ) : null}

      {phase === 'play' ? (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600 p-4 text-center text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-100/70">Now rolling</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Avatar name={nameOf(currentId)} url={avatarOf(currentId)} frame={frameOf(currentId)} size="sm" />
              <p className="text-sm font-extrabold">{nameOf(currentId)}</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-5xl leading-none">
              <span className={rolling ? 'animate-pulse' : ''}>{dice ? diceFaces[dice[0] - 1] : '🎲'}</span>
              <span className={rolling ? 'animate-pulse' : ''}>{dice ? diceFaces[dice[1] - 1] : '🎲'}</span>
            </div>
            <Button variant="gold" size="md" className="mt-3" onClick={roll} loading={rolling}>
              Roll dice
            </Button>
            <p className="mt-2 text-[10px] text-brand-100/70">
              Round {Math.floor(rolls / playerIds.length) + 1} of {ROUNDS} · pass the device after rolling
            </p>
          </div>

          <div className="space-y-1.5">
            {playerIds.map((id) => (
              <div
                key={id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  id === currentId ? 'border-brand-300 bg-brand-50/60' : 'border-ink-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Avatar name={nameOf(id)} url={avatarOf(id)} frame={frameOf(id)} size="xs" />
                  <span className="text-xs font-bold text-ink-800">{nameOf(id)}</span>
                </span>
                <span className="text-sm font-extrabold tabular-nums text-ink-900">{scores[id] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {phase === 'done' ? (
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Trophy className="h-7 w-7" />
          </div>
          <p className="text-sm font-extrabold text-ink-900">
            {tie ? "It's a tie!" : `${nameOf(winnerId)} wins!`}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">+25 guild points · +10 XP awarded to the mess</p>
          <div className="mt-4 space-y-1.5 text-left">
            {ranked.map((id, index) => (
              <div key={id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="w-4 text-center text-xs font-extrabold text-ink-400">{index + 1}</span>
                  <Avatar name={nameOf(id)} url={avatarOf(id)} frame={frameOf(id)} size="xs" />
                  <span className="text-xs font-bold text-ink-800">{nameOf(id)}</span>
                </span>
                <Pill tone={index === 0 ? 'gold' : 'neutral'}>{scores[id] ?? 0} pts</Pill>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setPhase('setup')}>
            <RotateCcw className="h-4 w-4" /> Play again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
