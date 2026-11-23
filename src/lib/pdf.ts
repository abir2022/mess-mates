import type { Settlement } from './calc'

export interface SettlementPdfInput {
  messName: string
  monthLabel: string
  status: string
  currencySymbol: string
  settlement: Settlement
  generatedBy: string
  branded: boolean
}

/** jsPDF's built-in fonts are WinAnsi, so non-Latin currency symbols fall back to the ISO code. */
function asciiCurrency(symbol: string): string {
  return /^[\x20-\x7E]+$/.test(symbol) ? symbol : 'BDT '
}

const BRAND: [number, number, number] = [13, 105, 99]
const INK: [number, number, number] = [15, 23, 42]
const MUTED: [number, number, number] = [100, 116, 139]
const DANGER: [number, number, number] = [190, 18, 60]

export async function downloadSettlementPdf(input: SettlementPdfInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const { settlement } = input

  const currency = asciiCurrency(input.currencySymbol)
  const amount = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0
    const sign = safe < 0 ? '-' : ''
    const body = Math.abs(safe).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${sign}${currency}${body}`
  }
  const meals = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const bottomLimit = pageHeight - 18

  // Header band
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageWidth, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('MESS MATES  ·  MONTH-END SETTLEMENT', margin, 12)
  doc.setFontSize(17)
  doc.text(input.messName, margin, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${input.monthLabel} · ${input.status} · ${settlement.memberCount} active members`, margin, 27)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('MEAL RATE', pageWidth - margin, 14, { align: 'right' })
  doc.setFontSize(14)
  doc.text(amount(settlement.mealRate), pageWidth - margin, 22, { align: 'right' })

  // Summary strip
  const stats: { label: string; value: string }[] = [
    { label: 'Total meals', value: meals(settlement.totalMeals) },
    { label: 'Approved bazar', value: amount(settlement.totalBazar) },
    { label: 'Fixed utilities', value: amount(settlement.totalUtilities) },
    { label: 'Deposits', value: amount(settlement.totalDeposits) },
    { label: 'Utility / member', value: amount(settlement.utilityShare) },
  ]
  const gap = 3
  const boxWidth = (contentWidth - gap * (stats.length - 1)) / stats.length
  let y = 38
  stats.forEach((stat, index) => {
    const x = margin + index * (boxWidth + gap)
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, boxWidth, 15, 2, 2, 'FD')
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.text(stat.label.toUpperCase(), x + 3, y + 5.5)
    doc.setTextColor(...INK)
    doc.setFontSize(9)
    doc.text(stat.value, x + 3, y + 11.5)
  })

  // Table
  const columns: { label: string; width: number; align: 'left' | 'right' }[] = [
    { label: 'Member', width: 46, align: 'left' },
    { label: 'Meals', width: 14, align: 'right' },
    { label: 'Meal cost', width: 20, align: 'right' },
    { label: 'Utility', width: 18, align: 'right' },
    { label: 'Payable', width: 21, align: 'right' },
    { label: 'Deposits', width: 21, align: 'right' },
    { label: 'Carried', width: 18, align: 'right' },
    { label: 'Balance', width: contentWidth - 158, align: 'right' },
  ]

  const drawTableHead = (top: number) => {
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, top, contentWidth, 7, 'F')
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    let x = margin
    columns.forEach((column) => {
      if (column.align === 'right') {
        doc.text(column.label.toUpperCase(), x + column.width - 2, top + 4.6, { align: 'right' })
      } else {
        doc.text(column.label.toUpperCase(), x + 2, top + 4.6)
      }
      x += column.width
    })
    return top + 7
  }

  y += 21
  y = drawTableHead(y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  settlement.members.forEach((member) => {
    if (y + 7 > bottomLimit) {
      doc.addPage()
      y = drawTableHead(margin)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
    }
    const cells = [
      member.name,
      meals(member.meals),
      amount(member.mealCost),
      amount(member.utilityShare),
      amount(member.payable),
      amount(member.deposits),
      amount(member.carriedBalance),
      amount(member.balance),
    ]
    let x = margin
    cells.forEach((cell, index) => {
      const column = columns[index]
      const negative = index === columns.length - 1 && member.balance < 0
      if (negative) {
        doc.setTextColor(...DANGER)
        doc.setFont('helvetica', 'bold')
      } else if (index === 0) {
        doc.setTextColor(...INK)
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setTextColor(...MUTED)
        doc.setFont('helvetica', 'normal')
      }
      if (column.align === 'right') {
        doc.text(cell, x + column.width - 2, y + 4.6, { align: 'right' })
      } else {
        doc.text(doc.splitTextToSize(cell, column.width - 4)[0] ?? '', x + 2, y + 4.6)
      }
      x += column.width
    })
    doc.setDrawColor(241, 245, 249)
    doc.line(margin, y + 6.6, pageWidth - margin, y + 6.6)
    y += 7
  })

  // Totals
  if (y + 8 > bottomLimit) {
    doc.addPage()
    y = margin
  }
  doc.setDrawColor(203, 213, 225)
  doc.line(margin, y, pageWidth - margin, y)
  const totals = [
    'Total',
    meals(settlement.totalMeals),
    amount(settlement.totalPayable - settlement.totalUtilities),
    amount(settlement.totalUtilities),
    amount(settlement.totalPayable),
    amount(settlement.totalDeposits),
    amount(settlement.carriedTotal),
    amount(settlement.refundable - settlement.due),
  ]
  let x = margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  totals.forEach((cell, index) => {
    const column = columns[index]
    doc.setTextColor(...INK)
    if (column.align === 'right') {
      doc.text(cell, x + column.width - 2, y + 5, { align: 'right' })
    } else {
      doc.text(cell, x + 2, y + 5)
    }
    x += column.width
  })
  y += 12

  // Dues / refundable
  if (y + 26 > bottomLimit) {
    doc.addPage()
    y = margin
  }
  const halfWidth = (contentWidth - 4) / 2
  const card = (left: number, label: string, value: string, note: string, tone: 'due' | 'credit') => {
    doc.setFillColor(...(tone === 'due' ? [254, 242, 242] : [236, 253, 245]) as [number, number, number])
    doc.roundedRect(left, y, halfWidth, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...(tone === 'due' ? DANGER : ([4, 120, 87] as [number, number, number])))
    doc.text(label.toUpperCase(), left + 4, y + 6)
    doc.setFontSize(11)
    doc.text(value, left + 4, y + 12.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(note, left + 4, y + 16.5)
  }
  card(margin, 'Total dues to collect', amount(settlement.due), 'Members with a negative balance.', 'due')
  card(
    margin + halfWidth + 4,
    'Total refundable',
    amount(settlement.refundable),
    'Members with a positive balance.',
    'credit',
  )
  y += 24

  // How it is calculated
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('HOW THIS IS CALCULATED', margin, y)
  doc.setFont('helvetica', 'normal')
  const explanation = doc.splitTextToSize(
    'Meal rate = approved bazar / total mess meals. Payable = member meals x meal rate + fixed utility share. ' +
      'Balance = deposits + balance carried from earlier months - payable. Pending bazar is excluded until a manager approves it.',
    contentWidth,
  )
  doc.text(explanation, margin, y + 4)
  y += 4 + explanation.length * 3.4

  // Signature lines
  if (y + 20 > bottomLimit) {
    doc.addPage()
    y = margin
  }
  const lineWidth = 60
  doc.setDrawColor(148, 163, 184)
  doc.line(margin, y + 10, margin + lineWidth, y + 10)
  doc.line(pageWidth - margin - lineWidth, y + 10, pageWidth - margin, y + 10)
  doc.setFontSize(6.5)
  doc.text('Prepared by (Manager)', margin, y + 14)
  doc.text('Approved by (Admin)', pageWidth - margin - lineWidth, y + 14)

  // Footer
  const footerY = pageHeight - 12
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  const stamp = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  doc.text(`${input.branded ? 'Generated with Mess Mates Pro' : 'Generated with Mess Mates'} · ${input.generatedBy} · ${stamp}`, margin, footerY)
  doc.text('messmates.app', pageWidth - margin, footerY, { align: 'right' })

  const slug = input.monthLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`mess-mates-settlement-${slug || 'month'}.pdf`)
}
