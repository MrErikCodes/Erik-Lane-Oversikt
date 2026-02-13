# Låneoversikt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal loan management dashboard with snowball/avalanche payoff calculators for Norwegian loans.

**Architecture:** Next.js 14+ App Router with Server Actions for data mutations, lowdb for JSON file persistence, and shadcn/ui for the interface. All calculation logic in pure TypeScript utility functions with full test coverage.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, lowdb, Recharts, Zod, Vitest

**Design doc:** `docs/plans/2026-02-13-loan-manager-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, etc. (via create-next-app)
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (via create-next-app)

**Step 1: Initialize Next.js project**

Run from the repo root (`C:\Users\nileri\Koding\Erik-Lane-Oversikt`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Answer prompts: Yes to Turbopack if asked. This scaffolds into the current directory.

Expected: `package.json`, `src/app/`, `tailwind.config.ts`, etc. created.

**Step 2: Install dependencies**

```bash
npm install lowdb uuid zod recharts date-fns
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/uuid
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: New York style, Zinc color, CSS variables: yes.

Then add components we need:

```bash
npx shadcn@latest add button card input label select table dialog sheet tabs badge separator form toast navigation-menu
```

**Step 4: Configure Vitest**

Create `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:

```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Configure dark mode**

In `src/app/layout.tsx`, add `className="dark"` to the `<html>` tag so dark mode is default.

**Step 6: Verify setup**

```bash
npm run dev
```

Expected: App loads at http://localhost:3000 with dark mode.

```bash
npm run test:run
```

Expected: Vitest runs (0 tests initially).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with shadcn/ui, lowdb, vitest"
```

---

## Task 2: Database Layer (lowdb + Zod Schemas)

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/schemas.ts`
- Create: `src/lib/types.ts`
- Test: `src/lib/__tests__/db.test.ts`

**Step 1: Write Zod schemas and types**

Create `src/lib/types.ts`:

```typescript
export type LoanType = 'housing' | 'car' | 'consumer' | 'student'

export type StrategyType = 'snowball' | 'avalanche' | 'custom'

export interface Loan {
  id: string
  name: string
  type: LoanType
  lender: string
  loanNumber: string
  originalAmount: number
  currentBalance: number
  nominalInterestRate: number
  effectiveInterestRate: number
  monthlyFees: number
  monthlyPayment: number
  remainingTermMonths: number
  originationDate: string
  paymentDueDay: number
  fixedRateTermsRemaining: number
  rateAfterFixedPeriod: number | null
  priority: number
  createdAt: string
  updatedAt: string
}

export interface RateChange {
  id: string
  loanId: string
  date: string
  oldNominalRate: number
  newNominalRate: number
  oldEffectiveRate: number
  newEffectiveRate: number
  reason: string
}

export interface Payment {
  id: string
  loanId: string
  date: string
  amount: number
  principal: number
  interest: number
  fees: number
  isExtraPayment: boolean
}

export interface Scenario {
  id: string
  name: string
  strategy: StrategyType
  extraMonthlyPayment: number
  customOrder: string[]
  createdAt: string
}

export interface Database {
  loans: Loan[]
  payments: Payment[]
  scenarios: Scenario[]
  rateChanges: RateChange[]
}
```

Create `src/lib/schemas.ts`:

```typescript
import { z } from 'zod'

export const loanTypeSchema = z.enum(['housing', 'car', 'consumer', 'student'])

export const loanSchema = z.object({
  name: z.string().min(1, 'Navn er påkrevd'),
  type: loanTypeSchema,
  lender: z.string().min(1, 'Långiver er påkrevd'),
  loanNumber: z.string().default(''),
  originalAmount: z.number().positive('Må være positivt'),
  currentBalance: z.number().min(0, 'Kan ikke være negativt'),
  nominalInterestRate: z.number().min(0).max(100),
  effectiveInterestRate: z.number().min(0).max(100),
  monthlyFees: z.number().min(0),
  monthlyPayment: z.number().positive('Må være positivt'),
  remainingTermMonths: z.number().int().positive('Må være positivt'),
  originationDate: z.string(),
  paymentDueDay: z.number().int().min(1).max(31),
  fixedRateTermsRemaining: z.number().int().min(0).default(0),
  rateAfterFixedPeriod: z.number().min(0).max(100).nullable().default(null),
  priority: z.number().int().min(1),
})

export const rateChangeSchema = z.object({
  loanId: z.string().uuid(),
  date: z.string(),
  oldNominalRate: z.number().min(0).max(100),
  newNominalRate: z.number().min(0).max(100),
  oldEffectiveRate: z.number().min(0).max(100),
  newEffectiveRate: z.number().min(0).max(100),
  reason: z.string().default(''),
})

export const paymentSchema = z.object({
  loanId: z.string().uuid(),
  date: z.string(),
  amount: z.number().positive(),
  principal: z.number().min(0),
  interest: z.number().min(0),
  fees: z.number().min(0),
  isExtraPayment: z.boolean(),
})

export const scenarioSchema = z.object({
  name: z.string().min(1),
  strategy: z.enum(['snowball', 'avalanche', 'custom']),
  extraMonthlyPayment: z.number().min(0),
  customOrder: z.array(z.string()),
})

export type LoanInput = z.infer<typeof loanSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type ScenarioInput = z.infer<typeof scenarioSchema>
export type RateChangeInput = z.infer<typeof rateChangeSchema>
```

**Step 2: Write the database module**

Create `src/lib/db.ts`:

```typescript
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import type { Database, Loan, Payment, Scenario, RateChange } from './types'
import type { LoanInput, PaymentInput, ScenarioInput, RateChangeInput } from './schemas'

const defaultData: Database = {
  loans: [],
  payments: [],
  scenarios: [],
  rateChanges: [],
}

let dbInstance: Low<Database> | null = null

export async function getDb(): Promise<Low<Database>> {
  if (dbInstance) return dbInstance

  const file = join(process.cwd(), 'db.json')
  const adapter = new JSONFile<Database>(file)
  const db = new Low(adapter, defaultData)
  await db.read()
  dbInstance = db
  return db
}

// Loan CRUD
export async function getLoans(): Promise<Loan[]> {
  const db = await getDb()
  return db.data.loans
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  const db = await getDb()
  return db.data.loans.find((l) => l.id === id)
}

export async function createLoan(input: LoanInput): Promise<Loan> {
  const db = await getDb()
  const now = new Date().toISOString().split('T')[0]
  const loan: Loan = {
    ...input,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }
  db.data.loans.push(loan)
  await db.write()
  return loan
}

export async function updateLoan(id: string, input: Partial<LoanInput>): Promise<Loan | null> {
  const db = await getDb()
  const index = db.data.loans.findIndex((l) => l.id === id)
  if (index === -1) return null
  const now = new Date().toISOString().split('T')[0]
  db.data.loans[index] = { ...db.data.loans[index], ...input, updatedAt: now }
  await db.write()
  return db.data.loans[index]
}

export async function deleteLoan(id: string): Promise<boolean> {
  const db = await getDb()
  const before = db.data.loans.length
  db.data.loans = db.data.loans.filter((l) => l.id !== id)
  db.data.payments = db.data.payments.filter((p) => p.loanId !== id)
  await db.write()
  return db.data.loans.length < before
}

// Payment CRUD
export async function getPayments(loanId?: string): Promise<Payment[]> {
  const db = await getDb()
  if (loanId) return db.data.payments.filter((p) => p.loanId === loanId)
  return db.data.payments
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  const db = await getDb()
  const payment: Payment = {
    ...input,
    id: uuidv4(),
  }
  db.data.payments.push(payment)

  // Update loan balance
  const loan = db.data.loans.find((l) => l.id === input.loanId)
  if (loan) {
    loan.currentBalance = Math.max(0, loan.currentBalance - input.principal)
    loan.updatedAt = new Date().toISOString().split('T')[0]
  }

  await db.write()
  return payment
}

// Scenario CRUD
export async function getScenarios(): Promise<Scenario[]> {
  const db = await getDb()
  return db.data.scenarios
}

export async function createScenario(input: ScenarioInput): Promise<Scenario> {
  const db = await getDb()
  const scenario: Scenario = {
    ...input,
    id: uuidv4(),
    createdAt: new Date().toISOString().split('T')[0],
  }
  db.data.scenarios.push(scenario)
  await db.write()
  return scenario
}

export async function deleteScenario(id: string): Promise<boolean> {
  const db = await getDb()
  const before = db.data.scenarios.length
  db.data.scenarios = db.data.scenarios.filter((s) => s.id !== id)
  await db.write()
  return db.data.scenarios.length < before
}

// Rate Change CRUD
export async function getRateChanges(loanId?: string): Promise<RateChange[]> {
  const db = await getDb()
  if (loanId) return db.data.rateChanges.filter((r) => r.loanId === loanId)
  return db.data.rateChanges
}

export async function createRateChange(input: RateChangeInput): Promise<RateChange> {
  const db = await getDb()
  const rateChange: RateChange = {
    ...input,
    id: uuidv4(),
  }
  db.data.rateChanges.push(rateChange)

  // Update the loan's current rates
  const loan = db.data.loans.find((l) => l.id === input.loanId)
  if (loan) {
    loan.nominalInterestRate = input.newNominalRate
    loan.effectiveInterestRate = input.newEffectiveRate
    loan.updatedAt = new Date().toISOString().split('T')[0]
  }

  await db.write()
  return rateChange
}
```

