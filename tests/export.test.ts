import { describe, expect, test } from 'bun:test'
import { csvCell, settlementCsv, workspaceBackup } from '../src/lib/export'
import type { Settlement } from '../src/lib/calc'
import type { MonthlyCycle, Workspace } from '../src/lib/types'

const mess = {
  id: 'mess-1',
  name: 'Green House',
  invite_code: 'GH1234',
  currency_symbol: '৳',
  guild_banner_url: null,
  guild_banner: 'midnight',
  guild_emblem: '🏠',
  guild_points: 120,
  is_pro_mess: false,
  meal_lock_hour: 22,
  created_by: 'user-1',
}

const cycle = {
  id: 'cycle-1',
  mess_id: 'mess-1',
  month_label: '2026-11',
  status: 'open',
} as MonthlyCycle

const settlement = {
  members: [
    {
      userId: 'user-1',
      name: 'Abir, "Boss"',
      breakfast: 30,
      lunch: 30,
      dinner: 30,
      guestMeals: 0,
      meals: 90,
      mealCost: 300,
      utilityShare: 50,
      payable: 350,
      deposits: 500,
      carriedBalance: 0,
      balance: 150,
    },
  ],
  totalMeals: 90,
  totalBazar: 300,
  totalUtilities: 50,
  totalPayable: 350,
  totalDeposits: 500,
  carriedTotal: 0,
  refundable: 150,
  due: 0,
  mealRate: 3.33,
  memberCount: 1,
} as unknown as Settlement

const workspace = { mess } as unknown as Workspace

describe('data export', () => {
  test('the JSON backup keeps the mess and its members', () => {
    const parsed = JSON.parse(workspaceBackup(workspace))
    expect(parsed.app).toBe('mess-mates')
    expect(parsed.mess.name).toBe('Green House')
    expect(typeof parsed.exportedAt).toBe('string')
  })

  test('CSV quotes names that contain commas or quotes', () => {
    expect(csvCell('Abir, "Boss"')).toBe('"Abir, ""Boss"""')
    expect(csvCell(42)).toBe('42')
  })

  test('the settlement CSV carries the month, every member and a total', () => {
    const csv = settlementCsv(workspace, cycle, settlement)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Green House')
    expect(csv).toContain('November 2026')
    expect(csv).toContain('"Abir, ""Boss"""')
    expect(csv).toContain('Total,90,')
    expect(csv.split('\r\n').length).toBeGreaterThan(8)
  })
})
