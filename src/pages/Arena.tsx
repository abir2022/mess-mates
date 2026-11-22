import { useState } from 'react'
import {
  Check,
  Crown,
  Dice5,
  Gamepad2,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Users,
  Vote,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useMonetization } from '../components/Monetization'
import { Avatar, Button, EmptyState, Modal, Pill, SectionHeading, Tabs } from '../components/ui'
import { ChessGame, START_FEN } from '../components/ChessGame'
import { DiceDuel } from '../components/DiceDuel'
import { avatarFrames, bannerClass, guildBanners, guildEmblems } from '../lib/backend'
import { timeAgo } from '../lib/format'

type ArenaTab = 'polls' | 'games' | 'guild'

export function Arena() {
  const [tab, setTab] = useState<ArenaTab>('polls')
  const { ws } = useApp()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Arena & Polls</h1>
          <p className="mt-1 text-sm text-ink-500">Mess democracy, mini-games and the guild leaderboard.</p>
        </div>
        {ws ? (
          <Pill tone="gold">
            <Trophy className="h-3 w-3" /> {ws.mess.guild_points.toLocaleString()} guild points
          </Pill>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'polls', label: 'Polls', icon: <Vote className="h-3.5 w-3.5" /> },
          { id: 'games', label: 'Games', icon: <Gamepad2 className="h-3.5 w-3.5" /> },
          { id: 'guild', label: 'Guild', icon: <Trophy className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'polls' ? <PollsTab /> : null}
      {tab === 'games' ? <GamesTab /> : null}
      {tab === 'guild' ? <GuildTab /> : null}
    </div>
  )
}

function closingLabel(closesAt: string): { label: string; closed: boolean } {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return { label: 'Closed', closed: true }
  const hours = Math.round(diff / 3_600_000)
  if (hours < 1) return { label: 'Closes soon', closed: false }
  if (hours < 24) return { label: `${hours}h left`, closed: false }
  return { label: `${Math.round(hours / 24)}d left`, closed: false }
}