**Step 3: Write tests for the database layer**

Create `src/lib/__tests__/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { loanSchema, paymentSchema, scenarioSchema } from '../schemas'

describe('Loan schema validation', () => {
  const validLoan = {
    name: 'Huslån',
    type: 'housing' as const,
    lender: 'DNB',
    loanNumber: '12345678',
    originalAmount: 3000000,
    currentBalance: 2750000,
    nominalInterestRate: 4.5,
    effectiveInterestRate: 4.65,
    monthlyFees: 50,
    monthlyPayment: 15000,
    remainingTermMonths: 240,
    originationDate: '2022-01-15',
    paymentDueDay: 15,
    priority: 1,
  }

  it('accepts valid loan data', () => {
    const result = loanSchema.safeParse(validLoan)
    expect(result.success).toBe(true)
  })

  it('rejects negative balance', () => {
    const result = loanSchema.safeParse({ ...validLoan, currentBalance: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = loanSchema.safeParse({ ...validLoan, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects interest rate over 100', () => {
    const result = loanSchema.safeParse({ ...validLoan, nominalInterestRate: 150 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid loan type', () => {
    const result = loanSchema.safeParse({ ...validLoan, type: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('Payment schema validation', () => {
  it('accepts valid payment', () => {
    const result = paymentSchema.safeParse({
      loanId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-02-15',
      amount: 15000,
      principal: 4700,
      interest: 10250,
      fees: 50,
      isExtraPayment: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero amount', () => {
    const result = paymentSchema.safeParse({
      loanId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-02-15',
      amount: 0,
      principal: 0,
      interest: 0,
      fees: 0,
      isExtraPayment: false,
    })
    expect(result.success).toBe(false)
  })
})

describe('Scenario schema validation', () => {
  it('accepts valid scenario', () => {
    const result = scenarioSchema.safeParse({
      name: 'Ekstra 2000kr',
      strategy: 'snowball',
      extraMonthlyPayment: 2000,
      customOrder: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid strategy', () => {
    const result = scenarioSchema.safeParse({
      name: 'Test',
      strategy: 'invalid',
      extraMonthlyPayment: 0,
      customOrder: [],
    })
    expect(result.success).toBe(false)
  })
})
```

**Step 4: Run tests**

```bash
npm run test:run
```

Expected: All schema tests pass.

**Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/schemas.ts src/lib/types.ts src/lib/__tests__/db.test.ts
git commit -m "feat: add database layer with lowdb, Zod schemas, and types"
```

---

## Task 3: Calculation Engine

**Files:**
- Create: `src/lib/calculations.ts`
- Test: `src/lib/__tests__/calculations.test.ts`

**Step 1: Write failing tests for interest and amortization calculations**

Create `src/lib/__tests__/calculations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyInterest,
  generateAmortizationSchedule,
  calculateSnowball,
  calculateAvalanche,
  calculateCustomStrategy,
  calculatePayoffComparison,
} from '../calculations'
import type { Loan } from '../types'

const makeLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: '1',
  name: 'Test Loan',
  type: 'consumer',
  lender: 'Test Bank',
  loanNumber: '123',
  originalAmount: 100000,
  currentBalance: 100000,
  nominalInterestRate: 5.0,
  effectiveInterestRate: 5.2,
  monthlyFees: 50,
  monthlyPayment: 2000,
  remainingTermMonths: 60,
  originationDate: '2026-01-01',
  paymentDueDay: 15,
  priority: 1,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('calculateMonthlyInterest', () => {
  it('calculates monthly interest correctly', () => {
    const result = calculateMonthlyInterest(100000, 6.0)
    expect(result).toBeCloseTo(500, 2) // 100000 * 6/100 / 12 = 500
  })

  it('returns 0 for 0% rate', () => {
    expect(calculateMonthlyInterest(100000, 0)).toBe(0)
  })

  it('returns 0 for 0 balance', () => {
    expect(calculateMonthlyInterest(0, 5.0)).toBe(0)
  })
})

describe('generateAmortizationSchedule', () => {
  it('generates correct number of months', () => {
    const loan = makeLoan({ currentBalance: 10000, monthlyPayment: 2000, nominalInterestRate: 0, monthlyFees: 0 })
    const schedule = generateAmortizationSchedule(loan)
    expect(schedule.length).toBe(5) // 10000 / 2000 = 5
  })

  it('ends with zero balance', () => {
    const loan = makeLoan({ currentBalance: 10000, monthlyPayment: 5000, nominalInterestRate: 5, monthlyFees: 0 })
    const schedule = generateAmortizationSchedule(loan)
    const last = schedule[schedule.length - 1]
    expect(last.remainingBalance).toBeCloseTo(0, 0)
  })

  it('first month interest matches formula', () => {
    const loan = makeLoan({ currentBalance: 100000, nominalInterestRate: 6.0, monthlyFees: 0 })
    const schedule = generateAmortizationSchedule(loan)
    expect(schedule[0].interest).toBeCloseTo(500, 2)
  })

  it('includes fees in each month', () => {
    const loan = makeLoan({ monthlyFees: 50 })
    const schedule = generateAmortizationSchedule(loan)
    expect(schedule[0].fees).toBe(50)
  })
})

describe('calculateSnowball', () => {
  it('pays off smallest balance first', () => {
    const loans = [
      makeLoan({ id: '1', name: 'Big', currentBalance: 50000, monthlyPayment: 1000, nominalInterestRate: 3 }),
      makeLoan({ id: '2', name: 'Small', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 5 }),
    ]
    const result = calculateSnowball(loans, 0)
    expect(result.payoffOrder[0]).toBe('2') // Small first
  })
})

describe('calculateAvalanche', () => {
  it('pays off highest interest first', () => {
    const loans = [
      makeLoan({ id: '1', name: 'Low rate', currentBalance: 50000, monthlyPayment: 1000, nominalInterestRate: 3 }),
      makeLoan({ id: '2', name: 'High rate', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 8 }),
    ]
    const result = calculateAvalanche(loans, 0)
    expect(result.payoffOrder[0]).toBe('2') // High rate first
  })
})

describe('calculateCustomStrategy', () => {
  it('follows custom order', () => {
    const loans = [
      makeLoan({ id: '1', name: 'Loan A', currentBalance: 50000, monthlyPayment: 1000, nominalInterestRate: 3 }),
      makeLoan({ id: '2', name: 'Loan B', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 8 }),
    ]
    const result = calculateCustomStrategy(loans, 0, ['1', '2'])
    expect(result.payoffOrder[0]).toBe('1')
  })
})

