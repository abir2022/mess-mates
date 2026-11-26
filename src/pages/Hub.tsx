import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Info,
  Lock,
  Download,
  Megaphone,
  MessageSquare,
  Plus,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  UserMinus,
  Vote,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useMonetization } from '../components/Monetization'
import { LedgerPanel } from '../components/LedgerPanel'
import { Avatar, Button, CopyButton, EmptyState, Modal, Pill, SectionHeading, ShareButton, Tabs } from '../components/ui'
import { resetDemoData } from '../lib/demo'
import { findLikelyDuplicates } from '../lib/identity'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import { addDays, dhakaDate, formatMeals, money, monthOptions, monthTitle, relativeDay, shortDate, timeAgo, todayISO } from '../lib/format'
import { computeSettlement } from '../lib/calc'
import { closeOutReview, type CloseOutIssue } from '../lib/closeOut'
import {
  canLeaveWithoutWaiting,
  currentManagerTerm,
  managerWinner,
  openGovernancePolls,
  openRequestFor,
  pendingRequests,
  pollProgress,
  removalVerdict,
} from '../lib/governance'
import type { ClientError, MonthlyCycle } from '../lib/types'
import { downloadMemberStatement, downloadSettlementCsv, downloadWorkspace } from '../lib/export'
import type { BazarDuty, MessMember, Role } from '../lib/types'
import { memberName } from '../lib/ledger'

type HubTab = 'board' | 'roster' | 'council' | 'ledger' | 'settings'

export function Hub() {
  const [tab, setTab] = useState<HubTab>('board')
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{t('nav.hub')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('hub.subtitle')}</p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'board', label: t('hub.tabBoard'), icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: 'roster', label: t('hub.tabRoster'), icon: <ShoppingBasket className="h-3.5 w-3.5" /> },
          { id: 'council', label: t('gov.tab'), icon: <Vote className="h-3.5 w-3.5" /> },
          { id: 'ledger', label: t('ledger.tab'), icon: <BookOpen className="h-3.5 w-3.5" /> },
          { id: 'settings', label: t('hub.tabSettings'), icon: <Settings2 className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'board' ? <BoardTab /> : null}
      {tab === 'roster' ? <RosterTab /> : null}
      {tab === 'council' ? <CouncilTab /> : null}
      {tab === 'ledger' ? <LedgerPanel /> : null}
      {tab === 'settings' ? <SettingsTab /> : null}
    </div>
  )
}

function BoardTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [announcement, setAnnouncement] = useState(false)

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const memberOf = (id: string) => ws.members.find((member) => member.user_id === id)
  const messages = [...ws.messages].sort((a, b) => a.created_at.localeCompare(b.created_at))

  const send = async () => {
    if (!content.trim()) return
    const ok = await run(() => backend.sendMessage(content.trim(), canManage && announcement), 'Message posted')
    if (ok) {
      setContent('')
      setAnnouncement(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="card flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col overflow-hidden lg:h-[70vh]">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div>
            <p className="text-sm font-extrabold text-ink-900">{t('hub.boardTitle')}</p>
            <p className="text-[11px] text-ink-400">{t('hub.kept', { count: messages.length })}</p>
          </div>
          <Pill tone="brand">
            <MessageSquare className="h-3 w-3" /> {t('hub.groupChat')}
          </Pill>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
          {messages.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-4 w-4" />} title={t('hub.sayHello')} body={t('hub.sayHelloBody')} />
          ) : (
            messages.map((message) => {
              const member = memberOf(message.user_id)
              const mine = message.user_id === user.id
              return (
                <div key={message.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Avatar
                    name={member?.profile.full_name ?? 'Member'}
                    url={member?.profile.avatar_url}
                    frame={member?.profile.avatar_frame ?? 'ring'}
                    size="xs"
                  />
                  <div className={`max-w-[82%] ${mine ? 'text-right' : ''}`}>
                    <p className="mb-0.5 text-[10px] font-bold text-ink-400">
                      {member?.profile.full_name ?? 'Member'} · {timeAgo(message.created_at)}
                    </p>
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        message.is_announcement
                          ? 'border border-amber-200 bg-amber-50 text-amber-900'
                          : mine
                            ? 'bg-brand-600 text-white'
                            : 'bg-ink-100 text-ink-800'
                      }`}
                    >
                      {message.is_announcement ? (
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                          <Megaphone className="h-3 w-3" /> {t('hub.announcement')}
                        </p>
                      ) : null}
                      {message.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t('hub.write')}
              className="field min-h-[46px] flex-1 resize-none py-2.5"
              rows={1}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
            />
            <Button onClick={send} disabled={!content.trim() || busy} loading={busy} className="h-11 shrink-0 px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {canManage ? (
              <button
                onClick={() => setAnnouncement((value) => !value)}
                className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-[11px] font-bold transition sm:min-h-0 sm:px-2 sm:py-1 sm:text-[10px] ${
                  announcement ? 'bg-amber-100 text-amber-800' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                }`}
              >
                <Megaphone className="h-3 w-3" /> {announcement ? t('hub.pinned') : t('hub.pin')}
              </button>
            ) : (
              <span className="text-[10px] text-ink-400">{t('hub.managersPin')}</span>
            )}
            <span className="text-[10px] text-ink-300">{t('hub.enterHint')}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <SectionHeading title={t('hub.announcements')} hint={t('hub.announcementsHint')} />
          <div className="space-y-2">
            {ws.messages
              .filter((message) => message.is_announcement)
              .slice(-3)
              .reverse()
              .map((message) => (
                <div key={message.id} className="rounded-xl border border-amber-100 bg-amber-50/70 p-2.5">
                  <p className="line-clamp-3 text-[11px] leading-relaxed text-amber-900">{message.content}</p>
                  <p className="mt-1 text-[10px] font-semibold text-amber-600">
                    {memberOf(message.user_id)?.profile.full_name ?? 'Admin'} · {timeAgo(message.created_at)}
                  </p>
                </div>
              ))}
            {ws.messages.filter((message) => message.is_announcement).length === 0 ? (
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">{t('hub.noAnnouncements')}</p>
            ) : null}
          </div>
        </div>

        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-700">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> {t('hub.freeTierSafe')}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{t('hub.freeTierBody')}</p>
        </div>
      </div>
    </div>
  )
}

function RosterTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [assigned, setAssigned] = useState(user?.id ?? '')
  const [date, setDate] = useState(addDays(todayISO(), 2))
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState('')

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const members = ws.members.filter((member) => member.status === 'active')
  const nameOf = (id: string) => memberName(members.find((member) => member.user_id === id))
  const memberOf = (id: string) => members.find((member) => member.user_id === id)

  const upcoming = ws.duty.filter((duty) => duty.status === 'upcoming').sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  const history = ws.duty
    .filter((duty) => duty.status !== 'upcoming')
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))

  const nudge = (duty: BazarDuty) => {
    const text = [
      `🛒 Bazar duty reminder — ${ws.mess.name}`,
      `${relativeDay(duty.scheduled_date)} (${duty.scheduled_date})`,
      `Assigned to: ${nameOf(duty.assigned_user_id)}`,
      duty.shopping_list.length ? `Items: ${duty.shopping_list.join(', ')}` : '',
      duty.market_route_notes ? `Route: ${duty.market_route_notes}` : '',
      '',
      'Sent from Mess Mates',
    ]
      .filter(Boolean)
      .join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const addDuty = async () => {
    if (!assigned || !date) return
    const list = items
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const ok = await run(
      () => backend.addDuty({ userId: assigned, date, notes: notes.trim(), items: list }),
      'Bazar duty scheduled',
    )
    if (ok) {
      setOpen(false)
      setNotes('')
      setItems('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading title={t('hub.rosterTitle')} hint={t('hub.rosterHint')} />
        {canManage ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> {t('hub.assignDuty')}
          </Button>
        ) : null}
      </div>

      {upcoming.length === 0 ? (
        <div className="card p-6">
          <EmptyState icon={<ShoppingBasket className="h-4 w-4" />} title={t('hub.noDuty')} body={t('hub.noDutyBody')} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((duty) => {
            const member = memberOf(duty.assigned_user_id)
            const isMine = duty.assigned_user_id === user.id
            return (
              <div key={duty.id} className={`card p-4 ${isMine ? 'border-amber-200 bg-amber-50/40' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white shadow-sm">
                      <span className="text-[9px] font-bold uppercase text-ink-400">{shortDate(duty.scheduled_date).split(' ')[1]}</span>
                      <span className="text-sm font-extrabold leading-none text-ink-900">{shortDate(duty.scheduled_date).split(' ')[0]}</span>
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-ink-900">
                        {nameOf(duty.assigned_user_id)} {isMine ? <span className="text-amber-700">{t('dash.you')}</span> : null}
                      </p>
                      <p className="text-[10px] font-semibold text-ink-400">{relativeDay(duty.scheduled_date)} · {weekdayLabel(duty.scheduled_date)}</p>
                    </div>
                  </div>
                  {member ? (
                    <Avatar name={member.profile.full_name} url={member.profile.avatar_url} frame={member.profile.avatar_frame} size="xs" />
                  ) : null}
                </div>

                {duty.market_route_notes ? (
                  <p className="mt-2.5 rounded-lg bg-ink-50 px-2.5 py-2 text-[11px] leading-relaxed text-ink-600">
                    🗺️ {duty.market_route_notes}
                  </p>
                ) : null}

                {duty.shopping_list.length ? (
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {duty.shopping_list.map((item) => (
                      <li key={item} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-600 ring-1 ring-ink-100">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="gold" onClick={() => nudge(duty)}>
                    <MessageSquare className="h-3 w-3" /> {t('hub.nudge')}
                  </Button>
                  {canManage || isMine ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => run(() => backend.updateDuty(duty.id, { status: 'completed' }), 'Bazar duty completed — guild points noted')}
                      >
                        <Check className="h-3 w-3" /> {t('hub.done')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(() => backend.updateDuty(duty.id, { status: 'missed' }), 'Marked as missed')}
                      >
                        <X className="h-3 w-3" /> {t('hub.missed')}
                      </Button>
                    </>
                  ) : null}
                  {canManage ? (
                    <button
                      onClick={() => run(() => backend.deleteDuty(duty.id), 'Duty removed')}
                      className="ml-auto rounded-md p-1 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                      title={t('hub.deleteDuty')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <SectionHeading title={t('hub.dutyHistory')} />
        <div className="card divide-y divide-ink-100">
          {history.length === 0 ? (
            <p className="px-4 py-3 text-xs text-ink-400">{t('hub.nothingCompleted')}</p>
          ) : (
            history.map((duty) => (
              <div key={duty.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-ink-700">{nameOf(duty.assigned_user_id)}</span>
                  <span className="text-[10px] text-ink-400">{shortDate(duty.scheduled_date)}</span>
                </div>
                <Pill tone={duty.status === 'completed' ? 'success' : 'danger'}>{duty.status}</Pill>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('hub.assignTitle')}
        subtitle={t('hub.assignSub')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              {t('hub.cancel')}
            </Button>
            <Button className="flex-1" onClick={addDuty} loading={busy}>
              {t('hub.schedule')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">{t('hub.assignedMate')}</label>
            <select className="field" value={assigned} onChange={(event) => setAssigned(event.target.value)}>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('hub.date')}</label>
            <input type="date" className="field" value={date} min={todayISO()} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('hub.routeNotes')}</label>
            <input
              className="field"
              placeholder={t('hub.routePlaceholder')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('hub.checklist')}</label>
            <textarea
              className="field min-h-[70px] resize-none"
              placeholder={t('hub.checklistPlaceholder')}
              value={items}
              onChange={(event) => setItems(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CouncilTab() {
  const { ws, user, backend, run, busy } = useApp()
  const { t } = useI18n()
  const [electionOpen, setElectionOpen] = useState(false)
  const [candidates, setCandidates] = useState<string[]>([])
  const [electionDays, setElectionDays] = useState('2')
  const [removalFor, setRemovalFor] = useState<MessMember | null>(null)
  const [removalDays, setRemovalDays] = useState('2')
  // The closed/open badge should follow the wall clock without reading it
  // during render; one refresh a minute is enough for a poll deadline.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const isAdmin = myRole === 'admin'
  const active = ws.members.filter((member) => member.status === 'active')
  const nameOf = (id: string) => memberName(ws.members.find((member) => member.user_id === id))
  const activeCount = active.length
  const term = currentManagerTerm(ws.managerTerms, todayISO())
  const manager = term ? ws.members.find((member) => member.user_id === term.user_id) : null
  const myRequest = openRequestFor(ws.requests, user.id)
  const inbox = pendingRequests(ws.requests)
  const handled = ws.requests.filter((request) => request.status !== 'pending').slice(0, 6)
  // Open votes first, then the last few applied ones so the outcome stays
  // visible instead of the card disappearing the moment it is applied.
  const openPolls = [
    ...openGovernancePolls(ws.polls, 'member_removal'),
    ...openGovernancePolls(ws.polls, 'manager_selection'),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const appliedPolls = ws.polls
    .filter((poll) => poll.kind !== 'general' && poll.result_applied)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3)
  const polls = [...openPolls, ...appliedPolls]

  const isClosed = (closesAt: string) => new Date(closesAt).getTime() <= now

  const startElection = async () => {
    const closesAt = new Date(Date.now() + Math.max(1, Number(electionDays)) * 86400_000).toISOString()
    const ok = await run(
      () => backend.createGovernancePoll('manager_selection', null, candidates, closesAt),
      'Manager election opened',
    )
    if (ok) setElectionOpen(false)
  }

  const startRemoval = async () => {
    if (!removalFor) return
    const closesAt = new Date(Date.now() + Math.max(1, Number(removalDays)) * 86400_000).toISOString()
    const ok = await run(
      () => backend.createGovernancePoll('member_removal', removalFor.user_id, [], closesAt),
      'Removal poll opened',
    )
    if (ok) setRemovalFor(null)
  }

  return (
    <div className="space-y-4">
      {!isAdmin ? (
        <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-brand-800">
          {t('gov.managerMoney')}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <SectionHeading
            title={t('gov.manager')}
            hint={t('gov.managerHint')}
            action={
              isAdmin ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCandidates(active.map((member) => member.user_id))
                    setElectionOpen(true)
                  }}
                >
                  <Vote className="h-3.5 w-3.5" /> {t('gov.startElection')}
                </Button>
              ) : undefined
            }
          />
          {manager ? (
            <div className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2.5">
              <Avatar
                name={manager.profile.full_name}
                url={manager.profile.avatar_url}
                frame={manager.profile.avatar_frame}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink-900">{manager.profile.full_name}</p>
                <p className="text-[10px] text-ink-500">
                  {term ? t('gov.managerSince', { date: shortDate(term.starts_on) }) : t('gov.managerVoted')}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-ink-50 px-3 py-2.5 text-[11px] text-ink-500">{t('gov.managerNone')}</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">{t('gov.managerMoney')}</p>
        </div>

        <div className="card p-4">
          <SectionHeading title={t('gov.requests')} hint={t('gov.requestsHint')} />
          {myRequest ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              <p className="text-[11px] font-bold text-amber-900">
                {t('gov.yourRequest', {
                  kind: myRequest.kind === 'delete' ? t('gov.kindDelete') : t('gov.kindLeave'),
                })}
              </p>
              {myRequest.note ? <p className="mt-1 text-[11px] text-amber-800">{myRequest.note}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {canLeaveWithoutWaiting(myRequest) ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => backend.leaveMessAnyway(), 'You left the mess')}
                  >
                    {t('gov.leaveAnyway')}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => run(() => backend.withdrawMemberRequest(myRequest.id), 'Request withdrawn')}
                >
                  {t('gov.withdraw')}
                </Button>
              </div>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="space-y-2">
              {inbox.length === 0 ? (
                <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">{t('gov.noRequests')}</p>
              ) : (
                inbox.map((request) => (
                  <div key={request.id} className="rounded-xl border border-ink-100 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink-900">
                          {nameOf(request.user_id)} ·{' '}
                          {request.kind === 'delete' ? t('gov.kindDelete') : t('gov.kindLeave')}
                        </p>
                        <p className="text-[10px] text-ink-400">
                          {t('gov.requestedBy', { when: timeAgo(request.created_at) })}
                        </p>
                        {request.note ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{request.note}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => downloadMemberStatement(ws, request.user_id)}
                        title={t('gov.exportStatement')}
                        className="shrink-0 rounded-md p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          run(() => backend.decideMemberRequest(request.id, true), `Request approved`)
                        }
                      >
                        <Check className="h-3.5 w-3.5" /> {t('gov.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(() => backend.decideMemberRequest(request.id, false), 'Request rejected')
                        }
                      >
                        <X className="h-3.5 w-3.5" /> {t('gov.reject')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {handled.length ? (
            <div className="mt-3 space-y-1.5">
              {handled.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 text-[10px] text-ink-500">
                  <span className="truncate">
                    {nameOf(request.user_id)} · {request.kind === 'delete' ? t('gov.kindDelete') : t('gov.kindLeave')}
                  </span>
                  <Pill tone={request.status === 'rejected' ? 'danger' : 'neutral'}>{request.status}</Pill>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <div className="card p-4">
          <SectionHeading title={t('gov.removal')} hint={t('gov.removalHint')} />
          <div className="grid gap-2 sm:grid-cols-2">
            {active
              .filter((member) => member.user_id !== user.id)
              .map((member) => (
                <div key={member.id} className="flex items-center gap-2 rounded-xl border border-ink-100 px-2.5 py-2">
                  <Avatar
                    name={member.profile.full_name}
                    url={member.profile.avatar_url}
                    frame={member.profile.avatar_frame}
                    size="xs"
                  />
                  <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink-800">{member.profile.full_name}</p>
                  <Button size="sm" variant="danger" onClick={() => setRemovalFor(member)}>
                    <UserMinus className="h-3.5 w-3.5" /> {t('gov.startRemoval')}
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionHeading title={t('gov.polls')} />
        {polls.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={<Vote className="h-4 w-4" />} title={t('gov.nonePending')} />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {polls.map((poll) => {
              const progress = pollProgress(poll, ws.votes, activeCount)
              const closed = isClosed(poll.closes_at)
              const canApply = isAdmin && !poll.result_applied && closed && progress.quorumMet
              const targetName = poll.target_user_id ? nameOf(poll.target_user_id) : ''
              const outcome =
                poll.kind === 'member_removal'
                  ? removalVerdict(poll, ws.votes, activeCount)
                  : null
              const elected = poll.kind === 'manager_selection' ? managerWinner(poll, ws.votes, activeCount) : null

              return (
                <div key={poll.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-snug text-ink-900">{poll.question}</p>
                      <p className="mt-1 text-[10px] text-ink-400">
                        {t('gov.turnout', {
                          votes: progress.votes,
                          members: progress.activeMembers,
                          required: progress.required,
                        })}
                      </p>
                    </div>
                    <Pill tone={poll.result_applied ? 'success' : closed ? 'neutral' : 'brand'}>
                      {poll.result_applied ? t('gov.applied') : t('gov.openUntil', { date: shortDate(poll.closes_at.slice(0, 10)) })}
                    </Pill>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full ${progress.quorumMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{
                        width: `${Math.min(100, (progress.votes / Math.max(1, progress.required)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      progress.quorumMet ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {progress.quorumMet
                      ? t('gov.quorumMet')
                      : t('gov.quorumMissing', { count: Math.max(0, progress.required - progress.votes) })}
                  </p>

                  <ul className="mt-2 space-y-1">
                    {poll.options.map((option, index) => (
                      <li
                        key={`${poll.id}-${index}`}
                        className="flex items-center justify-between rounded-lg bg-ink-50 px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="truncate font-semibold text-ink-700">{option}</span>
                        <span className="shrink-0 font-extrabold tabular-nums text-ink-500">
                          {progress.counts[index] ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {poll.result_applied ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800">
                      {poll.kind === 'member_removal'
                        ? outcome === 'remove_and_ban'
                          ? t('gov.removedBanned')
                          : t('gov.removedRejoin')
                        : elected
                          ? `${t('gov.managerElected')} ${nameOf(elected)}`
                          : t('gov.applied')}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {canApply ? (
                      <Button size="sm" loading={busy} onClick={() => run(() => backend.applyPollResult(poll.id), t('gov.applied'))}>
                        {t('gov.applyResult')}
                      </Button>
                    ) : null}
                    {poll.kind === 'member_removal' && poll.target_user_id ? (
                      <button
                        onClick={() => downloadMemberStatement(ws, poll.target_user_id as string)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-brand-700 hover:bg-brand-50"
                      >
                        <Download className="h-3 w-3" /> {t('gov.exportStatement')}
                        {targetName ? ` · ${targetName}` : ''}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={electionOpen}
        onClose={() => setElectionOpen(false)}
        title={t('gov.electionTitle')}
        subtitle={t('gov.electionSub')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setElectionOpen(false)}>
              {t('hub.cancel')}
            </Button>
            <Button
              className="flex-1"
              loading={busy}
              disabled={candidates.length < 2}
              onClick={startElection}
            >
              {t('gov.startPoll')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">{t('gov.candidates')}</label>
            <div className="space-y-1.5">
              {active.map((member) => {
                const checked = candidates.includes(member.user_id)
                return (
                  <label
                    key={member.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-ink-100 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCandidates((current) =>
                          checked
                            ? current.filter((id) => id !== member.user_id)
                            : [...current, member.user_id],
                        )
                      }
                      className="h-4 w-4 rounded border-ink-300"
                    />
                    <span className="text-xs font-bold text-ink-800">{member.profile.full_name}</span>
                    {member.role !== 'member' ? (
                      <Pill tone={member.role === 'admin' ? 'gold' : 'brand'}>{t(`role.${member.role}`)}</Pill>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="label">{t('gov.closesIn')}</label>
            <select className="field" value={electionDays} onChange={(event) => setElectionDays(event.target.value)}>
              {['1', '2', '3', '7'].map((value) => (
                <option key={value} value={value}>
                  {t('gov.days', { count: Number(value) })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(removalFor)}
        onClose={() => setRemovalFor(null)}
        title={t('gov.removalTitle', { name: removalFor?.profile.full_name ?? '' })}
        subtitle={t('gov.removalHint')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setRemovalFor(null)}>
              {t('hub.cancel')}
            </Button>
            <Button className="flex-1" loading={busy} onClick={startRemoval}>
              {t('gov.startPoll')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-ink-500">{t('gov.removalBody')}</p>
          <div>
            <label className="label">{t('gov.closesIn')}</label>
            <select className="field" value={removalDays} onChange={(event) => setRemovalDays(event.target.value)}>
              {['1', '2', '3', '7'].map((value) => (
                <option key={value} value={value}>
                  {t('gov.days', { count: Number(value) })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

function SettingsTab() {
  const { ws, user, cycle, settlement, backend, run, busy, signOut, setCycleId } = useApp()
  const { isPro, openUpgrade } = useMonetization()
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(ws?.mess.name ?? '')
  const [currency, setCurrency] = useState(ws?.mess.currency_symbol ?? '৳')
  const [lockHour, setLockHour] = useState(String(ws?.mess.meal_lock_hour ?? 22))
  const [displayName, setDisplayName] = useState(user?.full_name ?? '')
  const [perMessName, setPerMessName] = useState(
    () => ws?.members.find((member) => member.user_id === user?.id)?.display_name ?? '',
  )
  const [nextMonth, setNextMonth] = useState(monthOptions(4)[1]?.label ?? '')
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [closing, setClosing] = useState<MonthlyCycle | null>(null)
  const [errorRows, setErrorRows] = useState<ClientError[] | null>(null)
  const [errorsBusy, setErrorsBusy] = useState(false)
  const [platformAdmin, setPlatformAdmin] = useState(false)
  const monthChoices = monthOptions(4)

  useEffect(() => {
    let cancelled = false
    backend
      .isPlatformAdmin()
      .then((allowed) => {
        if (!cancelled) setPlatformAdmin(allowed)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [backend])

  if (!ws || !user) return null

  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const isAdmin = myRole === 'admin'
  const myRequest = openRequestFor(ws.requests, user.id)
  const joinRequests = (ws.joinRequests ?? []).filter((request) => request.status === 'pending')
  const duplicates = isAdmin ? findLikelyDuplicates(ws.members) : []
  const labelOf = (member: (typeof ws.members)[number]) =>
    member.display_name?.trim() || member.profile.full_name
  const reasonLabel = (reason: 'name' | 'email' | 'photo') =>
    t(
      reason === 'name'
        ? 'hub.duplicateReasonName'
        : reason === 'email'
          ? 'hub.duplicateReasonEmail'
          : 'hub.duplicateReasonPhoto',
    )

  const loadErrors = async () => {
    setErrorsBusy(true)
    try {
      setErrorRows(await backend.loadClientErrors())
    } catch {
      setErrorRows([])
    } finally {
      setErrorsBusy(false)
    }
  }

  const savePerMessName = () =>
    run(() => backend.setMemberIdentity({ displayName: perMessName }), t('ledger.messNameSaved'))

  const saveMess = () =>
    run(
      () =>
        backend.updateMess({
          name: name.trim() || ws.mess.name,
          currency_symbol: currency,
          meal_lock_hour: Math.min(23, Math.max(0, Number(lockHour) || 22)),
        }),
      'Mess settings saved',
    )

  const startCycle = async () => {
    const ok = await run(() => backend.createCycle(nextMonth), `Cycle for ${monthTitle(nextMonth)} is open`)
    if (ok) setCycleId('')
  }

  const closingReview = closing ? closeOutReview(ws, closing, computeSettlement(ws, closing.id)) : null
  const symbol = ws.mess.currency_symbol

  const issueText = (issue: CloseOutIssue): string => {
    switch (issue.kind) {
      case 'pendingBazar':
        return t('hub.closePendingBazar', {
          count: issue.count ?? 0,
          amount: money(issue.amount ?? 0, symbol),
        })
      case 'noMeals':
        return t('hub.closeNoMeals')
      case 'noUtilities':
        return t('hub.closeNoUtilities')
      case 'noDeposits':
        return t('hub.closeNoDeposits')
      case 'dues':
        return t('hub.closeDues', { count: issue.count ?? 0, amount: money(issue.amount ?? 0, symbol) })
      case 'credit':
        return t('hub.closeCredit', { count: issue.count ?? 0, amount: money(issue.amount ?? 0, symbol) })
    }
  }

  const confirmClose = async () => {
    if (!closing) return
    const ok = await run(() => backend.setCycleStatus(closing.id, 'closed'), t('hub.closeDone'))
    if (ok) setClosing(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4 lg:col-span-2">
        <SectionHeading title={t('ledger.messName')} hint={t('ledger.messNameHint')} />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="field"
            maxLength={40}
            value={perMessName}
            placeholder={user.full_name}
            onChange={(event) => setPerMessName(event.target.value)}
          />
          <Button disabled={busy} onClick={savePerMessName} className="sm:w-auto">
            {t('ledger.messNameSave')}
          </Button>
        </div>
      </div>

      <div className="card p-4">
        <SectionHeading title={t('hub.messProfile')} hint={canManage ? t('hub.canEdit') : t('hub.readOnly')} />
        <div className="space-y-3">
          <div>
            <label className="label">{t('hub.messName')}</label>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">{t('hub.currency')}</label>
              <select className="field" value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={!canManage}>
                {['৳', '₹', '$', 'Rs'].map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('hub.lockHour')}</label>
              <input
                type="number"
                min="0"
                max="23"
                className="field"
                value={lockHour}
                onChange={(event) => setLockHour(event.target.value)}
                disabled={!canManage}
              />
            </div>
          </div>
          <Button className="w-full" disabled={!canManage || busy} loading={busy} onClick={saveMess}>
            {t('hub.saveMess')}
          </Button>

          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">{t('hub.inviteCode')}</p>
              <p className="font-mono text-lg font-extrabold tracking-[0.25em] text-brand-900">{ws.mess.invite_code}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ShareButton
                title={t('share.inviteTitle')}
                text={t('share.inviteText', { mess: ws.mess.name, code: ws.mess.invite_code })}
                label={t('share.invite')}
              />
              <CopyButton value={ws.mess.invite_code} label={t('hub.copyCode')} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <SectionHeading title={t('hub.yourProfile')} hint={t('hub.xpEarned', { xp: user.xp_points })} />
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="lg" />
          <div className="flex-1">
            <label className="label">{t('hub.displayName')}</label>
            <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
        </div>
        <Button
          className="mt-3 w-full"
          variant="secondary"
          disabled={displayName.trim().length < 2 || busy}
          onClick={() => run(() => backend.updateProfile({ full_name: displayName.trim() }), 'Profile updated')}
        >
          {t('hub.saveProfile')}
        </Button>

        <div className="mt-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
            {t('hub.members', { count: ws.members.filter((m) => m.status === 'active').length })}
          </p>
          {isAdmin ? <p className="mb-2 text-[10px] text-ink-400">{t('hub.membersHint')}</p> : null}
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
            {ws.members
              .filter((member) => member.status === 'active')
              .map((member) => (
                <div key={member.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <Avatar name={member.profile.full_name} url={member.profile.avatar_url} frame={member.profile.avatar_frame} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink-800">
                      {member.profile.full_name}{' '}
                      {member.user_id === user.id ? <span className="text-brand-600">{t('dash.you')}</span> : null}
                    </p>
                    <p className="text-[10px] text-ink-400">{member.profile.email || member.profile.xp_points + ' XP'}</p>
                  </div>
                  {isAdmin && member.user_id !== user.id ? (
                    <>
                      <select
                        aria-label={t('hub.role')}
                        className="rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-[10px] font-bold text-ink-700"
                        value={member.role}
                        disabled={busy}
                        onChange={(event) => {
                          const next = event.target.value as Role
                          void run(
                            () => backend.updateMemberRole(member.id, next),
                            `${member.profile.full_name} is now ${next}`,
                          )
                        }}
                      >
                        <option value="admin">{t('role.admin')}</option>
                        <option value="manager">{t('role.manager')}</option>
                        <option value="member">{t('role.member')}</option>
                      </select>
                    </>
                  ) : (
                    <Pill tone={member.role === 'admin' ? 'gold' : member.role === 'manager' ? 'brand' : 'neutral'}>
                      {t(`role.${member.role}`)}
                    </Pill>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <SectionHeading title={t('hub.cycles')} hint={t('hub.cyclesHint')} />
        <div className="space-y-2">
          {ws.cycles.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-xs font-bold text-ink-800">{monthTitle(entry.month_label)}</span>
                {entry.id === cycle?.id ? <Pill tone="brand">{t('hub.viewing')}</Pill> : null}
              </div>
              <div className="flex items-center gap-1.5">
                <Pill tone={entry.status === 'open' ? 'success' : 'neutral'}>{entry.status}</Pill>
                <button onClick={() => setCycleId(entry.id)} className="rounded-md px-1.5 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-50">
                  {t('hub.view')}
                </button>
                {canManage && entry.status === 'open' ? (
                  <button
                    onClick={() => setClosing(entry)}
                    className="inline-flex min-h-9 items-center rounded-md px-2 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 max-md:min-h-11"
                  >
                    {t('hub.reviewClose')}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {canManage ? (
          <div className="mt-3 flex flex-col gap-2 xs:flex-row">
            <select className="field flex-1" value={nextMonth} onChange={(event) => setNextMonth(event.target.value)}>
              {monthChoices.map((choice) => (
                <option key={choice.label} value={choice.label}>
                  {choice.title}
                </option>
              ))}
            </select>
            <Button onClick={startCycle} loading={busy}>
              <Clock className="h-4 w-4" /> {t('hub.start')}
            </Button>
          </div>
        ) : null}
        <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
          {t('hub.cyclesNote')}
        </p>
      </div>

      <div className="space-y-3">
        {!isPro ? (
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-ink-900 to-brand-800 p-4 text-white">
              <p className="flex items-center gap-1.5 text-sm font-extrabold">
                <Crown className="h-4 w-4 text-amber-300" /> {t('hub.proTitle')}
              </p>
              <p className="mt-1 text-[11px] text-white/70">{t('hub.proBody')}</p>
            </div>
            <div className="p-3">
              <Button className="w-full" variant="gold" onClick={openUpgrade}>
                <Crown className="h-4 w-4" /> {t('hub.upgradeMess')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="card flex items-center gap-2 p-4">
            <Crown className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-bold text-ink-800">
              {ws.mess.pro_until
                ? t('hub.proUntil', { date: shortDate(dhakaDate(new Date(ws.mess.pro_until))) })
                : t('hub.proActive')}
            </p>
          </div>
        )}

        {isAdmin ? (
          <div className="card p-4">
            <SectionHeading title={t('hub.joinRequests')} hint={t('hub.joinRequestsHint')} />
            {joinRequests.length === 0 ? (
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
                {t('hub.noJoinRequests')}
              </p>
            ) : (
              <div className="space-y-2">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 px-2.5 py-2"
                  >
                    <Avatar
                      name={request.profile?.full_name ?? 'New mate'}
                      url={request.profile?.avatar_url ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink-900">
                        {request.profile?.full_name ?? 'New mate'}
                      </p>
                      <p className="text-[10px] text-ink-400">
                        {request.profile?.email || t('hub.joinRequested', { when: timeAgo(request.created_at) })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => backend.decideJoinRequest(request.id, true), t('hub.joinApproved'))
                      }
                    >
                      <Check className="h-3.5 w-3.5" /> {t('hub.approveJoin')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(() => backend.decideJoinRequest(request.id, false), t('hub.joinRejected'))
                      }
                    >
                      <X className="h-3.5 w-3.5" /> {t('hub.rejectJoin')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {duplicates.length ? (
          <div className="card border-amber-200 p-4">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {t('hub.duplicateTitle')}
            </p>
            <div className="mt-2 space-y-2">
              {duplicates.map((pair) => (
                <p
                  key={`${pair.first.id}-${pair.second.id}`}
                  className="text-[11px] leading-relaxed text-ink-600"
                >
                  {t('hub.duplicateBody', {
                    first: labelOf(pair.first),
                    second: labelOf(pair.second),
                    reason: reasonLabel(pair.reason),
                  })}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card p-4">
          <SectionHeading title={t('theme.label')} />
          <div className="flex flex-wrap gap-1.5">
            {(['system', 'light', 'dark'] as Theme[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
                  theme === value
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200'
                }`}
              >
                {t(`theme.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {isAdmin ? (
          <div className="card p-4">
            <SectionHeading title={t('hub.appErrors')} hint={t('hub.appErrorsHint')} />
            <Button variant="secondary" className="w-full" loading={errorsBusy} onClick={loadErrors}>
              <ShieldAlert className="h-4 w-4" /> {t('hub.loadErrors')}
            </Button>
            {errorRows ? (
              errorRows.length === 0 ? (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                  {t('hub.noErrors')}
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {errorRows.map((row) => (
                    <div key={row.id} className="rounded-lg bg-ink-50 px-2.5 py-2">
                      <p className="line-clamp-2 text-[11px] font-semibold text-ink-800">{row.message}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {t('hub.errorAt', { route: row.route || '/', when: timeAgo(row.created_at) })}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </div>
        ) : null}

        <div className="card p-4">
          <SectionHeading title={t('hub.dataPrivacy')} hint={t('hub.dataPrivacyHint')} />
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={() => downloadWorkspace(ws)}>
              <Download className="h-4 w-4" /> {t('hub.exportJson')}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!cycle || !settlement}
              onClick={() => {
                if (cycle && settlement) downloadSettlementCsv(ws, cycle, settlement)
              }}
            >
              <Download className="h-4 w-4" /> {t('hub.exportCsv')}
            </Button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('hub.exportHint')}</p>
          {myRequest ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-800">
              {t('gov.yourRequest', {
                kind: myRequest.kind === 'delete' ? t('gov.kindDelete') : t('gov.kindLeave'),
              })}
            </p>
          ) : null}
          <button
            onClick={() => setLeaving(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-[10px] font-bold text-ink-400 transition hover:border-rose-200 hover:text-rose-500"
          >
            <Trash2 className="h-3 w-3" /> {t('hub.leaveMess')}
          </button>
          <button
            onClick={() => setDeleting(true)}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-[10px] font-bold text-ink-400 transition hover:border-rose-200 hover:text-rose-500"
          >
            <ShieldAlert className="h-3 w-3" /> {t('gov.requestDeletion')}
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-300">{t('hub.accountDeleteNote')}</p>
        </div>

        <div className="card p-4">
          <SectionHeading title={t('hub.account')} />
          <Button variant="secondary" className="w-full" onClick={signOut} loading={busy}>
            {t('common.signOut')}
          </Button>
          {backend.mode === 'demo' ? (
            <button
              onClick={() => {
                resetDemoData()
                window.location.reload()
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-[10px] font-bold text-ink-400 hover:border-rose-200 hover:text-rose-500"
            >
              <Trash2 className="h-3 w-3" /> {t('hub.resetDemo')}
            </button>
          ) : null}
          {platformAdmin ? (
            <Link
              to="/support"
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-800 transition hover:bg-brand-100"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Platform support console
            </Link>
          ) : null}
          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
              {t('hub.legalHint')}
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-bold">
              <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
                {t('legal.privacyTitle')}
              </Link>
              <Link to="/terms" className="text-brand-700 hover:text-brand-800">
                {t('legal.termsTitle')}
              </Link>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1 text-[10px] text-ink-400">
            <ShieldCheck className="h-3 w-3" />{' '}
            {backend.mode === 'demo' ? t('hub.demoFooter') : t('hub.liveFooter')}
          </p>
        </div>
      </div>

      <Modal
        open={closing !== null}
        onClose={() => setClosing(null)}
        title={t('hub.closeTitle', { month: monthTitle(closing?.month_label ?? '') })}
        subtitle={t('hub.closeSub')}
        footer={
          <div className="flex flex-col gap-2 xs:flex-row-reverse">
            <Button className="flex-1" loading={busy} onClick={confirmClose}>
              <Lock className="h-4 w-4" /> {t('hub.closeConfirm')}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setClosing(null)}>
              {t('hub.cancel')}
            </Button>
          </div>
        }
      >
        {closingReview ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                {t('hub.closeSummary')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: t('hub.closeMealRate'),
                    value: money(closingReview.settlement.mealRate, symbol),
                  },
                  { label: t('hub.closeMeals'), value: formatMeals(closingReview.settlement.totalMeals) },
                  {
                    label: t('hub.closeBazar'),
                    value: money(closingReview.settlement.totalBazar, symbol),
                  },
                  {
                    label: t('hub.closeDeposits'),
                    value: money(closingReview.settlement.totalDeposits, symbol),
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-ink-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-sm font-extrabold tabular-nums text-ink-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {closingReview.issues.length === 0 ? (
                <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('hub.closeReady')}
                </p>
              ) : (
                closingReview.issues.map((issue) => (
                  <p
                    key={issue.kind}
                    className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium ${
                      issue.tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-ink-50 text-ink-600'
                    }`}
                  >
                    {issue.tone === 'warn' ? (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{issueText(issue)}</span>
                  </p>
                ))
              )}
              {closingReview.transfers > 0 ? (
                <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-[11px] font-semibold text-brand-800">
                  {t('hub.closeTransfers', { count: closingReview.transfers })}
                </p>
              ) : null}
            </div>

            <p className="text-[11px] leading-relaxed text-ink-500">{t('hub.closeLockNote')}</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title={t('gov.leaveTitle', { name: ws.mess.name })}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setLeaving(false)}>
              {t('hub.cancel')}
            </Button>
            <Button
              className="flex-1"
              loading={busy}
              onClick={async () => {
                const ok = await run(() => backend.requestLeave('leave'), 'Leave request sent to the admin')
                if (ok) setLeaving(false)
              }}
            >
              {t('gov.sendRequest')}
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-ink-500">{t('gov.leaveBody')}</p>
      </Modal>

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title={t('gov.deleteTitle')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleting(false)}>
              {t('hub.cancel')}
            </Button>
            <Button
              className="flex-1"
              loading={busy}
              onClick={async () => {
                const ok = await run(() => backend.requestLeave('delete'), t('gov.requestSent'))
                if (ok) setDeleting(false)
              }}
            >
              {t('gov.requestDeletion')}
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-ink-500">{t('gov.deleteBody')}</p>
      </Modal>
    </div>
  )
}
