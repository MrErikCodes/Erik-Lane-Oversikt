import 'dotenv/config'
import { chromium, type Page } from 'playwright'
import { existsSync } from 'fs'
import { join } from 'path'
import { getInvestments, createInvestment, updateInvestment } from '../db'

// ── Config ──────────────────────────────────────────────

const EMAIL = process.env.FUNDINGPARTNER_EMAIL!
const PASSWORD = process.env.FUNDINGPARTNER_PASSWORD!
const STORAGE_STATE_PATH = join(process.cwd(), '.playwright-state.json')

if (!EMAIL || !PASSWORD) {
  console.error('Missing FUNDINGPARTNER_EMAIL or FUNDINGPARTNER_PASSWORD in .env')
  process.exit(1)
}

// ── Types ───────────────────────────────────────────────

interface FPOverview {
  totalAssets: number
  averageNetReturn: number
  totalInvested: number
  outstandingLoans: number
  interestReceived: number
  principalRepaid: number
  activeLoansCount: number
  irr: number
  freeFunds: number
}

interface FPLoan {
  loanNumber: string
  borrower: string
  description: string
  invested: number
  remaining: number
  netRate: number
  paidInterest: number
  status: string
  terms: string
}

interface FPPortfolio {
  loans: FPLoan[]
  totalInvested: number
  totalActive: number
}

interface FPTransaction {
  date: string
  loanNumber: string
  borrower: string
  type: string
  debit: number
  credit: number
  currency: string
}

// ── Helpers ─────────────────────────────────────────────

/** Parse Norwegian number: "214 204 NOK" or "20 000,50" -> 214204 or 20000.50 */
function parseNOK(text: string): number {
  const cleaned = text.replace(/NOK|kr/gi, '').replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.')
  return Number(cleaned) || 0
}

/** Parse percent: "14,60 %" -> 14.60 */
function parsePercent(text: string): number {
  const cleaned = text.replace(/%/g, '').replace(/\s/g, '').replace(',', '.')
  return Number(cleaned) || 0
}

// ── Cookie Consent ──────────────────────────────────────

async function dismissCookieBanner(page: Page) {
  try {
    const allowAll = page.locator('text=Tillat alle').first()
    if (await allowAll.isVisible({ timeout: 3000 })) {
      console.log('Dismissing cookie banner...')
      await allowAll.click()
      await page.waitForTimeout(1000)
    }
  } catch {
    // No cookie banner
  }
}

// ── Login ───────────────────────────────────────────────

async function login(page: Page) {
  console.log('Logging in to FundingPartner...')
  await dismissCookieBanner(page)

  await page.waitForSelector('input[type="password"]', { timeout: 15000 })

  const usernameInput = page.locator('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await usernameInput.fill(EMAIL)
  await passwordInput.fill(PASSWORD)

  const loginButton = page.locator('button:has-text("Logg inn"), button[type="submit"]').first()
  await loginButton.click()

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  console.log(`Login successful! Now at: ${page.url()}`)
}

// ── Scrape Overview ─────────────────────────────────────

async function scrapeOverview(page: Page): Promise<FPOverview> {
  console.log('Scraping overview...')
  await page.goto('https://fundingpartner.no/min-oversikt/oversikt', { waitUntil: 'networkidle' })
  await dismissCookieBanner(page)
  await page.waitForTimeout(3000)

  const content = await page.evaluate(() => document.body.innerText)

  const lines = content.split(/\r?\n/)

  // Use line-based parsing for reliability
  function findValueBeforeLabel(label: RegExp): string {
    for (let i = 1; i < lines.length; i++) {
      if (label.test(lines[i])) {
        // Value is on the previous non-empty line
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim()) return lines[j].trim()
        }
      }
    }
    return ''
  }

  function findValueAfterLabel(label: RegExp): string {
    for (let i = 0; i < lines.length - 1; i++) {
      if (label.test(lines[i])) {
        // Value is on the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) return lines[j].trim()
        }
      }
    }
    return ''
  }

  // "Totale eiendeler" appears as a heading, then the value "214 204 NOK", then "Gjennomsnittlig nettorente"
  // The value "214 204 NOK" is between the two labels
  const totalAssetsRaw = findValueBeforeLabel(/Gjennomsnittlig nettorente/)
  const netReturnRaw = findValueAfterLabel(/Gjennomsnittlig nettorente/)
  const freeFundsRaw = findValueAfterLabel(/Frie midler/)
  const totalInvestedRaw = findValueBeforeLabel(/Totalt investert bel/)
  const countRaw = findValueBeforeLabel(/Totalt antall investeringer/)
  const principalRaw = findValueBeforeLabel(/Hovedstol tilbakebetalt/)
  const interestRaw = findValueBeforeLabel(/Netto rente mottatt/)
  const irrRaw = findValueBeforeLabel(/IRR \(avsluttede/)
  // Outstanding from summary table: "Sum utestående lån\t204 863"
  const outstandingLine = lines.find(l => l.match(/Sum utest.ende l.n/i)) || ''
  const outstandingTabParts = outstandingLine.split('\t')
  const outstandingRaw = outstandingTabParts[1] || '0'

  const result: FPOverview = {
    totalAssets: parseNOK(totalAssetsRaw),
    averageNetReturn: parsePercent(netReturnRaw),
    totalInvested: parseNOK(totalInvestedRaw),
    outstandingLoans: parseNOK(outstandingRaw),
    interestReceived: parseNOK(interestRaw),
    principalRepaid: parseNOK(principalRaw),
    activeLoansCount: parseInt(countRaw) || 0,
    irr: parsePercent(irrRaw),
    freeFunds: parseNOK(freeFundsRaw),
  }

  console.log('Overview:', result)
  return result
}