describe('calculatePayoffComparison', () => {
  it('returns results for all three strategies', () => {
    const loans = [
      makeLoan({ id: '1', currentBalance: 50000, monthlyPayment: 1500, nominalInterestRate: 4 }),
      makeLoan({ id: '2', currentBalance: 20000, monthlyPayment: 800, nominalInterestRate: 7 }),
    ]
    const result = calculatePayoffComparison(loans, 500)
    expect(result.snowball).toBeDefined()
    expect(result.avalanche).toBeDefined()
    expect(result.snowball.totalInterest).toBeGreaterThan(0)
    expect(result.avalanche.totalInterest).toBeGreaterThan(0)
    // Avalanche should save more interest (or equal)
    expect(result.avalanche.totalInterest).toBeLessThanOrEqual(result.snowball.totalInterest)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run
```

Expected: FAIL — module `../calculations` not found.

**Step 3: Implement the calculation engine**

Create `src/lib/calculations.ts`:

```typescript
import type { Loan } from './types'

export interface AmortizationRow {
  month: number
  payment: number
  principal: number
  interest: number
  fees: number
  remainingBalance: number
}

export interface StrategyResult {
  payoffOrder: string[]
  totalMonths: number
  totalInterest: number
  totalFees: number
  totalPaid: number
  debtFreeDate: string
  timeline: MonthlySnapshot[]
}

export interface MonthlySnapshot {
  month: number
  totalBalance: number
  totalInterestPaid: number
  loansRemaining: number
}

export interface PayoffComparison {
  snowball: StrategyResult
  avalanche: StrategyResult
  minimumOnly: StrategyResult
}

// Core: monthly interest for a loan
export function calculateMonthlyInterest(balance: number, annualRate: number): number {
  return (balance * annualRate / 100) / 12
}

// Generate amortization schedule for a single loan
// Handles fixed-rate periods: uses current rate for fixedRateTermsRemaining months,
// then switches to rateAfterFixedPeriod (if set)
export function generateAmortizationSchedule(loan: Loan): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  let balance = loan.currentBalance
  let month = 0
  let currentRate = loan.nominalInterestRate
  const fixedTerms = loan.fixedRateTermsRemaining || 0

  while (balance > 0.01 && month < 600) { // cap at 50 years
    month++

    // Switch rate after fixed period ends
    if (fixedTerms > 0 && month > fixedTerms && loan.rateAfterFixedPeriod !== null) {
      currentRate = loan.rateAfterFixedPeriod
    }

    const interest = calculateMonthlyInterest(balance, currentRate)
    const fees = loan.monthlyFees
    const totalPayment = Math.min(loan.monthlyPayment, balance + interest + fees)
    const principal = Math.max(0, totalPayment - interest - fees)
    balance = Math.max(0, balance - principal)

    schedule.push({
      month,
      payment: totalPayment,
      principal,
      interest,
      fees,
      remainingBalance: balance,
    })

    if (balance <= 0.01) break
  }

  return schedule
}

// Generic strategy runner: given loans sorted in payoff priority order
function runStrategy(
  loans: Loan[],
  extraMonthly: number,
  orderedIds: string[]
): StrategyResult {
  // Clone loan balances
  const balances = new Map<string, number>()
  const rates = new Map<string, number>()
  const minimums = new Map<string, number>()
  const fees = new Map<string, number>()
  const names = new Map<string, string>()

  for (const loan of loans) {
    balances.set(loan.id, loan.currentBalance)
    rates.set(loan.id, loan.nominalInterestRate)
    minimums.set(loan.id, loan.monthlyPayment)
    fees.set(loan.id, loan.monthlyFees)
    names.set(loan.id, loan.name)
  }

  const payoffOrder: string[] = []
  const timeline: MonthlySnapshot[] = []
  let totalInterest = 0
  let totalFees = 0
  let totalPaid = 0
  let month = 0
  let freedPayment = 0 // accumulated payment from paid-off loans

  while (month < 600) {
    // Check if all paid off
    const activeLoans = orderedIds.filter((id) => (balances.get(id) ?? 0) > 0.01)
    if (activeLoans.length === 0) break

    month++
    let monthInterest = 0
    let monthFees = 0
    let monthPaid = 0
    let extraBudget = extraMonthly + freedPayment

    // Pay minimums on all active loans
    for (const id of activeLoans) {
      const balance = balances.get(id)!
      const rate = rates.get(id)!
      const fee = fees.get(id)!
      const interest = calculateMonthlyInterest(balance, rate)
      const min = minimums.get(id)!
      const payment = Math.min(min, balance + interest + fee)
      const principal = Math.max(0, payment - interest - fee)

      balances.set(id, Math.max(0, balance - principal))
      monthInterest += interest
      monthFees += fee
      monthPaid += payment
    }

    // Apply extra to the target loan (first in priority that is still active)
    for (const id of orderedIds) {
      if ((balances.get(id) ?? 0) <= 0.01) continue
      if (extraBudget <= 0) break

      const balance = balances.get(id)!
      const extraPrincipal = Math.min(extraBudget, balance)
      balances.set(id, Math.max(0, balance - extraPrincipal))
      extraBudget -= extraPrincipal
      monthPaid += extraPrincipal
    }

    totalInterest += monthInterest
    totalFees += monthFees
    totalPaid += monthPaid

    // Check for newly paid-off loans
    for (const id of activeLoans) {
      if ((balances.get(id) ?? 0) <= 0.01 && !payoffOrder.includes(id)) {
        payoffOrder.push(id)
        freedPayment += minimums.get(id)!
      }
    }

    timeline.push({
      month,
      totalBalance: Array.from(balances.values()).reduce((a, b) => a + b, 0),
      totalInterestPaid: totalInterest,
      loansRemaining: orderedIds.filter((id) => (balances.get(id) ?? 0) > 0.01).length,
    })
  }

  // Add any loans not yet in payoff order (still active after 600 months)
  for (const id of orderedIds) {
    if (!payoffOrder.includes(id)) payoffOrder.push(id)
  }

  const now = new Date()
  const debtFreeDate = new Date(now.getFullYear(), now.getMonth() + month, 1)
    .toISOString().split('T')[0]

  return {
    payoffOrder,
    totalMonths: month,
    totalInterest: Math.round(totalInterest),
    totalFees: Math.round(totalFees),
    totalPaid: Math.round(totalPaid),
    debtFreeDate,
    timeline,
  }
}

export function calculateSnowball(loans: Loan[], extraMonthly: number): StrategyResult {
  const ordered = [...loans].sort((a, b) => a.currentBalance - b.currentBalance)
  return runStrategy(loans, extraMonthly, ordered.map((l) => l.id))
}

export function calculateAvalanche(loans: Loan[], extraMonthly: number): StrategyResult {
  const ordered = [...loans].sort((a, b) => b.nominalInterestRate - a.nominalInterestRate)
  return runStrategy(loans, extraMonthly, ordered.map((l) => l.id))
}

export function calculateCustomStrategy(
  loans: Loan[],
  extraMonthly: number,
  customOrder: string[]
): StrategyResult {
  return runStrategy(loans, extraMonthly, customOrder)
}

export function calculatePayoffComparison(
  loans: Loan[],
  extraMonthly: number
): PayoffComparison {
  return {
    snowball: calculateSnowball(loans, extraMonthly),
    avalanche: calculateAvalanche(loans, extraMonthly),
    minimumOnly: runStrategy(loans, 0, loans.map((l) => l.id)),
  }
}
```

**Step 4: Run tests**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/calculations.ts src/lib/__tests__/calculations.test.ts
git commit -m "feat: add calculation engine with snowball, avalanche, amortization"
```

---

## Task 4: Formatting Utilities

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/__tests__/format.test.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatNOK, formatPercent, formatDate, formatMonths, loanTypeLabel } from '../format'

describe('formatNOK', () => {
  it('formats currency with space separator', () => {
    const result = formatNOK(1234567)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
    expect(result).toContain('kr')
  })

  it('formats zero', () => {
    expect(formatNOK(0)).toContain('0')
  })
})

describe('formatPercent', () => {
  it('formats percentage', () => {
    expect(formatPercent(4.5)).toBe('4,50 %')
  })
})

describe('formatDate', () => {
  it('formats ISO date to Norwegian format', () => {
    const result = formatDate('2026-02-13')
    expect(result).toContain('13')
    expect(result).toContain('2026')
  })
})

describe('formatMonths', () => {
  it('formats months into years and months', () => {
    expect(formatMonths(25)).toBe('2 år 1 mnd')
  })

  it('formats exact years', () => {
    expect(formatMonths(24)).toBe('2 år 0 mnd')
  })

  it('formats less than a year', () => {
    expect(formatMonths(5)).toBe('0 år 5 mnd')
  })
})

describe('loanTypeLabel', () => {
  it('returns Norwegian labels', () => {
    expect(loanTypeLabel('housing')).toBe('Boliglån')
    expect(loanTypeLabel('car')).toBe('Billån')
    expect(loanTypeLabel('consumer')).toBe('Forbrukslån')
    expect(loanTypeLabel('student')).toBe('Studielån')
  })
})
```

**Step 2: Implement formatting utilities**

Create `src/lib/format.ts`:

```typescript
import type { LoanType } from './types'

const nokFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const nokDetailFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatNOK(amount: number, detailed = false): string {
  return detailed ? nokDetailFormatter.format(amount) : nokFormatter.format(amount)
}

export function formatPercent(rate: number): string {
  return `${rate.toFixed(2).replace('.', ',')} %`
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return `${years} år ${months} mnd`
}

const loanTypeLabels: Record<LoanType, string> = {
  housing: 'Boliglån',
  car: 'Billån',
  consumer: 'Forbrukslån',
  student: 'Studielån',
}

export function loanTypeLabel(type: LoanType): string {
  return loanTypeLabels[type]
}
```

**Step 3: Run tests**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/lib/format.ts src/lib/__tests__/format.test.ts
git commit -m "feat: add NOK/date/percentage formatting utilities"
```

---

## Task 5: Server Actions

**Files:**
- Create: `src/app/actions.ts`

**Step 1: Create server actions for all CRUD operations**

Create `src/app/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import {
  createLoan,
  updateLoan,
  deleteLoan,
  createPayment,
  createScenario,
  deleteScenario,
} from '@/lib/db'
import { loanSchema, paymentSchema, scenarioSchema } from '@/lib/schemas'
import { calculateMonthlyInterest } from '@/lib/calculations'
import { getLoan } from '@/lib/db'

export async function addLoanAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    lender: formData.get('lender') as string,
    loanNumber: formData.get('loanNumber') as string,
    originalAmount: Number(formData.get('originalAmount')),
    currentBalance: Number(formData.get('currentBalance')),
    nominalInterestRate: Number(formData.get('nominalInterestRate')),
    effectiveInterestRate: Number(formData.get('effectiveInterestRate')),
    monthlyFees: Number(formData.get('monthlyFees')),
    monthlyPayment: Number(formData.get('monthlyPayment')),
    remainingTermMonths: Number(formData.get('remainingTermMonths')),
    originationDate: formData.get('originationDate') as string,
    paymentDueDay: Number(formData.get('paymentDueDay')),
    fixedRateTermsRemaining: Number(formData.get('fixedRateTermsRemaining') || 0),
    rateAfterFixedPeriod: formData.get('rateAfterFixedPeriod') ? Number(formData.get('rateAfterFixedPeriod')) : null,
    priority: Number(formData.get('priority')),
  }

  const parsed = loanSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await createLoan(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  return { success: true }
}

export async function updateLoanAction(id: string, formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    lender: formData.get('lender') as string,
    loanNumber: formData.get('loanNumber') as string,
    originalAmount: Number(formData.get('originalAmount')),
    currentBalance: Number(formData.get('currentBalance')),
    nominalInterestRate: Number(formData.get('nominalInterestRate')),
    effectiveInterestRate: Number(formData.get('effectiveInterestRate')),
    monthlyFees: Number(formData.get('monthlyFees')),
    monthlyPayment: Number(formData.get('monthlyPayment')),
    remainingTermMonths: Number(formData.get('remainingTermMonths')),
    originationDate: formData.get('originationDate') as string,
    paymentDueDay: Number(formData.get('paymentDueDay')),
    fixedRateTermsRemaining: Number(formData.get('fixedRateTermsRemaining') || 0),
    rateAfterFixedPeriod: formData.get('rateAfterFixedPeriod') ? Number(formData.get('rateAfterFixedPeriod')) : null,
    priority: Number(formData.get('priority')),
  }

  const parsed = loanSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await updateLoan(id, parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${id}`)
  return { success: true }
}

