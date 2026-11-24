import type { Settlement } from './calc'
import { monthTitle } from './format'
import type { MonthlyCycle, Workspace } from './types'

/**
 * Mess data belongs to the people who entered it, so every screen that offers
 * export uses these helpers: one complete JSON backup and one spreadsheet view
 * of the month. Both are plain downloads — no server, no extra dependency.
 */

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mess'
}

function save(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function workspaceBackup(ws: Workspace): string {
  return JSON.stringify(
    {
      app: 'mess-mates',
      schema: 1,
      exportedAt: new Date().toISOString(),
      ...ws,
    },
    null,
    2,
  )
}

export function downloadWorkspace(ws: Workspace): string {
  const name = `mess-mates-${slug(ws.mess.name)}-${new Date().toISOString().slice(0, 10)}.json`
  save(name, workspaceBackup(ws), 'application/json')
  return name
}

/** RFC 4180 quoting: only quote when the value needs it. */
export function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function settlementCsv(ws: Workspace, cycle: MonthlyCycle, settlement: Settlement): string {
  const symbol = ws.mess.currency_symbol
  const money = (label: string) => `${label} (${symbol})`
  const rows: (string | number)[][] = [
    ['Mess Mates settlement'],
    ['Mess', ws.mess.name],
    ['Month', monthTitle(cycle.month_label)],
    ['Status', cycle.status],
    ['Meal rate', settlement.mealRate],
    ['Active members', settlement.memberCount],
    [],
    [
      'Member',
      'Meals',
      money('Meal cost'),
      money('Utility'),
      money('Payable'),
      money('Deposits'),
      money('Carried'),
      money('Balance'),
    ],
    ...settlement.members.map((member) => [
      member.name,
      member.meals,
      member.mealCost,
      member.utilityShare,
      member.payable,
      member.deposits,
      member.carriedBalance,
      member.balance,
    ]),
    [
      'Total',
      settlement.totalMeals,
      settlement.totalPayable - settlement.totalUtilities,
      settlement.totalUtilities,
      settlement.totalPayable,
      settlement.totalDeposits,
      settlement.carriedTotal,
      settlement.refundable - settlement.due,
    ],
  ]

  // The BOM keeps Bangla names readable when Excel opens the file directly.
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  return `\uFEFF${body}\r\n`
}

export function downloadSettlementCsv(ws: Workspace, cycle: MonthlyCycle, settlement: Settlement): string {
  const name = `mess-mates-${slug(ws.mess.name)}-${slug(monthTitle(cycle.month_label))}.csv`
  save(name, settlementCsv(ws, cycle, settlement), 'text/csv;charset=utf-8')
  return name
}
