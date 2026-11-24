import { Suspense, lazy, useState } from 'react'
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
import { START_FEN } from '../lib/chess'
import { pollProgress } from '../lib/governance'
import { DiceDuel } from '../components/DiceDuel'
import { avatarFrames, bannerClass, guildBanners, guildEmblems } from '../lib/backend'
import { timeAgo } from '../lib/format'
import { useI18n, type MessageKey } from '../lib/i18n'

// The board and chess.js only load when somebody opens a room.
const ChessGame = lazy(() => import('../components/ChessGame').then((module) => ({ default: module.ChessGame })))

type ArenaTab = 'polls' | 'games' | 'guild'

export function Arena() {
  const [tab, setTab] = useState<ArenaTab>('polls')
  const { ws } = useApp()
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{t('nav.arena')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('arena.subtitle')}</p>
        </div>
        {ws ? (
          <Pill tone="gold">
            <Trophy className="h-3 w-3" />{' '}
            {t('arena.guildPoints', { points: ws.mess.guild_points.toLocaleString() })}
          </Pill>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'polls', label: t('arena.tabPolls'), icon: <Vote className="h-3.5 w-3.5" /> },
          { id: 'games', label: t('arena.tabGames'), icon: <Gamepad2 className="h-3.5 w-3.5" /> },
          { id: 'guild', label: t('arena.tabGuild'), icon: <Trophy className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'polls' ? <PollsTab /> : null}
      {tab === 'games' ? <GamesTab /> : null}
      {tab === 'guild' ? <GuildTab /> : null}
    </div>
  )
}

function closingLabel(closesAt: string): {
  key: MessageKey
  vars?: Record<string, number>
  closed: boolean
} {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return { key: 'arena.closed', closed: true }
  const hours = Math.round(diff / 3_600_000)
  if (hours < 1) return { key: 'arena.closesSoon', closed: false }
  if (hours < 24) return { key: 'arena.hoursLeft', vars: { hours }, closed: false }
  return { key: 'arena.daysLeft', vars: { days: Math.round(hours / 24) }, closed: false }
}

function PollsTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [days, setDays] = useState('2')

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const nameOf = (id: string) => ws.members.find((member) => member.user_id === id)?.profile.full_name ?? 'Member'
  const polls = [...ws.polls].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const activeMembers = ws.members.filter((member) => member.status === 'active').length

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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SectionHeading title={t('arena.openBallots')} hint={t('arena.openBallotsHint')} />
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {t('arena.newPoll')}
        </Button>
      </div>

      {polls.length === 0 ? (
        <div className="card p-6">
          <EmptyState icon={<Vote className="h-4 w-4" />} title={t('arena.noPolls')} body={t('arena.noPollsBody')} />
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
                      {t('arena.by', { name: nameOf(poll.created_by), status: t(status.key, status.vars) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={status.closed ? 'neutral' : 'brand'}>
                      {status.closed ? <Lock className="h-3 w-3" /> : <Vote className="h-3 w-3" />}{' '}
                      {t('arena.votes', { count: total })}
                    </Pill>
                    {poll.kind !== 'general' ? (
                      <Pill tone="gold">
                        {poll.kind === 'member_removal' ? t('gov.removal') : t('gov.electionTitle')}
                      </Pill>
                    ) : null}
                  </div>
                </div>

                {poll.kind !== 'general' ? (
                  (() => {
                    const progress = pollProgress(poll, votes, activeMembers)
                    return (
                      <p className="mt-2 text-[10px] font-semibold text-ink-500">
                        {t('gov.turnout', {
                          votes: progress.votes,
                          members: progress.activeMembers,
                          required: progress.required,
                        })}
                        {progress.quorumMet
                          ? ` · ${t('gov.quorumMet')}`
                          : ` · ${t('gov.quorumMissing', { count: Math.max(0, progress.required - progress.votes) })}`}
                      </p>
                    )
                  })()
                ) : null}

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
                        className={`relative flex min-h-11 w-full items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
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
                  <span>
                    {myVote
                      ? t('arena.votedHint')
                      : status.closed
                        ? t('arena.votingClosed')
                        : t('arena.tapVote')}
                  </span>
                  {poll.kind === 'general' && (canManage || poll.created_by === user.id) ? (
                    <button
                      onClick={() => run(() => backend.deletePoll(poll.id), 'Poll removed')}
                      className="-my-2 inline-flex min-h-11 items-center gap-1 px-1 font-bold text-ink-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" /> {t('arena.delete')}
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
        title={t('arena.createPoll')}
        subtitle={t('arena.createPollSub')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              {t('arena.cancel')}
            </Button>
            <Button className="flex-1" onClick={create} loading={busy} disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}>
              {t('arena.publish')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">{t('arena.question')}</label>
            <input
              className="field"
              placeholder={t('arena.questionPlaceholder')}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="label">{t('arena.options')}</label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="field"
                  placeholder={t('arena.optionN', { n: index + 1 })}
                  value={option}
                  onChange={(event) =>
                    setOptions((current) => current.map((entry, position) => (position === index ? event.target.value : entry)))
                  }
                />
                {options.length > 2 ? (
                  <button
                    onClick={() => setOptions((current) => current.filter((_, position) => position !== index))}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                    aria-label={t('arena.removeOption')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {options.length < 4 ? (
              <Button size="sm" variant="ghost" onClick={() => setOptions((current) => [...current, ''])}>
                <Plus className="h-3.5 w-3.5" /> {t('arena.addOption')}
              </Button>
            ) : null}
          </div>
          <div>
            <label className="label">{t('arena.closesIn')}</label>
            <select className="field" value={days} onChange={(event) => setDays(event.target.value)}>
              <option value="1">{t('arena.day1')}</option>
              <option value="2">{t('arena.day2')}</option>
              <option value="3">{t('arena.day3')}</option>
              <option value="7">{t('arena.week1')}</option>
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
  const { t } = useI18n()
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

  const finishDice = (results: { name: string; score: number }[], winnerUserId: string | null) => {
    run(async () => {
      const room = await backend.createGame('dice', { scores: results, rounds: 3 })
      await backend.updateGame(room.id, { status: 'finished', winnerUserId })
      // award_game_win credits the caller's XP, so it may only run for the device
      // owner's own win; a mate's win on this device is recorded under their name
      // and earns the caller nothing.
      if (winnerUserId === user.id) await backend.awardGame(room.id)
    }, winnerUserId === user.id ? '🏆 Dice Duel win — +25 guild points, +10 XP' : 'Duel result saved')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-ink-900 to-brand-700 p-4 text-white">
            <Swords className="h-5 w-5 text-brand-200" />
            <p className="mt-2 text-sm font-extrabold">{t('arena.chessTitle')}</p>
            <p className="mt-0.5 text-[11px] text-brand-50/70">{t('arena.chessBody')}</p>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <Button size="sm" onClick={createChess}>
              <Plus className="h-3.5 w-3.5" /> {t('arena.newBoard')}
            </Button>
            <span className="text-[10px] font-semibold text-ink-400">{t('arena.winGuild')}</span>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-flame-600 to-amber-500 p-4 text-white">
            <Dice5 className="h-5 w-5" />
            <p className="mt-2 text-sm font-extrabold">{t('arena.diceTitle')}</p>
            <p className="mt-0.5 text-[11px] text-white/80">{t('arena.diceBody')}</p>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <Button size="sm" variant="secondary" onClick={() => setDiceOpen(true)}>
              <Dice5 className="h-3.5 w-3.5" /> {t('arena.startDuel')}
            </Button>
            <span className="text-[10px] font-semibold text-ink-400">{t('arena.winXp')}</span>
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-2.5 border-amber-200 bg-gradient-to-r from-amber-50 to-white p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
            <Crown className="h-3.5 w-3.5" /> {t('arena.challengeTitle')}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">{t('arena.challengeBody')}</p>
        </div>
        <Button size="sm" variant="gold" onClick={createChallenge} className="sm:w-auto w-full">
          <Sparkles className="h-3.5 w-3.5" /> {t('arena.unlockChallenge')}
        </Button>
      </div>

      <div>
        <SectionHeading
          title={t('arena.openRooms')}
          hint={t('arena.openRoomsHint')}
          action={
            <button onClick={() => refresh()} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800">
              <RefreshCw className="h-3 w-3" /> {t('arena.syncRooms')}
            </button>
          }
        />
        <div className="card divide-y divide-ink-100">
          {rooms.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Swords className="h-4 w-4" />} title={t('arena.noBoards')} body={t('arena.noBoardsBody')} />
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
                      {room.game_type === 'chess' ? t('arena.chessTitle') : t('arena.challengeRoom')}{' '}
                      <span className="font-mono text-[10px] text-ink-400">{room.code}</span>
                    </p>
                    <p className="text-[10px] text-ink-400">
                      {t('arena.updated', { status: room.status, when: timeAgo(room.updated_at) })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {room.points_awarded ? (
                    <Pill tone="gold">{t('arena.scored')}</Pill>
                  ) : (
                    <Pill tone="brand">{t('arena.open')}</Pill>
                  )}
                  <span className="text-[11px] font-bold text-brand-700">{t('arena.play')}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Modal open={Boolean(activeRoom)} onClose={() => setRoomId(null)} title={activeRoom?.game_type === 'challenge' ? t('arena.challengeRoom') : t('arena.chessTitle')} subtitle={activeRoom ? t('arena.roomCode', { code: activeRoom.code }) : undefined} wide>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          }
        >
          {activeRoom ? <ChessGame room={activeRoom} /> : null}
        </Suspense>
      </Modal>

      <Modal open={diceOpen} onClose={() => setDiceOpen(false)} title={t('arena.diceTitle')} subtitle={t('arena.diceSub')}>
        <DiceDuel onComplete={finishDice} />
      </Modal>
    </div>
  )
}

function GuildTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { isPro, openUpgrade, openReward } = useMonetization()
  const { t } = useI18n()

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
      <div className={`card relative overflow-hidden bg-gradient-to-br ${bannerClass(ws.mess.guild_banner)} p-4 text-white sm:p-5`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur sm:h-16 sm:w-16 sm:text-4xl">
              {ws.mess.guild_emblem}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{t('arena.guildProfile')}</p>
              <p className="text-lg font-extrabold leading-tight">{ws.mess.name}</p>
              <p className="mt-0.5 text-[11px] text-white/70">
                {t('arena.guildPoints', { points: ws.mess.guild_points.toLocaleString() })} ·{' '}
                {t('arena.mates', { count: ws.members.filter((m) => m.status === 'active').length })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{t('arena.globalRank')}</p>
            <p className="text-3xl font-extrabold">#{rank || '—'}</p>
            {myRow ? (
              <p className="text-[10px] text-white/60">{t('arena.ofGuilds', { count: ws.leaderboard.length })}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <SectionHeading title={t('arena.guildBanner')} hint={t('arena.guildBannerHint')} />
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

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('arena.emblem')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {guildEmblems.map((emblem) => (
              <button
                key={emblem}
                onClick={() => run(() => backend.updateMess({ guild_emblem: emblem }), 'Guild emblem updated')}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition ${
                  ws.mess.guild_emblem === emblem ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                {emblem}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <SectionHeading title={t('arena.avatarFrames')} hint={t('arena.avatarFramesHint')} />
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3">
            <Avatar name={ws.profile.full_name} url={ws.profile.avatar_url} frame={ws.profile.avatar_frame} size="lg" />
            <div>
              <p className="text-xs font-extrabold text-ink-900">{ws.profile.full_name}</p>
              <p className="text-[11px] text-ink-500">
                {t('arena.xp', { xp: ws.profile.xp_points })} ·{' '}
                {ws.profile.frame_unlocked_until && new Date(ws.profile.frame_unlocked_until) > new Date()
                  ? t('arena.premiumActive')
                  : t('arena.standardFrames')}
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
                    <Lock className="h-2.5 w-2.5" /> {t('arena.ad')}
                  </Pill>
                ) : ws.profile.avatar_frame === frame.id ? (
                  <Check className="h-3.5 w-3.5 text-brand-600" />
                ) : null}
              </button>
            ))}
          </div>

          {!isPro ? (
            <Button className="mt-3 w-full" variant="gold" size="sm" onClick={openUpgrade}>
              <Crown className="h-3.5 w-3.5" /> {t('arena.upgrade')}
            </Button>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              <Crown className="h-3.5 w-3.5" /> {t('arena.proGuild')}
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeading title={t('arena.leaderboard')} hint={t('arena.leaderboardHint')} />
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
                  {row.name} {row.is_own ? <span className="text-brand-600">{t('dash.you')}</span> : null}
                </p>
                <p className="text-[10px] text-ink-400">{t('arena.leagueRank', { rank: index + 1 })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-ink-300" />
                <span className="text-xs font-extrabold tabular-nums text-ink-900">{row.guild_points.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-400">
          <Megaphone className="h-3 w-3" /> {t('arena.climb')}
        </p>
      </div>
    </div>
  )
}