// ── Scrape Portfolio ────────────────────────────────────

async function scrapePortfolio(page: Page): Promise<FPPortfolio> {
  console.log('Scraping portfolio...')
  await page.goto('https://fundingpartner.no/min-oversikt/portefolje', { waitUntil: 'networkidle' })
  await dismissCookieBanner(page)
  await page.waitForTimeout(3000)

  const rawLoans = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td')
      return Array.from(cells).map(c => c.textContent?.trim() || '')
    })
  })

  console.log(`Found ${rawLoans.length} portfolio rows`)

  // Table structure from actual page:
  // [0]=checkbox, [1]=loanNum+borrower+desc, [2]=invested, [3]=remaining,
  // [4]=netRate, [5]=paidInterest, [6]=status, [7]=terms, [8]=settings
  const loans: FPLoan[] = rawLoans.map(cells => {
    const info = cells[1] || ''
    // Extract loan number (LAI-XXXX) and borrower from combined cell
    const loanNumMatch = info.match(/(LAI-\d+)/)
    // Borrower name is between loan number and the description
    const borrowerMatch = info.match(/LAI-\d+\s*\n?\s*([^\n]+?)(?:\n|$)/)

    return {
      loanNumber: loanNumMatch ? loanNumMatch[1] : '',
      borrower: borrowerMatch ? borrowerMatch[1].trim() : info.substring(0, 50),
      description: info,
      invested: parseNOK(cells[2] || ''),
      remaining: parseNOK(cells[3] || ''),
      netRate: parsePercent(cells[4] || ''),
      paidInterest: parseNOK(cells[5] || ''),
      status: cells[6] || 'Ukjent',
      terms: cells[7] || '',
    }
  })

  const totalInvested = loans.reduce((sum, l) => sum + l.invested, 0)
  const totalActive = loans.filter(l =>
    l.status.toLowerCase().includes('rute') || l.status.toLowerCase().includes('aktiv')
  ).length

  console.log(`  Total invested: ${totalInvested} NOK`)
  console.log(`  Active loans: ${totalActive}`)
  loans.forEach(l => console.log(`  ${l.loanNumber} | ${l.borrower.substring(0, 30)} | ${l.invested} NOK | ${l.netRate}% | ${l.status}`))

  return { loans, totalInvested, totalActive: totalActive || loans.length }
}

// ── Scrape Transactions ─────────────────────────────────

