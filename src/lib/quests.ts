import { gettingStartedState } from './gettingStarted'
import type { MessageKey } from './i18n'
import type { MonthlyCycle, Workspace } from './types'

export type QuestKey = 'meals' | 'bazar' | 'deposit' | 'vote' | 'utilities' | 'invite'

export interface Quest {
  key: QuestKey
  label: MessageKey
  to: string
  xp: number
  done: boolean
}

export interface QuestProgress {
  total: number
  cleared: number
  banked: number
  totalXp: number
  percent: number
  allClear: boolean
}

/**
 * The six real actions a new mess needs, in the order it needs them. Shared so
 * the dashboard can retire the board the moment the last one is cleared, and so
 * the board itself never invents an action the product does not have.
 */
export function questStatus(
  ws: Workspace,
  cycle: MonthlyCycle,
  today: string,
  mine: { deposits: number; voted: boolean },
): Quest[] {
  const firstRun = gettingStartedState(ws, cycle, today)
  const done = (step: string) => firstRun.find((state) => state.step === step)?.done ?? false

  return [
    { key: 'meals', label: 'quest.meals', to: '/meals', xp: 20, done: done('meals') },
    { key: 'bazar', label: 'quest.bazar', to: '/meals', xp: 30, done: done('bazar') },
    { key: 'deposit', label: 'quest.deposit', to: '/meals', xp: 25, done: mine.deposits > 0 },
    { key: 'vote', label: 'quest.vote', to: '/arena', xp: 15, done: mine.voted },
    { key: 'utilities', label: 'quest.utilities', to: '/meals', xp: 20, done: done('utilities') },
    { key: 'invite', label: 'quest.invite', to: '/hub', xp: 40, done: done('invite') },
  ]
}

export function questProgress(quests: Quest[]): QuestProgress {
  const total = quests.length
  const cleared = quests.filter((quest) => quest.done).length
  const banked = quests.reduce((sum, quest) => sum + (quest.done ? quest.xp : 0), 0)
  const totalXp = quests.reduce((sum, quest) => sum + quest.xp, 0)

  return {
    total,
    cleared,
    banked,
    totalXp,
    percent: total > 0 ? Math.round((cleared / total) * 100) : 0,
    allClear: total > 0 && cleared === total,
  }
}
