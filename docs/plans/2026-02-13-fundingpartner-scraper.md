# FundingPartner Scraper - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-login to FundingPartner.no via Playwright and scrape account data (overview, portfolio, transactions) to keep the Investment record up to date.

**Architecture:** Standalone TypeScript script using Playwright (already installed) that logs in with credentials from `.env`, navigates the three account pages, extracts data, and writes it to `db.json` via the existing lowdb layer.

**Tech Stack:** Playwright (browser automation), dotenv (env loading), existing lowdb/types infrastructure

---

### Task 1: Install dotenv and create scraper entry point

**Files:**
- Create: `src/lib/scraper/fundingpartner.ts`
- Modify: `package.json` (add `dotenv` dep + `scrape` script)

**Step 1: Install dotenv**

```bash
npm install dotenv
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"scrape:fp": "npx tsx src/lib/scraper/fundingpartner.ts"
```

**Step 3: Create the scraper skeleton**

```typescript
// src/lib/scraper/fundingpartner.ts
import 'dotenv/config'
import { chromium } from 'playwright'

const EMAIL = process.env.FUNDINGPARTNER_EMAIL!
const PASSWORD = process.env.FUNDINGPARTNER_PASSWORD!

if (!EMAIL || !PASSWORD) {
  console.error('Missing FUNDINGPARTNER_EMAIL or FUNDINGPARTNER_PASSWORD in .env')
  process.exit(1)
}

async function main() {
  const browser = await chromium.launch({ headless: false }) // headless: false for debugging, switch to true later
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Step 1: Login
    await login(page)

    // Step 2: Scrape overview
    const overview = await scrapeOverview(page)
    console.log('Overview:', overview)

    // Step 3: Scrape portfolio
    const portfolio = await scrapePortfolio(page)
    console.log('Portfolio:', portfolio)

    // Step 4: Scrape transactions
    const transactions = await scrapeTransactions(page)
    console.log('Transactions:', transactions)

    // Step 5: Update db.json
    await updateDatabase(overview, portfolio, transactions)

    console.log('Scraping complete!')
  } catch (error) {
    console.error('Scraping failed:', error)
    // Take screenshot on failure for debugging
    await page.screenshot({ path: 'scraper-error.png' })
  } finally {
    await browser.close()
  }
}

main()
```

**Step 4: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts package.json package-lock.json
git commit -m "feat: add FundingPartner scraper skeleton with dotenv"
```

---

### Task 2: Implement login flow

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`

**Context:** FundingPartner.no likely has a login page at the root or `/logg-inn`. The scraper needs to:
1. Navigate to the login page
2. Find email and password input fields
3. Fill credentials
4. Click the login button
5. Wait for navigation to the dashboard

**Step 1: Implement the login function**

```typescript
import type { Page } from 'playwright'

async function login(page: Page) {
  // Navigate to FundingPartner - will likely redirect to login
  await page.goto('https://fundingpartner.no/min-oversikt/oversikt')

  // Wait for the login form to appear
  // IMPORTANT: Selectors below are best-guesses - run with headless:false first
  // to inspect the actual page structure, then update selectors accordingly
  await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 15000 })

  // Fill credentials - try common selectors, adjust after first run
  const emailInput = page.locator('input[type="email"], input[name="email"], #email').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first()

  await emailInput.fill(EMAIL)
  await passwordInput.fill(PASSWORD)

  // Click login button - try common patterns
  const loginButton = page.locator('button[type="submit"], input[type="submit"]').first()
  await loginButton.click()

  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('**/min-oversikt/**', { timeout: 30000 })
  console.log('Login successful!')
}
```

**Step 2: Run with headless:false to verify login works**

```bash
npm run scrape:fp
```

Watch the browser open, login, and verify it reaches the dashboard. Note the actual selectors from DevTools and update if needed.

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts
git commit -m "feat: implement FundingPartner login flow"
```

---

### Task 3: Scrape overview page (`/min-oversikt/oversikt`)

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`

**Context:** The overview page shows key account stats. Based on what the user shared, we expect:
- Totale eiendeler (total assets): 214,404 NOK
- Gjennomsnittlig nettorente (average net return): 14.60%
- Possibly: available balance, active loans count, pending investments

**Step 1: Implement the overview scraper**