function PollsTab() {
  const { ws, user, backend, run, busy } = useApp()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [days, setDays] = useState('2')

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const nameOf = (id: string) => ws.members.find((member) => member.user_id === id)?.profile.full_name ?? 'Member'
  const polls = [...ws.polls].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const reset = () => {
    setQuestion('')
    setOptions(['', ''])
    setDays('2')
  }

  const create = async () => {
    const clean = options.map((option) => option.trim()).filter(Boolean)
    if (!question.trim() || clean.length < 2) return
    const closesAt = new Date(Date.now() + Number(days) * 86400_000).toISOString()
    const ok = await run(() => backend.createPoll({ question: question.trim(), options: clean, closesAt }), 'Poll published')
    if (ok) {
      setOpen(false)
      reset()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading title="Open ballots" hint="One vote per mate, changeable until the poll closes" />
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New poll
        </Button>
      </div>

      {polls.length === 0 ? (
        <div className="card p-6">
          <EmptyState icon={<Vote className="h-4 w-4" />} title="No polls yet" body="Ask the mess what's for Friday dinner." />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {polls.map((poll) => {
            const votes = ws.votes.filter((vote) => vote.poll_id === poll.id)
            const myVote = votes.find((vote) => vote.user_id === user.id)
            const total = votes.length
            const status = closingLabel(poll.closes_at)
            return (
              <div key={poll.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold leading-snug text-ink-900">{poll.question}</p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      by {nameOf(poll.created_by)} · {status.label}
                    </p>
                  </div>
                  <Pill tone={status.closed ? 'neutral' : 'brand'}>
                    {status.closed ? <Lock className="h-3 w-3" /> : <Vote className="h-3 w-3" />} {total} votes
                  </Pill>
                </div>

                <div className="mt-3 space-y-2">
                  {poll.options.map((option, index) => {
                    const count = votes.filter((vote) => vote.option_index === index).length
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const isMine = myVote?.option_index === index
                    const showBars = Boolean(myVote) || status.closed
                    return (
                      <button
                        key={`${poll.id}-${index}`}
                        disabled={status.closed || busy}
                        onClick={() => run(() => backend.vote(poll.id, index), 'Vote counted')}
                        className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                          isMine ? 'border-brand-400 bg-brand-50/80' : 'border-ink-200 hover:border-brand-300'
                        } disabled:cursor-default`}
                      >
                        {showBars ? (
                          <span
                            className={`absolute inset-y-0 left-0 ${isMine ? 'bg-brand-200/60' : 'bg-ink-100'}`}
                            style={{ width: `${pct}%` }}
                          />
                        ) : null}
                        <span className="relative flex items-center gap-1.5 text-xs font-bold text-ink-800">
                          {isMine ? <Check className="h-3.5 w-3.5 text-brand-600" /> : null}
                          {option}
                        </span>
                        {showBars ? (
                          <span className="relative text-[11px] font-extrabold tabular-nums text-ink-500">{pct}%</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-ink-400">
                  <span>{myVote ? 'You voted — tap another option to change' : status.closed ? 'Voting closed' : 'Tap an option to vote'}</span>
                  {canManage || poll.created_by === user.id ? (
                    <button
                      onClick={() => run(() => backend.deletePoll(poll.id), 'Poll removed')}
                      className="inline-flex items-center gap-1 font-bold text-ink-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a mess poll"
        subtitle="Every active member gets one vote"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={create} loading={busy} disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}>
              Publish
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Question</label>
            <input
              className="field"
              placeholder="Friday special menu: beef or chicken biryani?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Options (2–4)</label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="field"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) =>
                    setOptions((current) => current.map((entry, position) => (position === index ? event.target.value : entry)))
                  }
                />
                {options.length > 2 ? (
                  <button
                    onClick={() => setOptions((current) => current.filter((_, position) => position !== index))}
                    className="rounded-lg px-2 text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Remove option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {options.length < 4 ? (
              <Button size="sm" variant="ghost" onClick={() => setOptions((current) => [...current, ''])}>
                <Plus className="h-3.5 w-3.5" /> Add option
              </Button>
            ) : null}
          </div>
          <div>
            <label className="label">Closes in</label>
            <select className="field" value={days} onChange={(event) => setDays(event.target.value)}>
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="7">1 week</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GamesTab() {
  const { ws, user, backend, run, refresh } = useApp()
  const { openReward } = useMonetization()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [diceOpen, setDiceOpen] = useState(false)

  if (!ws || !user) return null

  const rooms = ws.games.filter((game) => game.game_type === 'chess' || game.game_type === 'challenge')
  const activeRoom = rooms.find((room) => room.id === roomId) ?? null

  const createChess = () =>
    run(async () => {
      const room = await backend.createGame('chess', { fen: START_FEN, history: [], lastMove: null })
      setRoomId(room.id)
    }, 'Chess room open — share the code with a mate')

  const createChallenge = () =>
    openReward('Create a custom mess-vs-mess challenge room', () => {
      run(async () => {
        const room = await backend.createGame('challenge', {
          fen: START_FEN,
          history: [],
          lastMove: null,
          title: `${ws.mess.name} challenge`,
        })
        setRoomId(room.id)
      }, 'Challenge room created — invite a rival mess')
    })

  const finishDice = (results: { name: string; score: number }[]) => {
    run(async () => {
      const room = await backend.createGame('dice', { scores: results, rounds: 3 })
      await backend.updateGame(room.id, { status: 'finished', winnerUserId: user.id })
      await backend.awardGame(room.id)
    }, '🏆 Dice Duel win — +25 guild points, +10 XP')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-ink-900 to-brand-700 p-4 text-white">
            <Swords className="h-5 w-5 text-brand-200" />
            <p className="mt-2 text-sm font-extrabold">Mess Chess</p>
            <p className="mt-0.5 text-[11px] text-brand-50/70">
              Legal moves via chess.js, board stored as FEN in the room. Hot-seat or async.
            </p>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <Button size="sm" onClick={createChess}>
              <Plus className="h-3.5 w-3.5" /> New board
            </Button>
            <span className="text-[10px] font-semibold text-ink-400">Win · +25 guild pts</span>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-flame-600 to-amber-500 p-4 text-white">
            <Dice5 className="h-5 w-5" />
            <p className="mt-2 text-sm font-extrabold">Dice Duel</p>
            <p className="mt-0.5 text-[11px] text-white/80">2–4 players, 3 rounds, pass-and-play. Zero socket load.</p>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <Button size="sm" variant="secondary" onClick={() => setDiceOpen(true)}>
              <Dice5 className="h-3.5 w-3.5" /> Start duel
            </Button>
            <span className="text-[10px] font-semibold text-ink-400">Win · +10 XP</span>
          </div>
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-3.5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
            <Crown className="h-3.5 w-3.5" /> Mess-vs-Mess challenge room
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Unlock a custom challenge room with a rewarded ad — no forced interstitials.
          </p>
        </div>
        <Button size="sm" variant="gold" onClick={createChallenge}>
          <Sparkles className="h-3.5 w-3.5" /> Unlock challenge
        </Button>
      </div>

      <div>
        <SectionHeading
          title="Open rooms"
          hint="Boards sync on refresh — tap a room to play"
          action={
            <button onClick={() => refresh()} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800">
              <RefreshCw className="h-3 w-3" /> Sync rooms
            </button>
          }
        />
        <div className="card divide-y divide-ink-100">
          {rooms.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Swords className="h-4 w-4" />} title="No boards yet" body="Create a chess board and share the room code." />
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setRoomId(room.id)}
                className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-brand-50/40"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
                    {room.game_type === 'chess' ? <Swords className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-900">
                      {room.game_type === 'chess' ? 'Mess Chess' : 'Challenge Room'}{' '}
                      <span className="font-mono text-[10px] text-ink-400">{room.code}</span>
                    </p>
                    <p className="text-[10px] text-ink-400">
                      {room.status} · updated {timeAgo(room.updated_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {room.points_awarded ? <Pill tone="gold">Scored</Pill> : <Pill tone="brand">Open</Pill>}
                  <span className="text-[11px] font-bold text-brand-700">Play →</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Modal open={Boolean(activeRoom)} onClose={() => setRoomId(null)} title={activeRoom?.game_type === 'challenge' ? 'Challenge Room' : 'Mess Chess'} subtitle={activeRoom ? `Room ${activeRoom.code}` : undefined} wide>
        {activeRoom ? <ChessGame room={activeRoom} /> : null}
      </Modal>

      <Modal open={diceOpen} onClose={() => setDiceOpen(false)} title="Dice Duel" subtitle="Pass-and-play · 3 rounds each">
        <DiceDuel onComplete={finishDice} />
      </Modal>
    </div>
  )
}

function GuildTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { isPro, openUpgrade, openReward } = useMonetization()

  if (!ws || !user) return null

  const rank = ws.leaderboard.findIndex((row) => row.is_own) + 1
  const myRow = ws.leaderboard.find((row) => row.is_own)

  const applyFrame = (id: string, premium: boolean) => {
    if (premium && !isPro) {
      openReward('Unlock a premium avatar frame for 24 hours', () => {
        run(() => backend.unlockFrame(id), 'Premium frame unlocked for 24 hours')
      })
      return
    }
    run(() => backend.unlockFrame(id), 'Avatar frame updated')
  }

  return (
    <div className="space-y-4">
      <div className={`card relative overflow-hidden bg-gradient-to-br ${bannerClass(ws.mess.guild_banner)} p-5 text-white`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl backdrop-blur">
              {ws.mess.guild_emblem}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Guild profile</p>
              <p className="text-lg font-extrabold leading-tight">{ws.mess.name}</p>
              <p className="mt-0.5 text-[11px] text-white/70">
                {ws.mess.guild_points.toLocaleString()} points · {ws.members.filter((m) => m.status === 'active').length} mates
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Global rank</p>
            <p className="text-3xl font-extrabold">#{rank || '—'}</p>
            {myRow ? <p className="text-[10px] text-white/60">of {ws.leaderboard.length} guilds</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <SectionHeading title="Guild banner" hint="Preset gradients — instant, no image upload needed" />
          <div className="grid grid-cols-2 gap-2">
            {guildBanners.map((banner) => (
              <button
                key={banner.id}
                onClick={() => run(() => backend.updateMess({ guild_banner: banner.id }), 'Guild banner updated')}
                disabled={busy}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  ws.mess.guild_banner === banner.id ? 'border-brand-500' : 'border-transparent hover:border-brand-200'
                }`}
              >
                <span className={`block bg-gradient-to-br ${banner.className} px-3 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-white`}>
                  {banner.label}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-ink-400">Emblem</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {guildEmblems.map((emblem) => (
              <button
                key={emblem}
                onClick={() => run(() => backend.updateMess({ guild_emblem: emblem }), 'Guild emblem updated')}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  ws.mess.guild_emblem === emblem ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                {emblem}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <SectionHeading title="Avatar frames" hint="Premium frames need a rewarded ad or Mess Pro" />
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3">
            <Avatar name={ws.profile.full_name} url={ws.profile.avatar_url} frame={ws.profile.avatar_frame} size="lg" />
            <div>
              <p className="text-xs font-extrabold text-ink-900">{ws.profile.full_name}</p>
              <p className="text-[11px] text-ink-500">
                {ws.profile.xp_points} XP ·{' '}
                {ws.profile.frame_unlocked_until && new Date(ws.profile.frame_unlocked_until) > new Date()
                  ? 'premium frame active'
                  : 'standard frames'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {avatarFrames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => applyFrame(frame.id, frame.premium)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  ws.profile.avatar_frame === frame.id ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <span className="text-[11px] font-bold text-ink-700">{frame.label}</span>
                {frame.premium && !isPro ? (
                  <Pill tone="gold">
                    <Lock className="h-2.5 w-2.5" /> Ad
                  </Pill>
                ) : ws.profile.avatar_frame === frame.id ? (
                  <Check className="h-3.5 w-3.5 text-brand-600" />
                ) : null}
              </button>
            ))}
          </div>

          {!isPro ? (
            <Button className="mt-3 w-full" variant="gold" size="sm" onClick={openUpgrade}>
              <Crown className="h-3.5 w-3.5" /> Upgrade mess to Pro
            </Button>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              <Crown className="h-3.5 w-3.5" /> Pro guild — premium frames unlocked for everyone
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeading title="Top mess leaderboard" hint="Guild points from bazar duty, on-time dues and game wins" />
        <div className="card divide-y divide-ink-100">
          {ws.leaderboard.map((row, index) => (
            <div key={row.id} className={`flex items-center gap-3 p-3.5 ${row.is_own ? 'bg-brand-50/50' : ''}`}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  index === 0
                    ? 'bg-amber-100 text-amber-700'
                    : index === 1
                      ? 'bg-ink-200 text-ink-700'
                      : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-ink-100 text-ink-500'
                }`}
              >
                {index + 1}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-lg">{row.guild_emblem}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink-900">
                  {row.name} {row.is_own ? <span className="text-brand-600">(you)</span> : null}
                </p>
                <p className="text-[10px] text-ink-400">#{index + 1} in the guild league</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-ink-300" />
                <span className="text-xs font-extrabold tabular-nums text-ink-900">{row.guild_points.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-400">
          <Megaphone className="h-3 w-3" /> Play a game or finish bazar duty to climb the board.
        </p>
      </div>
    </div>
  )
}