export async function deleteLoanAction(id: string) {
  await deleteLoan(id)
  revalidatePath('/')
  revalidatePath('/lan')
  return { success: true }
}

export async function addPaymentAction(formData: FormData) {
  const loanId = formData.get('loanId') as string
  const amount = Number(formData.get('amount'))
  const date = formData.get('date') as string
  const isExtraPayment = formData.get('isExtraPayment') === 'true'

  // Auto-calculate interest/principal split
  const loan = await getLoan(loanId)
  if (!loan) return { error: 'Lån ikke funnet' }

  const interest = calculateMonthlyInterest(loan.currentBalance, loan.nominalInterestRate)
  const fees = loan.monthlyFees
  const principal = Math.max(0, amount - interest - fees)

  const raw = {
    loanId,
    date,
    amount,
    principal,
    interest,
    fees,
    isExtraPayment,
  }

  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await createPayment(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${loanId}`)
  revalidatePath('/historikk')
  return { success: true }
}

export async function addScenarioAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    strategy: formData.get('strategy') as string,
    extraMonthlyPayment: Number(formData.get('extraMonthlyPayment')),
    customOrder: JSON.parse((formData.get('customOrder') as string) || '[]'),
  }

  const parsed = scenarioSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await createScenario(parsed.data)
  revalidatePath('/kalkulator')
  return { success: true }
}

export async function deleteScenarioAction(id: string) {
  await deleteScenario(id)
  revalidatePath('/kalkulator')
  return { success: true }
}

export async function addRateChangeAction(formData: FormData) {
  const loanId = formData.get('loanId') as string
  const loan = await getLoan(loanId)
  if (!loan) return { error: 'Lån ikke funnet' }

  const raw = {
    loanId,
    date: formData.get('date') as string,
    oldNominalRate: loan.nominalInterestRate,
    newNominalRate: Number(formData.get('newNominalRate')),
    oldEffectiveRate: loan.effectiveInterestRate,
    newEffectiveRate: Number(formData.get('newEffectiveRate')),
    reason: (formData.get('reason') as string) || '',
  }

  const { rateChangeSchema } = await import('@/lib/schemas')
  const parsed = rateChangeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { createRateChange } = await import('@/lib/db')
  await createRateChange(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${loanId}`)
  return { success: true }
}
```

**Step 2: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add server actions for loan, payment, and scenario CRUD"
```

---

## Task 6: Layout & Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/sidebar.tsx`
- Create: `src/app/globals.css` (modify existing)

**Step 1: Build sidebar navigation component**

Create `src/components/sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  History,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Oversikt', icon: LayoutDashboard },
  { href: '/lan', label: 'Lån', icon: Wallet },
  { href: '/kalkulator', label: 'Kalkulator', icon: Calculator },
  { href: '/historikk', label: 'Betalingshistorikk', icon: History },
  { href: '/registrer', label: 'Registrer betaling', icon: PlusCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <h1 className="text-xl font-bold">Låneoversikt</h1>
          <p className="text-sm text-muted-foreground">Din gjeldsplan</p>
        </div>

        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
```

**Step 2: Update the root layout**

Modify `src/app/layout.tsx` to include sidebar and main content area with dark mode:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Låneoversikt',
  description: 'Din personlige gjeldsplan og låneoversikt',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className="dark">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-64 p-6 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

**Step 3: Install lucide-react for icons**

```bash
npm install lucide-react
```

**Step 4: Verify the app renders with sidebar**

```bash
npm run dev
```

Visit http://localhost:3000 — should see dark sidebar with navigation.

**Step 5: Commit**

```bash
git add src/components/sidebar.tsx src/app/layout.tsx
git commit -m "feat: add sidebar navigation with Norwegian labels"
```

