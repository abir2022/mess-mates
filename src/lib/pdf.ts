import type { Settlement } from './calc'
import { getLang } from './i18n'
import { money, monthTitle } from './format'

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

async function downloadVectorPdf(input: SettlementPdfInput): Promise<void> {
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

const BENGALI = /[\u0980-\u09FF]/

/**
 * jsPDF's built-in fonts are WinAnsi: they cannot draw Bengali or `৳`. When the
 * statement contains either, the page is drawn on a canvas first (the browser
 * shapes the script correctly, including conjuncts) and embedded as an image.
 */
export async function downloadSettlementPdf(input: SettlementPdfInput): Promise<void> {
  const names = [input.messName, input.generatedBy, ...input.settlement.members.map((member) => member.name)]
  const needsRaster = getLang() === 'bn' || names.some((value) => BENGALI.test(value)) || BENGALI.test(input.currencySymbol)
  if (!needsRaster) return downloadVectorPdf(input)

  const pages = await renderSettlementPages(input)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  pages.forEach((image, index) => {
    if (index > 0) doc.addPage()
    doc.addImage(image, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
  })
  const slug = input.monthLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`mess-mates-settlement-${slug || 'month'}.pdf`)
}

type Ctx = CanvasRenderingContext2D

const CANVAS_W = 1240
const CANVAS_H = 1754
const MARGIN = 78
const FONT_STACK = '"Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif'
const BRAND_HEX = '#0d6963'
const INK_HEX = '#0f2b3d'
const MUTED_HEX = '#64748b'
const DANGER_HEX = '#be123c'
const EMERALD_HEX = '#047857'

interface Labels {
  kicker: string
  headline: string
  member: string
  meals: string
  mealCost: string
  utility: string
  payable: string
  deposits: string
  carried: string
  balance: string
  total: string
  totalMeals: string
  approvedBazar: string
  fixedUtilities: string
  utilityShare: string
  dues: string
  refundable: string
  duesNote: string
  refundNote: string
  how: string
  explanation: string
  prepared: string
  approved: string
  generated: string
  page: string
}

const LABELS: Record<'en' | 'bn', Labels> = {
  en: {
    kicker: 'MESS MATES  ·  MONTH-END SETTLEMENT',
    headline: 'Member breakdown',
    member: 'MEMBER',
    meals: 'MEALS',
    mealCost: 'MEAL COST',
    utility: 'UTILITY',
    payable: 'PAYABLE',
    deposits: 'DEPOSITS',
    carried: 'CARRIED',
    balance: 'BALANCE',
    total: 'Total',
    totalMeals: 'Total meals',
    approvedBazar: 'Approved bazar',
    fixedUtilities: 'Fixed utilities',
    utilityShare: 'Utility / member',
    dues: 'TOTAL DUES TO COLLECT',
    refundable: 'TOTAL REFUNDABLE',
    duesNote: 'Members with a negative balance.',
    refundNote: 'Members with a positive balance.',
    how: 'HOW THIS IS CALCULATED',
    explanation:
      'Meal rate = approved bazar / total meals. Payable = member meals x meal rate + fixed utility share. Balance = deposits + approved late payments + balance carried from earlier months - payable.',
    prepared: 'Prepared by (Manager)',
    approved: 'Approved by (Admin)',
    generated: 'Generated with Mess Mates',
    page: 'Page {n}',
  },
  bn: {
    kicker: 'মেস মেটস  ·  মাস শেষের নিষ্পত্তি',
    headline: 'সদস্য ভাগ',
    member: 'সদস্য',
    meals: 'মিল',
    mealCost: 'মিলের খরচ',
    utility: 'ইউটিলিটি',
    payable: 'প্রদেয়',
    deposits: 'জমা',
    carried: 'বহন',
    balance: 'ব্যালেন্স',
    total: 'মোট',
    totalMeals: 'মোট মিল',
    approvedBazar: 'অনুমোদিত বাজার',
    fixedUtilities: 'নির্দিষ্ট ইউটিলিটি',
    utilityShare: 'ইউটিলিটি / সদস্য',
    dues: 'আদায়যোগ্য মোট বাকি',
    refundable: 'মোট ফেরতযোগ্য',
    duesNote: 'যাদের ব্যালেন্স ঋণাত্মক।',
    refundNote: 'যাদের ব্যালেন্স ধনাত্মক।',
    how: 'হিসাব কীভাবে হয়',
    explanation:
      'মিল রেট = অনুমোদিত বাজার ÷ মোট মিল। প্রদেয় = সদস্যের মিল × মিল রেট + ইউটিলিটি ভাগ। ব্যালেন্স = জমা + অনুমোদিত পরিশোধ + আগের মাসের বহন − প্রদেয়।',
    prepared: 'প্রস্তুতকারী (ম্যানেজার)',
    approved: 'অনুমোদনকারী (অ্যাডমিন)',
    generated: 'মেস মেটস দিয়ে তৈরি',
    page: 'পৃষ্ঠা {n}',
  },
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function fit(ctx: Ctx, value: string, maxWidth: number): string {
  let text = value
  if (ctx.measureText(text).width <= maxWidth) return text
  while (text.length > 2 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1)
  }
  return `${text}…`
}

function wrap(ctx: Ctx, value: string, maxWidth: number): string[] {
  const words = value.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

async function renderSettlementPages(input: SettlementPdfInput): Promise<string[]> {
  const lang = getLang()
  const labels = LABELS[lang]
  const settlement = input.settlement
  const symbol = input.currencySymbol || '৳'
  const amount = (value: number) => money(value, symbol)
  const meals = (value: number) =>
    lang === 'bn' ? String(value).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : String(value)
  const month = monthTitle(input.monthLabel)

  if (document.fonts?.ready) await document.fonts.ready

  const pages: string[] = []
  let canvas = document.createElement('canvas')
  let ctx: Ctx = canvas.getContext('2d') as Ctx
  let pageNo = 1

  const startPage = (withHeader: boolean) => {
    canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    ctx = canvas.getContext('2d') as Ctx
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    if (withHeader) {
      ctx.fillStyle = BRAND_HEX
      ctx.fillRect(0, 0, CANVAS_W, 200)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `700 20px ${FONT_STACK}`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(labels.kicker, MARGIN, 54)
      ctx.fillStyle = '#ffffff'
      ctx.font = `800 44px ${FONT_STACK}`
      ctx.fillText(fit(ctx, input.messName, 780), MARGIN, 118)
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.font = `500 22px ${FONT_STACK}`
      ctx.fillText(`${month} · ${input.status} · ${meals(settlement.memberCount)} ${lang === 'bn' ? 'সদস্য' : 'members'}`, MARGIN, 162)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.font = `700 18px ${FONT_STACK}`
      ctx.fillText(lang === 'bn' ? 'মিল রেট' : 'MEAL RATE', CANVAS_W - MARGIN, 62)
      ctx.fillStyle = '#ffffff'
      ctx.font = `800 38px ${FONT_STACK}`
      ctx.fillText(amount(settlement.mealRate), CANVAS_W - MARGIN, 112)
      ctx.textAlign = 'left'
    }
  }

  const footer = () => {
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MARGIN, CANVAS_H - 92)
    ctx.lineTo(CANVAS_W - MARGIN, CANVAS_H - 92)
    ctx.stroke()
    ctx.fillStyle = MUTED_HEX
    ctx.font = `500 18px ${FONT_STACK}`
    const stamp = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    ctx.fillText(
      fit(ctx, `${input.branded ? `${labels.generated} Pro` : labels.generated} · ${input.generatedBy} · ${stamp}`, 800),
      MARGIN,
      CANVAS_H - 58,
    )
    ctx.textAlign = 'right'
    ctx.fillText(labels.page.replace('{n}', meals(pageNo)), CANVAS_W - MARGIN, CANVAS_H - 58)
    ctx.textAlign = 'left'
  }

  const finishPage = () => {
    footer()
    pages.push(canvas.toDataURL('image/png'))
  }

  startPage(true)

  // Summary strip
  const stats = [
    { label: labels.totalMeals, value: meals(settlement.totalMeals) },
    { label: labels.approvedBazar, value: amount(settlement.totalBazar) },
    { label: labels.fixedUtilities, value: amount(settlement.totalUtilities) },
    { label: labels.deposits, value: amount(settlement.totalDeposits) },
    { label: labels.utilityShare, value: amount(settlement.utilityShare) },
  ]
  const gap = 12
  const boxW = (CANVAS_W - MARGIN * 2 - gap * (stats.length - 1)) / stats.length
  stats.forEach((stat, index) => {
    const x = MARGIN + index * (boxW + gap)
    rounded(ctx, x, 236, boxW, 100, 14, '#f8fafc')
    ctx.fillStyle = MUTED_HEX
    ctx.font = `700 15px ${FONT_STACK}`
    ctx.fillText(fit(ctx, stat.label.toUpperCase(), boxW - 28), x + 18, 266)
    ctx.fillStyle = INK_HEX
    ctx.font = `800 26px ${FONT_STACK}`
    ctx.fillText(fit(ctx, stat.value, boxW - 28), x + 18, 310)
  })

  // Table
  const columns: { label: string; width: number; align: 'left' | 'right' }[] = [
    { label: labels.member, width: 250, align: 'left' },
    { label: labels.meals, width: 70, align: 'right' },
    { label: labels.mealCost, width: 120, align: 'right' },
    { label: labels.utility, width: 100, align: 'right' },
    { label: labels.payable, width: 120, align: 'right' },
    { label: labels.deposits, width: 120, align: 'right' },
    { label: labels.carried, width: 100, align: 'right' },
    { label: labels.balance, width: 200, align: 'right' },
  ]

  const tableHead = (top: number) => {
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(MARGIN, top, CANVAS_W - MARGIN * 2, 54)
    ctx.fillStyle = MUTED_HEX
    ctx.font = `700 15px ${FONT_STACK}`
    let x = MARGIN
    for (const column of columns) {
      if (column.align === 'right') {
        ctx.textAlign = 'right'
        ctx.fillText(fit(ctx, column.label, column.width - 12), x + column.width - 14, top + 34)
      } else {
        ctx.textAlign = 'left'
        ctx.fillText(column.label, x + 14, top + 34)
      }
      x += column.width
    }
    ctx.textAlign = 'left'
    return top + 54
  }

  let y = tableHead(372)
  const bottomLimit = CANVAS_H - 150

  for (const member of settlement.members) {
    if (y + 54 > bottomLimit) {
      finishPage()
      pageNo += 1
      startPage(false)
      y = tableHead(70)
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
    let x = MARGIN
    cells.forEach((cell, index) => {
      const column = columns[index]
      if (index === 0) {
        ctx.fillStyle = INK_HEX
        ctx.font = `700 20px ${FONT_STACK}`
        ctx.textAlign = 'left'
        ctx.fillText(fit(ctx, cell, column.width - 18), x + 14, y + 34)
      } else {
        const negative = index === cells.length - 1 && member.balance < 0
        ctx.fillStyle = negative ? DANGER_HEX : index === cells.length - 1 ? INK_HEX : MUTED_HEX
        ctx.font = `${negative ? 800 : 500} 20px ${FONT_STACK}`
        ctx.textAlign = 'right'
        ctx.fillText(fit(ctx, cell, column.width - 14), x + column.width - 14, y + 34)
      }
      x += column.width
    })
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MARGIN, y + 54)
    ctx.lineTo(CANVAS_W - MARGIN, y + 54)
    ctx.stroke()
    y += 54
  }

  // Totals
  if (y + 70 > bottomLimit) {
    finishPage()
    pageNo += 1
    startPage(false)
    y = 70
  }
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(MARGIN, y + 10)
  ctx.lineTo(CANVAS_W - MARGIN, y + 10)
  ctx.stroke()
  const totals = [
    labels.total,
    meals(settlement.totalMeals),
    amount(settlement.totalPayable - settlement.totalUtilities),
    amount(settlement.totalUtilities),
    amount(settlement.totalPayable),
    amount(settlement.totalDeposits),
    amount(settlement.carriedTotal),
    amount(settlement.refundable - settlement.due),
  ]
  let tx = MARGIN
  totals.forEach((cell, index) => {
    const column = columns[index]
    ctx.fillStyle = INK_HEX
    ctx.font = `800 20px ${FONT_STACK}`
    ctx.textAlign = column.align === 'right' ? 'right' : 'left'
    const px = column.align === 'right' ? tx + column.width - 14 : tx + 14
    ctx.fillText(fit(ctx, cell, column.width - 14), px, y + 48)
    tx += column.width
  })
  ctx.textAlign = 'left'
  y += 86

  // Dues / refundable
  if (y + 150 > bottomLimit) {
    finishPage()
    pageNo += 1
    startPage(false)
    y = 70
  }
  const half = (CANVAS_W - MARGIN * 2 - 18) / 2
  rounded(ctx, MARGIN, y, half, 120, 14, '#fef2f2')
  ctx.fillStyle = DANGER_HEX
  ctx.font = `700 15px ${FONT_STACK}`
  ctx.fillText(labels.dues, MARGIN + 22, y + 34)
  ctx.font = `800 30px ${FONT_STACK}`
  ctx.fillText(fit(ctx, amount(settlement.due), half - 44), MARGIN + 22, y + 76)
  ctx.fillStyle = '#9f1239'
  ctx.font = `500 15px ${FONT_STACK}`
  ctx.fillText(fit(ctx, labels.duesNote, half - 44), MARGIN + 22, y + 104)

  rounded(ctx, MARGIN + half + 18, y, half, 120, 14, '#ecfdf5')
  ctx.fillStyle = EMERALD_HEX
  ctx.font = `700 15px ${FONT_STACK}`
  ctx.fillText(labels.refundable, MARGIN + half + 40, y + 34)
  ctx.font = `800 30px ${FONT_STACK}`
  ctx.fillText(fit(ctx, amount(settlement.refundable), half - 44), MARGIN + half + 40, y + 76)
  ctx.fillStyle = '#065f46'
  ctx.font = `500 15px ${FONT_STACK}`
  ctx.fillText(fit(ctx, labels.refundNote, half - 44), MARGIN + half + 40, y + 104)
  y += 156

  // Explanation
  if (y + 190 > bottomLimit) {
    finishPage()
    pageNo += 1
    startPage(false)
    y = 70
  }
  ctx.fillStyle = MUTED_HEX
  ctx.font = `700 15px ${FONT_STACK}`
  ctx.fillText(labels.how, MARGIN, y)
  ctx.fillStyle = MUTED_HEX
  ctx.font = `500 18px ${FONT_STACK}`
  const lines = wrap(ctx, labels.explanation, CANVAS_W - MARGIN * 2)
  lines.forEach((line, index) => ctx.fillText(line, MARGIN, y + 32 + index * 28))
  y += 32 + lines.length * 28 + 40

  // Signatures
  const lineWidth = 300
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, y + 46)
  ctx.lineTo(MARGIN + lineWidth, y + 46)
  ctx.moveTo(CANVAS_W - MARGIN - lineWidth, y + 46)
  ctx.lineTo(CANVAS_W - MARGIN, y + 46)
  ctx.stroke()
  ctx.fillStyle = MUTED_HEX
  ctx.font = `500 17px ${FONT_STACK}`
  ctx.fillText(labels.prepared, MARGIN, y + 74)
  ctx.fillText(labels.approved, CANVAS_W - MARGIN - lineWidth, y + 74)

  finishPage()
  return pages
}