async function scrapeTransactions(page: Page): Promise<FPTransaction[]> {
  console.log('Scraping transactions...')
  await page.goto('https://fundingpartner.no/min-oversikt/transaksjoner', { waitUntil: 'networkidle' })
  await dismissCookieBanner(page)
  await page.waitForTimeout(3000)

  const rawData = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td')
      return Array.from(cells).map(c => c.textContent?.trim() || '')
    })
  })

  console.log(`Found ${rawData.length} transactions`)

  // Table structure from actual page:
  // [0]=date, [1]=loanNumber, [2]=borrower, [3]=type, [4]=debit, [5]=credit, [6]=currency, [7]=?
  const transactions = rawData.map(cells => ({
    date: cells[0] || '',
    loanNumber: cells[1] || '',
    borrower: cells[2] || '',
    type: cells[3] || '',
    debit: parseNOK(cells[4] || ''),
    credit: parseNOK(cells[5] || ''),
    currency: cells[6] || '',
  }))

  // Show recent transactions
  transactions.slice(0, 5).forEach(t =>
    console.log(`  ${t.date} | ${t.type} | ${t.debit ? `-${t.debit}` : `+${t.credit}`} | ${t.borrower}`)
  )

  return transactions
}

// ── Update Database ─────────────────────────────────────

async function updateDatabase(
  overview: FPOverview,
  portfolio: FPPortfolio,
  transactions: FPTransaction[]
) {
  console.log('\nUpdating database...')
  const investments = await getInvestments()

  const existing = investments.find(
    i => i.platform.toLowerCase().includes('fundingpartner')
  )

  const recentInterest = transactions
    .filter(t => t.type.toLowerCase().includes('innbetaling') && t.credit > 0)
    .slice(0, 5)
    .map(t => `${t.date}: +${t.credit} NOK (${t.borrower})`)
    .join('; ')

  const investmentData = {
    name: 'FundingPartner P2P Lending',
    platform: 'FundingPartner',
    totalInvested: overview.totalInvested || portfolio.totalInvested,
    currentValue: overview.totalAssets,
    averageNetReturn: overview.averageNetReturn,
    activeLoansCount: overview.activeLoansCount || portfolio.totalActive,
    notes: [
      `Sist oppdatert: ${new Date().toLocaleString('nb-NO')}`,
      `${portfolio.loans.length} lån i porteføljen`,
      `IRR: ${overview.irr}%`,
      `Renter mottatt: ${overview.interestReceived} NOK`,
      `Hovedstol tilbakebetalt: ${overview.principalRepaid} NOK`,
      recentInterest ? `Siste innbetalinger: ${recentInterest}` : '',
    ].filter(Boolean).join('. '),
  }

  if (existing) {
    await updateInvestment(existing.id, investmentData)
    console.log(`Updated investment: ${existing.id}`)
  } else {
    const created = await createInvestment(investmentData)
    console.log(`Created investment: ${created.id}`)
  }
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log('Starting FundingPartner scraper...\n')

  const browser = await chromium.launch({ headless: false })

  const context = existsSync(STORAGE_STATE_PATH)
    ? await browser.newContext({ storageState: STORAGE_STATE_PATH })
    : await browser.newContext()

  const page = await context.newPage()

  try {
    await page.goto('https://fundingpartner.no/min-oversikt/oversikt', { waitUntil: 'networkidle' })

    const url = page.url()
    const hasLoginForm = await page.locator('input[type="password"]').count() > 0

    if (hasLoginForm || !url.includes('/min-oversikt/')) {
      await login(page)
    } else {
      console.log('Session still valid, skipping login')
    }

    await context.storageState({ path: STORAGE_STATE_PATH })

    const overview = await scrapeOverview(page)
    const portfolio = await scrapePortfolio(page)
    const transactions = await scrapeTransactions(page)

    await updateDatabase(overview, portfolio, transactions)

    console.log('\n=== Scraping complete! ===')
    console.log(`  Total assets:    ${overview.totalAssets.toLocaleString('nb-NO')} NOK`)
    console.log(`  Net return:      ${overview.averageNetReturn}%`)
    console.log(`  IRR:             ${overview.irr}%`)
    console.log(`  Total invested:  ${overview.totalInvested.toLocaleString('nb-NO')} NOK`)
    console.log(`  Outstanding:     ${overview.outstandingLoans.toLocaleString('nb-NO')} NOK`)
    console.log(`  Interest earned: ${overview.interestReceived.toLocaleString('nb-NO')} NOK`)
    console.log(`  Portfolio loans: ${portfolio.loans.length}`)
    console.log(`  Transactions:    ${transactions.length}`)
  } catch (error) {
    console.error('Scraping failed:', error)
    await page.screenshot({ path: 'scraper-error.png' })
    console.error('Screenshot saved to scraper-error.png')
  } finally {
    await browser.close()
  }
}

main()