---

## Task 7: Dashboard Page (Oversikt)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/summary-cards.tsx`
- Create: `src/components/dashboard/loan-bar-chart.tsx`
- Create: `src/components/dashboard/interest-pie-chart.tsx`
- Create: `src/components/dashboard/progress-chart.tsx`

**Step 1: Create summary cards component**

Create `src/components/dashboard/summary-cards.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatMonths } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface SummaryCardsProps {
  loans: Loan[]
  debtFreeDate: string
}

export function SummaryCards({ loans, debtFreeDate }: SummaryCardsProps) {
  const totalDebt = loans.reduce((sum, l) => sum + l.currentBalance, 0)
  const totalMonthlyPayment = loans.reduce((sum, l) => sum + l.monthlyPayment, 0)
  const totalMonthlyInterest = loans.reduce(
    (sum, l) => sum + calculateMonthlyInterest(l.currentBalance, l.nominalInterestRate),
    0
  )
  const maxTerm = Math.max(...loans.map((l) => l.remainingTermMonths), 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total gjeld</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalDebt)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rente per måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalMonthlyInterest)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Betaling per måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalMonthlyPayment)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gjeldsfri om</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMonths(maxTerm)}</div>
          <p className="text-xs text-muted-foreground mt-1">{debtFreeDate}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Create loan balance bar chart**

Create `src/components/dashboard/loan-bar-chart.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { Loan } from '@/lib/types'

interface LoanBarChartProps {
  loans: Loan[]
}