```typescript
interface FPOverview {
  totalAssets: number      // Totale eiendeler
  averageNetReturn: number // Gjennomsnittlig nettorente (%)
  availableBalance: number // Tilgjengelig saldo
  activeLoans: number      // Aktive lån
  // Add more fields as discovered on the actual page
}

async function scrapeOverview(page: Page): Promise<FPOverview> {
  await page.goto('https://fundingpartner.no/min-oversikt/oversikt')
  await page.waitForLoadState('networkidle')

  // IMPORTANT: These selectors are placeholders.
  // Run with headless:false, inspect the page with DevTools,
  // and replace with actual selectors/text content patterns.

  // Strategy: Use page.evaluate() to extract text from the page,
  // or use locators targeting specific elements.

  const content = await page.evaluate(() => {
    // Get all text content and parse key values
    const body = document.body.innerText
    return body
  })

  // Parse Norwegian number format: "214 404" or "214.404" -> 214404
  function parseNOK(text: string): number {
    return Number(text.replace(/[^0-9,-]/g, '').replace(',', '.'))
  }

  function parsePercent(text: string): number {
    return Number(text.replace(/[^0-9,-]/g, '').replace(',', '.'))
  }

  // Extract values using regex patterns on the page text
  // These patterns match Norwegian formatting like "214 404 NOK" or "14,60 %"
  const totalAssetsMatch = content.match(/Totale eiendeler\s*[\n\r]*\s*([\d\s.,]+)\s*(?:NOK|kr)?/i)
  const netReturnMatch = content.match(/[Gg]jennomsnittlig nettorente\s*[\n\r]*\s*([\d,]+)\s*%/i)

  return {
    totalAssets: totalAssetsMatch ? parseNOK(totalAssetsMatch[1]) : 0,
    averageNetReturn: netReturnMatch ? parsePercent(netReturnMatch[1]) : 0,
    availableBalance: 0, // Fill after inspecting page
    activeLoans: 0,       // Fill after inspecting page
  }
}
```

**Step 2: Run and verify extracted data matches what's shown on the page**

```bash
npm run scrape:fp
```

Check console output matches your actual FundingPartner values.

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts
git commit -m "feat: scrape FundingPartner overview page"
```

---

### Task 4: Scrape portfolio page (`/min-oversikt/portefolje`)

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`

**Context:** The portfolio page likely shows individual loan investments with details like borrower, amount, interest rate, status, maturity date.

**Step 1: Implement the portfolio scraper**

```typescript
interface FPLoan {
  borrower: string
  amount: number
  interestRate: number
  status: string         // e.g. "Aktiv", "Forsinket", "Misligholdt"
  maturityDate: string
  remainingAmount: number
}

interface FPPortfolio {
  loans: FPLoan[]
  totalInvested: number
  totalActive: number
}

async function scrapePortfolio(page: Page): Promise<FPPortfolio> {
  await page.goto('https://fundingpartner.no/min-oversikt/portefolje')
  await page.waitForLoadState('networkidle')

  // Wait for portfolio table/list to load
  // Adjust selector after inspecting actual page
  await page.waitForSelector('table, .portfolio-list, [class*="portfolio"]', { timeout: 15000 })

  // Strategy: Find the table rows and extract data from each
  const loans = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr, .loan-row, [class*="loan-item"]')
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td, .cell, span')
      const texts = Array.from(cells).map(c => c.textContent?.trim() || '')
      // Map cells to fields - adjust indices after inspecting
      return { texts }
    })
  })

  console.log('Portfolio raw data:', JSON.stringify(loans, null, 2))

  // Parse into structured data - adjust after seeing actual structure
  return {
    loans: [],         // Fill after inspecting actual table structure
    totalInvested: 0,  // Sum from parsed loans
    totalActive: 0,    // Count of active loans
  }
}
```

**Step 2: Run, inspect raw output, then update the parsing logic**

```bash
npm run scrape:fp
```

The first run intentionally logs raw data so you can see the actual table structure and adjust parsing.

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts
git commit -m "feat: scrape FundingPartner portfolio page"
```

---

### Task 5: Scrape transactions page (`/min-oversikt/transaksjoner`)

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`

**Context:** The transactions page shows payment history - deposits, withdrawals, interest received, etc.

**Step 1: Implement the transactions scraper**

