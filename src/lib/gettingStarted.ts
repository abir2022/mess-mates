import type { MonthlyCycle, Workspace } from './types'

export type GettingStartedStep = 'invite' | 'utilities' | 'meals' | 'bazar'

export interface GettingStartedState {
  step: GettingStartedStep
  done: boolean
}

/**
 * Which of the four first-run actions a mess has already done. Pure so it can be
 * checked without a browser; `today` is passed in for the same reason.
 */
export function gettingStartedState(
  ws: Workspace,
  cycle: MonthlyCycle,
  today: string,
): GettingStartedState[] {
  return [
    {
      step: 'invite',
      done: ws.members.filter((member) => member.status === 'active').length > 1,
    },
    {
      step: 'utilities',
      done: ws.utilities.some((utility) => utility.cycle_id === cycle.id),
    },
    {
      step: 'meals',
      done: ws.meals.some((meal) => meal.date === today),
    },
    {
      step: 'bazar',
      done: ws.bazar.some((expense) => expense.cycle_id === cycle.id),
    },
  ]
}