export function LoanBarChart({ loans }: LoanBarChartProps) {
  const data = loans.map((l) => ({
    name: l.name,
    saldo: l.currentBalance,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lånebalanse</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatNOK(value)} />
            <Bar dataKey="saldo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create interest pie chart**

Create `src/components/dashboard/interest-pie-chart.tsx`:

```tsx
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateMonthlyInterest } from '@/lib/calculations'
import { formatNOK } from '@/lib/format'
import type { Loan } from '@/lib/types'

const COLORS = ['hsl(220, 70%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 55%)', 'hsl(350, 65%, 50%)']

interface InterestPieChartProps {
  loans: Loan[]
}

export function InterestPieChart({ loans }: InterestPieChartProps) {
  const data = loans.map((l) => ({
    name: l.name,
    rente: Math.round(calculateMonthlyInterest(l.currentBalance, l.nominalInterestRate)),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rentefordeling per måned</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="rente" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatNOK(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create progress chart**

Create `src/components/dashboard/progress-chart.tsx`:

```tsx
'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { MonthlySnapshot } from '@/lib/calculations'

interface ProgressChartProps {
  timeline: MonthlySnapshot[]
}

export function ProgressChart({ timeline }: ProgressChartProps) {
  const data = timeline.filter((_, i) => i % 3 === 0 || i === timeline.length - 1).map((s) => ({
    mnd: s.month,
    gjeld: Math.round(s.totalBalance),
  }))

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Gjeldsutvikling over tid</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <XAxis dataKey="mnd" stroke="#888" fontSize={12} label={{ value: 'Måneder', position: 'bottom' }} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatNOK(value)} labelFormatter={(l) => `Måned ${l}`} />
            <Area type="monotone" dataKey="gjeld" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 5: Wire up the dashboard page**

Modify `src/app/page.tsx`:

```tsx
import { getLoans } from '@/lib/db'
import { calculatePayoffComparison } from '@/lib/calculations'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LoanBarChart } from '@/components/dashboard/loan-bar-chart'
import { InterestPieChart } from '@/components/dashboard/interest-pie-chart'
import { ProgressChart } from '@/components/dashboard/progress-chart'

export default async function DashboardPage() {
  const loans = await getLoans()

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-3xl font-bold">Velkommen til Låneoversikt</h1>
        <p className="text-muted-foreground">Legg til dine lån for å komme i gang.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  const comparison = calculatePayoffComparison(loans, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Oversikt</h1>
      <SummaryCards loans={loans} debtFreeDate={comparison.minimumOnly.debtFreeDate} />
      <div className="grid gap-6 md:grid-cols-2">
        <LoanBarChart loans={loans} />
        <InterestPieChart loans={loans} />
      </div>
      <ProgressChart timeline={comparison.minimumOnly.timeline} />
    </div>
  )
}
```

**Step 6: Verify dashboard renders**

```bash
npm run dev
```

Expected: Dashboard shows empty state with link to add loans.

**Step 7: Commit**

```bash
git add src/app/page.tsx src/components/dashboard/
git commit -m "feat: add dashboard page with summary cards and charts"
```

---

## Task 8: Loans List Page

**Files:**
- Create: `src/app/lan/page.tsx`
- Create: `src/components/loans/loan-table.tsx`
- Create: `src/components/loans/loan-form.tsx`

**Step 1: Create the loan form component**

Create `src/components/loans/loan-form.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addLoanAction, updateLoanAction } from '@/app/actions'
import type { Loan } from '@/lib/types'
import { useState } from 'react'

interface LoanFormProps {
  loan?: Loan
  trigger?: React.ReactNode
}

export function LoanForm({ loan, trigger }: LoanFormProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = !!loan

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateLoanAction(loan!.id, formData)
      : await addLoanAction(formData)

    if ('success' in result && result.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>{isEdit ? 'Rediger' : 'Legg til lån'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger lån' : 'Legg til nytt lån'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Lånenavn</Label>
            <Input id="name" name="name" defaultValue={loan?.name} required />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={loan?.type || 'consumer'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="housing">Boliglån</SelectItem>
                <SelectItem value="car">Billån</SelectItem>
                <SelectItem value="consumer">Forbrukslån</SelectItem>
                <SelectItem value="student">Studielån</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lender">Långiver</Label>
            <Input id="lender" name="lender" defaultValue={loan?.lender} required />
          </div>

          <div>
            <Label htmlFor="loanNumber">Lånenummer</Label>
            <Input id="loanNumber" name="loanNumber" defaultValue={loan?.loanNumber} />
          </div>

          <div>
            <Label htmlFor="originalAmount">Opprinnelig beløp (kr)</Label>
            <Input id="originalAmount" name="originalAmount" type="number" defaultValue={loan?.originalAmount} required />
          </div>

          <div>
            <Label htmlFor="currentBalance">Nåværende saldo (kr)</Label>
            <Input id="currentBalance" name="currentBalance" type="number" defaultValue={loan?.currentBalance} required />
          </div>

          <div>
            <Label htmlFor="nominalInterestRate">Nominell rente (%)</Label>
            <Input id="nominalInterestRate" name="nominalInterestRate" type="number" step="0.01" defaultValue={loan?.nominalInterestRate} required />
          </div>

          <div>
            <Label htmlFor="effectiveInterestRate">Effektiv rente (%)</Label>
            <Input id="effectiveInterestRate" name="effectiveInterestRate" type="number" step="0.01" defaultValue={loan?.effectiveInterestRate} required />
          </div>

          <div>
            <Label htmlFor="monthlyFees">Månedlige gebyrer (kr)</Label>
            <Input id="monthlyFees" name="monthlyFees" type="number" defaultValue={loan?.monthlyFees ?? 0} required />
          </div>

          <div>
            <Label htmlFor="monthlyPayment">Månedlig betaling (kr)</Label>
            <Input id="monthlyPayment" name="monthlyPayment" type="number" defaultValue={loan?.monthlyPayment} required />
          </div>

          <div>
            <Label htmlFor="remainingTermMonths">Gjenstående måneder</Label>
            <Input id="remainingTermMonths" name="remainingTermMonths" type="number" defaultValue={loan?.remainingTermMonths} required />
          </div>

          <div>
            <Label htmlFor="originationDate">Startdato</Label>
            <Input id="originationDate" name="originationDate" type="date" defaultValue={loan?.originationDate} required />
          </div>

          <div>
            <Label htmlFor="paymentDueDay">Forfallsdag</Label>
            <Input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="31" defaultValue={loan?.paymentDueDay ?? 15} required />
          </div>

          <div>
            <Label htmlFor="fixedRateTermsRemaining">Fastrenteperiode (mnd gjenstående)</Label>
            <Input id="fixedRateTermsRemaining" name="fixedRateTermsRemaining" type="number" min="0" defaultValue={loan?.fixedRateTermsRemaining ?? 0} />
          </div>

          <div>
            <Label htmlFor="rateAfterFixedPeriod">Rente etter fastperiode (%)</Label>
            <Input id="rateAfterFixedPeriod" name="rateAfterFixedPeriod" type="number" step="0.01" defaultValue={loan?.rateAfterFixedPeriod ?? ''} placeholder="La stå tom hvis ukjent" />
          </div>

          <div>
            <Label htmlFor="priority">Prioritet</Label>
            <Input id="priority" name="priority" type="number" min="1" defaultValue={loan?.priority ?? 1} required />
          </div>

          <div className="col-span-2">
            <Button type="submit" className="w-full">
              {isEdit ? 'Lagre endringer' : 'Legg til lån'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Create the loan table component**

Create `src/components/loans/loan-table.tsx`:

```tsx
'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNOK, formatPercent, formatMonths, loanTypeLabel } from '@/lib/format'
import { deleteLoanAction } from '@/app/actions'
import { LoanForm } from './loan-form'
import type { Loan } from '@/lib/types'
import { Trash2, Pencil, ArrowRight } from 'lucide-react'

interface LoanTableProps {
  loans: Loan[]
}

export function LoanTable({ loans }: LoanTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Nominell rente</TableHead>
            <TableHead className="text-right">Effektiv rente</TableHead>
            <TableHead className="text-right">Mnd. betaling</TableHead>
            <TableHead className="text-right">Gjenstående</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell className="font-medium">{loan.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{loanTypeLabel(loan.type)}</Badge>
              </TableCell>
              <TableCell className="text-right">{formatNOK(loan.currentBalance)}</TableCell>
              <TableCell className="text-right">{formatPercent(loan.nominalInterestRate)}</TableCell>
              <TableCell className="text-right">{formatPercent(loan.effectiveInterestRate)}</TableCell>
              <TableCell className="text-right">{formatNOK(loan.monthlyPayment)}</TableCell>
              <TableCell className="text-right">{formatMonths(loan.remainingTermMonths)}</TableCell>
              <TableCell className="text-right space-x-1">
                <LoanForm loan={loan} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                <Button variant="ghost" size="icon" onClick={() => deleteLoanAction(loan.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Link href={`/lan/${loan.id}`}>
                  <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {loans.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Ingen lån registrert ennå. Legg til ditt første lån.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 3: Create loans page**

Create `src/app/lan/page.tsx`:

```tsx
import { getLoans } from '@/lib/db'
import { LoanTable } from '@/components/loans/loan-table'
import { LoanForm } from '@/components/loans/loan-form'

export default async function LoansPage() {
  const loans = await getLoans()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lån</h1>
        <LoanForm />
      </div>
      <LoanTable loans={loans} />
    </div>
  )
}
```

**Step 4: Verify**

```bash
npm run dev
```

Navigate to /lan — should see empty table with "Legg til lån" button.

**Step 5: Commit**

```bash
git add src/app/lan/ src/components/loans/
git commit -m "feat: add loans list page with CRUD form and table"
```

---

## Task 9: Loan Detail Page

**Files:**
- Create: `src/app/lan/[id]/page.tsx`
- Create: `src/components/loans/amortization-table.tsx`
- Create: `src/components/loans/loan-payment-history.tsx`
- Create: `src/components/loans/loan-info-card.tsx`
- Create: `src/components/loans/rate-change-history.tsx`

**Step 1: Create loan info card**

Create `src/components/loans/loan-info-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatPercent, formatDate, formatMonths, loanTypeLabel } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface LoanInfoCardProps {
  loan: Loan
}

export function LoanInfoCard({ loan }: LoanInfoCardProps) {
  const monthlyInterest = calculateMonthlyInterest(loan.currentBalance, loan.nominalInterestRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {loan.name}
          <span className="text-sm font-normal text-muted-foreground">{loanTypeLabel(loan.type)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Långiver</p>
            <p className="font-medium">{loan.lender}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lånenummer</p>
            <p className="font-medium">{loan.loanNumber || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Opprinnelig beløp</p>
            <p className="font-medium">{formatNOK(loan.originalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nåværende saldo</p>
            <p className="font-medium text-lg">{formatNOK(loan.currentBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nominell rente</p>
            <p className="font-medium">{formatPercent(loan.nominalInterestRate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Effektiv rente</p>
            <p className="font-medium">{formatPercent(loan.effectiveInterestRate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Månedlig rente</p>
            <p className="font-medium">{formatNOK(monthlyInterest)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Månedlig betaling</p>
            <p className="font-medium">{formatNOK(loan.monthlyPayment)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gebyrer/mnd</p>
            <p className="font-medium">{formatNOK(loan.monthlyFees)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gjenstående</p>
            <p className="font-medium">{formatMonths(loan.remainingTermMonths)}</p>
          </div>
          {loan.fixedRateTermsRemaining > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Fastrente gjenstående</p>
              <p className="font-medium">{formatMonths(loan.fixedRateTermsRemaining)}</p>
            </div>
          )}
          {loan.rateAfterFixedPeriod !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Rente etter fastperiode</p>
              <p className="font-medium">{formatPercent(loan.rateAfterFixedPeriod)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Startdato</p>
            <p className="font-medium">{formatDate(loan.originationDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Forfallsdag</p>
            <p className="font-medium">{loan.paymentDueDay}. hver måned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create amortization table**

Create `src/components/loans/amortization-table.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { AmortizationRow } from '@/lib/calculations'

interface AmortizationTableProps {
  schedule: AmortizationRow[]
}

export function AmortizationTable({ schedule }: AmortizationTableProps) {
  const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0)
  const totalFees = schedule.reduce((sum, r) => sum + r.fees, 0)
  const totalPaid = schedule.reduce((sum, r) => sum + r.payment + r.fees, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nedbetalingsplan</CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total rente: {formatNOK(totalInterest)}</span>
          <span>Totale gebyrer: {formatNOK(totalFees)}</span>
          <span>Totalt betalt: {formatNOK(totalPaid)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mnd</TableHead>
                <TableHead className="text-right">Betaling</TableHead>
                <TableHead className="text-right">Avdrag</TableHead>
                <TableHead className="text-right">Rente</TableHead>
                <TableHead className="text-right">Gebyrer</TableHead>
                <TableHead className="text-right">Gjenstående</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.payment)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.principal)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.interest)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.fees)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.remainingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create loan payment history component**

Create `src/components/loans/loan-payment-history.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNOK, formatDate } from '@/lib/format'
import type { Payment } from '@/lib/types'

interface LoanPaymentHistoryProps {
  payments: Payment[]
}

export function LoanPaymentHistory({ payments }: LoanPaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Betalingshistorikk</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Ingen betalinger registrert for dette lånet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Betalingshistorikk</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead className="text-right">Avdrag</TableHead>
              <TableHead className="text-right">Rente</TableHead>
              <TableHead className="text-right">Gebyrer</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.date)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.amount)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.principal)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.interest)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.fees)}</TableCell>
                <TableCell>
                  {p.isExtraPayment && <Badge>Ekstra</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create rate change history component**

Create `src/components/loans/rate-change-history.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatPercent, formatDate } from '@/lib/format'
import { addRateChangeAction } from '@/app/actions'
import type { RateChange } from '@/lib/types'
import { TrendingUp } from 'lucide-react'

interface RateChangeHistoryProps {
  rateChanges: RateChange[]
  loanId: string
}

export function RateChangeHistory({ rateChanges, loanId }: RateChangeHistoryProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const sorted = [...rateChanges].sort((a, b) => b.date.localeCompare(a.date))

  async function handleSubmit(formData: FormData) {
    const result = await addRateChangeAction(formData)
    if ('success' in result && result.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rentehistorikk
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Registrer renteendring</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrer renteendring</DialogTitle>
            </DialogHeader>
            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <input type="hidden" name="loanId" value={loanId} />
              <div>
                <Label htmlFor="date">Dato for endring</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <Label htmlFor="newNominalRate">Ny nominell rente (%)</Label>
                <Input id="newNominalRate" name="newNominalRate" type="number" step="0.01" required />
              </div>
              <div>
                <Label htmlFor="newEffectiveRate">Ny effektiv rente (%)</Label>
                <Input id="newEffectiveRate" name="newEffectiveRate" type="number" step="0.01" required />
              </div>
              <div>
                <Label htmlFor="reason">Årsak</Label>
                <Input id="reason" name="reason" placeholder="F.eks. Norges Bank renteheving" />
              </div>
              <Button type="submit" className="w-full">Lagre</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Ingen renteendringer registrert.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead className="text-right">Gammel nominell</TableHead>
                <TableHead className="text-right">Ny nominell</TableHead>
                <TableHead className="text-right">Gammel effektiv</TableHead>
                <TableHead className="text-right">Ny effektiv</TableHead>
                <TableHead>Årsak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>{formatDate(rc.date)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.oldNominalRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.newNominalRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.oldEffectiveRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.newEffectiveRate)}</TableCell>
                  <TableCell>{rc.reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 5: Create the loan detail page**

Create `src/app/lan/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getLoan, getPayments, getRateChanges } from '@/lib/db'
import { generateAmortizationSchedule } from '@/lib/calculations'
import { LoanInfoCard } from '@/components/loans/loan-info-card'
import { AmortizationTable } from '@/components/loans/amortization-table'
import { LoanPaymentHistory } from '@/components/loans/loan-payment-history'
import { RateChangeHistory } from '@/components/loans/rate-change-history'
import { LoanForm } from '@/components/loans/loan-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface LoanDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params
  const loan = await getLoan(id)
  if (!loan) notFound()

  const payments = await getPayments(id)
  const rateChanges = await getRateChanges(id)
  const schedule = generateAmortizationSchedule(loan)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/lan">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">{loan.name}</h1>
        <LoanForm loan={loan} trigger={<Button variant="outline">Rediger</Button>} />
      </div>

      <LoanInfoCard loan={loan} />
      <RateChangeHistory rateChanges={rateChanges} loanId={loan.id} />
      <AmortizationTable schedule={schedule} />
      <LoanPaymentHistory payments={payments} />
    </div>
  )
}
```

**Step 6: Verify**

```bash
npm run dev
```

Navigate to /lan, add a loan, click into detail — should see loan info, rate change history, amortization schedule, and payment history.

**Step 7: Commit**

```bash
git add src/app/lan/[id]/ src/components/loans/loan-info-card.tsx src/components/loans/amortization-table.tsx src/components/loans/loan-payment-history.tsx src/components/loans/rate-change-history.tsx
git commit -m "feat: add loan detail page with amortization, rate history, and payment history"
```

---

## Task 10: Calculator Page (Kalkulator)

**Files:**
- Create: `src/app/kalkulator/page.tsx`
- Create: `src/components/calculator/strategy-comparison.tsx`
- Create: `src/components/calculator/what-if-panel.tsx`

**Step 1: Create strategy comparison component**

Create `src/components/calculator/strategy-comparison.tsx`:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatMonths } from '@/lib/format'
import type { StrategyResult } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface StrategyComparisonProps {
  snowball: StrategyResult
  avalanche: StrategyResult
  minimumOnly: StrategyResult
  loans: Loan[]
}

function StrategyCard({
  title,
  result,
  savings,
  loans,
  highlight,
}: {
  title: string
  result: StrategyResult
  savings: number
  loans: Loan[]
  highlight?: boolean
}) {
  const loanNames = new Map(loans.map((l) => [l.id, l.name]))

  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {highlight && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Beste valg</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total rente</p>
            <p className="text-lg font-bold">{formatNOK(result.totalInterest)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tid til gjeldsfri</p>
            <p className="text-lg font-bold">{formatMonths(result.totalMonths)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gjeldsfri dato</p>
            <p className="font-medium">{result.debtFreeDate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Spart vs minimum</p>
            <p className="text-lg font-bold text-green-500">{formatNOK(savings)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Nedbetalingsrekkefølge:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {result.payoffOrder.map((id, i) => (
              <li key={id}>{loanNames.get(id) || id}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

export function StrategyComparison({ snowball, avalanche, minimumOnly, loans }: StrategyComparisonProps) {
  const bestStrategy = avalanche.totalInterest <= snowball.totalInterest ? 'avalanche' : 'snowball'

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StrategyCard
        title="Snøball (lavest saldo først)"
        result={snowball}
        savings={minimumOnly.totalInterest - snowball.totalInterest}
        loans={loans}
        highlight={bestStrategy === 'snowball'}
      />
      <StrategyCard
        title="Skred (høyest rente først)"
        result={avalanche}
        savings={minimumOnly.totalInterest - avalanche.totalInterest}
        loans={loans}
        highlight={bestStrategy === 'avalanche'}
      />
      <StrategyCard
        title="Kun minimumsbetaling"
        result={minimumOnly}
        savings={0}
        loans={loans}
      />
    </div>
  )
}
```

**Step 2: Create what-if panel**

Create `src/components/calculator/what-if-panel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatNOK, formatMonths } from '@/lib/format'
import { calculatePayoffComparison } from '@/lib/calculations'
import type { Loan } from '@/lib/types'
import type { PayoffComparison } from '@/lib/calculations'

interface WhatIfPanelProps {
  loans: Loan[]
  baseComparison: PayoffComparison
}

export function WhatIfPanel({ loans, baseComparison }: WhatIfPanelProps) {
  const [extraAmount, setExtraAmount] = useState(0)
  const [result, setResult] = useState<PayoffComparison | null>(null)

  function handleCalculate() {
    if (extraAmount > 0) {
      setResult(calculatePayoffComparison(loans, extraAmount))
    }
  }

  const comparison = result || baseComparison
  const base = baseComparison.minimumOnly

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hva-hvis kalkulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="extraAmount">Ekstra månedlig beløp (kr)</Label>
            <Input
              id="extraAmount"
              type="number"
              min="0"
              step="500"
              value={extraAmount || ''}
              onChange={(e) => setExtraAmount(Number(e.target.value))}
              placeholder="F.eks. 2000"
            />
          </div>
          <Button onClick={handleCalculate}>Beregn</Button>
        </div>

        {result && (
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div>
              <h3 className="font-medium mb-3">Med {formatNOK(extraAmount)} ekstra/mnd (Skred)</h3>
              <div className="space-y-2 text-sm">
                <p>Gjeldsfri om: <strong>{formatMonths(result.avalanche.totalMonths)}</strong></p>
                <p>Total rente: <strong>{formatNOK(result.avalanche.totalInterest)}</strong></p>
                <p>Gjeldsfri dato: <strong>{result.avalanche.debtFreeDate}</strong></p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Besparelse</h3>
              <div className="space-y-2 text-sm">
                <p>Måneder spart: <strong className="text-green-500">{base.totalMonths - result.avalanche.totalMonths} mnd</strong></p>
                <p>Rente spart: <strong className="text-green-500">{formatNOK(base.totalInterest - result.avalanche.totalInterest)}</strong></p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create calculator page**

Create `src/app/kalkulator/page.tsx`:

```tsx
import { getLoans } from '@/lib/db'
import { calculatePayoffComparison } from '@/lib/calculations'
import { StrategyComparison } from '@/components/calculator/strategy-comparison'
import { WhatIfPanel } from '@/components/calculator/what-if-panel'

export default async function CalculatorPage() {
  const loans = await getLoans()

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Kalkulator</h1>
        <p className="text-muted-foreground">Legg til lån først for å bruke kalkulatoren.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  const comparison = calculatePayoffComparison(loans, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kalkulator</h1>
      <p className="text-muted-foreground">Sammenlign strategier for å bli gjeldsfri raskere.</p>

      <StrategyComparison
        snowball={comparison.snowball}
        avalanche={comparison.avalanche}
        minimumOnly={comparison.minimumOnly}
        loans={loans}
      />

      <WhatIfPanel loans={loans} baseComparison={comparison} />
    </div>
  )
}
```

**Step 4: Verify**

```bash
npm run dev
```

Navigate to /kalkulator with loans added — should see strategy comparison and what-if panel.

**Step 5: Commit**

```bash
git add src/app/kalkulator/ src/components/calculator/
git commit -m "feat: add calculator page with snowball/avalanche comparison and what-if"
```

---

## Task 11: Payment Registration Page

**Files:**
- Create: `src/app/registrer/page.tsx`
- Create: `src/components/payments/payment-form.tsx`

**Step 1: Create payment form**

Create `src/components/payments/payment-form.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addPaymentAction } from '@/app/actions'
import { formatNOK } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface PaymentFormProps {
  loans: Loan[]
}

export function PaymentForm({ loans }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [amount, setAmount] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const selectedLoan = loans.find((l) => l.id === selectedLoanId)
  const interest = selectedLoan
    ? calculateMonthlyInterest(selectedLoan.currentBalance, selectedLoan.nominalInterestRate)
    : 0
  const fees = selectedLoan?.monthlyFees ?? 0
  const principal = Math.max(0, amount - interest - fees)

  async function handleSubmit(formData: FormData) {
    const result = await addPaymentAction(formData)
    if ('success' in result && result.success) {
      formRef.current?.reset()
      setAmount(0)
      setSelectedLoanId('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Registrer betaling</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="loanId">Velg lån</Label>
            <Select name="loanId" value={selectedLoanId} onValueChange={(v) => {
              setSelectedLoanId(v)
              const loan = loans.find((l) => l.id === v)
              if (loan) setAmount(loan.monthlyPayment)
            }}>
              <SelectTrigger><SelectValue placeholder="Velg et lån" /></SelectTrigger>
              <SelectContent>
                {loans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} — Saldo: {formatNOK(l.currentBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Beløp (kr)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Dato</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isExtraPayment" name="isExtraPayment" value="true" />
            <Label htmlFor="isExtraPayment">Ekstra innbetaling</Label>
          </div>

          {selectedLoan && amount > 0 && (
            <div className="bg-muted rounded-md p-4 space-y-1 text-sm">
              <p>Rente: <strong>{formatNOK(interest, true)}</strong></p>
              <p>Gebyrer: <strong>{formatNOK(fees)}</strong></p>
              <p>Avdrag (nedbetaling): <strong>{formatNOK(principal, true)}</strong></p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!selectedLoanId}>
            Registrer betaling
          </Button>

          {submitted && (
            <p className="text-green-500 text-sm text-center">Betaling registrert!</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create payment registration page**

Create `src/app/registrer/page.tsx`:

```tsx
import { getLoans } from '@/lib/db'
import { PaymentForm } from '@/components/payments/payment-form'

export default async function RegisterPaymentPage() {
  const loans = await getLoans()

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Registrer betaling</h1>
        <p className="text-muted-foreground">Legg til lån først.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Registrer betaling</h1>
      <p className="text-muted-foreground">Logg en betaling og se automatisk beregning av rente vs avdrag.</p>
      <PaymentForm loans={loans} />
    </div>
  )
}
```

**Step 3: Verify**

```bash
npm run dev
```

**Step 4: Commit**

```bash
git add src/app/registrer/ src/components/payments/
git commit -m "feat: add payment registration page with auto interest/principal split"
```

---

## Task 12: Payment History Page

**Files:**
- Create: `src/app/historikk/page.tsx`

**Step 1: Create payment history page**

Create `src/app/historikk/page.tsx`:

```tsx
import { getLoans, getPayments } from '@/lib/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNOK, formatDate } from '@/lib/format'

export default async function PaymentHistoryPage() {
  const loans = await getLoans()
  const payments = await getPayments()
  const loanNames = new Map(loans.map((l) => [l.id, l.name]))

  // Sort payments by date descending
  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date))

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0)
  const totalPrincipal = payments.reduce((sum, p) => sum + p.principal, 0)
  const totalFees = payments.reduce((sum, p) => sum + p.fees, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Betalingshistorikk</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt betalt</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalPaid)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt avdrag</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalPrincipal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total rente betalt</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatNOK(totalInterest)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totale gebyrer</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalFees)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {sorted.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Ingen betalinger registrert ennå.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Lån</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                  <TableHead className="text-right">Avdrag</TableHead>
                  <TableHead className="text-right">Rente</TableHead>
                  <TableHead className="text-right">Gebyrer</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{loanNames.get(p.loanId) || 'Ukjent'}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.amount)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.principal)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.interest)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.fees)}</TableCell>
                    <TableCell>{p.isExtraPayment && <Badge>Ekstra</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Verify**

```bash
npm run dev
```

**Step 3: Commit**

```bash
git add src/app/historikk/
git commit -m "feat: add payment history page with running totals"
```

---

## Task 13: Seed Data & Final Integration

**Files:**
- Create: `src/lib/seed.ts`
- Add: `db.json` to `.gitignore`

**Step 1: Add db.json to gitignore**

Add `db.json` to the end of `.gitignore` — this is personal financial data.

**Step 2: Create seed script for development**

Create `src/lib/seed.ts`:

```typescript
import { createLoan } from './db'

const sampleLoans = [
  {
    name: 'Huslån',
    type: 'housing' as const,
    lender: 'DNB',
    loanNumber: '',
    originalAmount: 3000000,
    currentBalance: 2750000,
    nominalInterestRate: 4.5,
    effectiveInterestRate: 4.65,
    monthlyFees: 50,
    monthlyPayment: 15000,
    remainingTermMonths: 240,
    originationDate: '2022-01-15',
    paymentDueDay: 15,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 4,
  },
  {
    name: 'Billån',
    type: 'car' as const,
    lender: 'Nordea',
    loanNumber: '',
    originalAmount: 350000,
    currentBalance: 220000,
    nominalInterestRate: 6.5,
    effectiveInterestRate: 6.9,
    monthlyFees: 65,
    monthlyPayment: 5500,
    remainingTermMonths: 48,
    originationDate: '2024-06-01',
    paymentDueDay: 1,
    fixedRateTermsRemaining: 30,
    rateAfterFixedPeriod: null,
    priority: 2,
  },
  {
    name: 'Forbrukslån',
    type: 'consumer' as const,
    lender: 'Bank Norwegian',
    loanNumber: '',
    originalAmount: 150000,
    currentBalance: 95000,
    nominalInterestRate: 12.5,
    effectiveInterestRate: 14.2,
    monthlyFees: 95,
    monthlyPayment: 3500,
    remainingTermMonths: 36,
    originationDate: '2025-03-01',
    paymentDueDay: 20,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 1,
  },
  {
    name: 'Studielån',
    type: 'student' as const,
    lender: 'Lånekassen',
    loanNumber: '',
    originalAmount: 450000,
    currentBalance: 380000,
    nominalInterestRate: 3.2,
    effectiveInterestRate: 3.2,
    monthlyFees: 0,
    monthlyPayment: 3200,
    remainingTermMonths: 180,
    originationDate: '2020-09-01',
    paymentDueDay: 15,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 3,
  },
]

async function seed() {
  for (const loan of sampleLoans) {
    await createLoan(loan)
    console.log(`Created: ${loan.name}`)
  }
  console.log('Seed complete!')
}

seed()
```

Add to `package.json` scripts:

```json
"seed": "npx tsx src/lib/seed.ts"
```

**Step 3: Run seed**

```bash
npm install -D tsx
npm run seed
```

Expected: 4 loans created in `db.json`.

**Step 4: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 5: Verify full app**

```bash
npm run dev
```

Walk through all pages: Dashboard, Lån, Låndetaljer, Kalkulator, Registrer betaling, Betalingshistorikk.

**Step 6: Commit**

```bash
git add src/lib/seed.ts .gitignore package.json
git commit -m "feat: add seed script and exclude db.json from git"
```

---

## Task 14: Final Test Run & Build Verification

**Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 2: Build for production**

```bash
npm run build
```

Expected: Build completes without errors.

**Step 3: Final commit if any fixes needed**

If build reveals issues, fix and commit.