```typescript
interface FPTransaction {
  date: string
  type: string       // e.g. "Rentebetaling", "Investering", "Utbetaling"
  amount: number
  description: string
}

async function scrapeTransactions(page: Page): Promise<FPTransaction[]> {
  await page.goto('https://fundingpartner.no/min-oversikt/transaksjoner')
  await page.waitForLoadState('networkidle')

  // Wait for transactions table to load
  await page.waitForSelector('table, .transaction-list', { timeout: 15000 })

  // Check if there's pagination or "load more" button
  // Some platforms load all, some paginate
  // If paginated, may need to click through pages

  const rawData = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr, .transaction-row')
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td, .cell')
      return Array.from(cells).map(c => c.textContent?.trim() || '')
    })
  })

  console.log('Transactions raw data:', JSON.stringify(rawData, null, 2))

  // Parse into structured data - adjust after seeing actual structure
  return []
}
```

**Step 2: Run and verify**

```bash
npm run scrape:fp
```

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts
git commit -m "feat: scrape FundingPartner transactions page"
```

---

### Task 6: Update database with scraped data

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`

**Context:** After scraping, update the existing FundingPartner investment record in `db.json` (or create one if it doesn't exist).

**Step 1: Implement the database update function**

```typescript
import { getDb, getInvestments, createInvestment, updateInvestment } from '../db'

async function updateDatabase(
  overview: FPOverview,
  portfolio: FPPortfolio,
  transactions: FPTransaction[]
) {
  const investments = await getInvestments()

  // Find existing FundingPartner investment
  const existing = investments.find(
    i => i.platform.toLowerCase().includes('fundingpartner')
  )

  const investmentData = {
    name: 'FundingPartner P2P Lending',
    platform: 'FundingPartner',
    totalInvested: portfolio.totalInvested || overview.totalAssets,
    currentValue: overview.totalAssets,
    averageNetReturn: overview.averageNetReturn,
    activeLoansCount: portfolio.totalActive || overview.activeLoans,
    notes: `Sist oppdatert: ${new Date().toLocaleString('nb-NO')}. ${portfolio.loans.length} lån i porteføljen.`,
  }

  if (existing) {
    await updateInvestment(existing.id, investmentData)
    console.log(`Updated existing investment: ${existing.id}`)
  } else {
    const created = await createInvestment(investmentData)
    console.log(`Created new investment: ${created.id}`)
  }
}
```

**Step 2: Run full scraper end-to-end**

```bash
npm run scrape:fp
```

Verify `db.json` is updated with FundingPartner data.

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts
git commit -m "feat: update db.json from scraped FundingPartner data"
```

---

### Task 7: Add saved browser state for faster re-runs

**Files:**
- Modify: `src/lib/scraper/fundingpartner.ts`
- Modify: `.gitignore`

**Context:** Save browser cookies/session after first login so subsequent runs skip login if session is still valid.

**Step 1: Add storage state support**

```typescript
import { existsSync } from 'fs'
import { join } from 'path'

const STORAGE_STATE_PATH = join(process.cwd(), '.playwright-state.json')

async function main() {
  const browser = await chromium.launch({ headless: false })

  // Reuse saved session if available
  const context = existsSync(STORAGE_STATE_PATH)
    ? await browser.newContext({ storageState: STORAGE_STATE_PATH })
    : await browser.newContext()

  const page = await context.newPage()

  try {
    // Check if already logged in by navigating to dashboard
    await page.goto('https://fundingpartner.no/min-oversikt/oversikt')

    // If redirected to login, we need to authenticate
    if (page.url().includes('logg-inn') || page.url().includes('login')) {
      await login(page)
    }

    // Save session state for next run
    await context.storageState({ path: STORAGE_STATE_PATH })

    // ... rest of scraping
  } finally {
    await browser.close()
  }
}
```

**Step 2: Add to .gitignore**

```
# Playwright browser state
.playwright-state.json
scraper-error.png
```

**Step 3: Commit**

```bash
git add src/lib/scraper/fundingpartner.ts .gitignore
git commit -m "feat: save browser session for faster FundingPartner re-runs"
```

---

## Notes

- **Selectors are best-guesses.** The first run should be with `headless: false` to visually inspect the actual page structure. Every selector will likely need adjustment.
- **Run `npm run scrape:fp` after each task** to iteratively refine selectors.
- **Cookie consent:** FundingPartner may show a cookie banner. If so, add a dismiss step before login.
- **2FA/BankID:** If FundingPartner requires BankID or 2FA, the scraper will need manual intervention for the first login. Saved session state (Task 7) handles subsequent runs.
- **Rate limiting:** Don't run the scraper too frequently. Once per day or on-demand is sufficient.
- **Error screenshots:** On failure, a screenshot is saved to `scraper-error.png` for debugging.
