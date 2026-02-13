import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import type { Database, Loan, Payment, Scenario, RateChange, Investment } from './types'
import type { LoanInput, PaymentInput, ScenarioInput, RateChangeInput, InvestmentInput } from './schemas'

const defaultData: Database = {
  loans: [],
  payments: [],
  scenarios: [],
  rateChanges: [],
  investments: [],
}

let dbInstance: Low<Database> | null = null

export async function getDb(): Promise<Low<Database>> {
  if (dbInstance) return dbInstance
  const file = join(process.cwd(), 'db.json')
  const adapter = new JSONFile<Database>(file)
  const db = new Low(adapter, defaultData)
  await db.read()
  // Merge defaults for any missing keys (e.g. after adding investments)
  for (const key of Object.keys(defaultData) as (keyof Database)[]) {
    if (!db.data[key]) {
      (db.data as unknown as Record<string, unknown>)[key] = defaultData[key]
    }
  }
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
  const payment: Payment = { ...input, id: uuidv4() }
  db.data.payments.push(payment)
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
  const rateChange: RateChange = { ...input, id: uuidv4() }
  db.data.rateChanges.push(rateChange)
  const loan = db.data.loans.find((l) => l.id === input.loanId)
  if (loan) {
    loan.nominalInterestRate = input.newNominalRate
    loan.effectiveInterestRate = input.newEffectiveRate
    loan.updatedAt = new Date().toISOString().split('T')[0]
  }
  await db.write()
  return rateChange
}

// Investment CRUD
export async function getInvestments(): Promise<Investment[]> {
  const db = await getDb()
  return db.data.investments
}

export async function getInvestment(id: string): Promise<Investment | undefined> {
  const db = await getDb()
  return db.data.investments.find((i) => i.id === id)
}

export async function createInvestment(input: InvestmentInput): Promise<Investment> {
  const db = await getDb()
  const investment: Investment = {
    ...input,
    id: uuidv4(),
    updatedAt: new Date().toISOString().split('T')[0],
  }
  db.data.investments.push(investment)
  await db.write()
  return investment
}

export async function updateInvestment(id: string, input: Partial<InvestmentInput>): Promise<Investment | null> {
  const db = await getDb()
  const index = db.data.investments.findIndex((i) => i.id === id)
  if (index === -1) return null
  db.data.investments[index] = {
    ...db.data.investments[index],
    ...input,
    updatedAt: new Date().toISOString().split('T')[0],
  }
  await db.write()
  return db.data.investments[index]
}

export async function deleteInvestment(id: string): Promise<boolean> {
  const db = await getDb()
  const before = db.data.investments.length
  db.data.investments = db.data.investments.filter((i) => i.id !== id)
  await db.write()
  return db.data.investments.length < before
}
