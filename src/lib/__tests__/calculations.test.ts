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
  fixedRateTermsRemaining: 0,
  rateAfterFixedPeriod: null,
  priority: 1,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('calculateMonthlyInterest', () => {
  it('calculates monthly interest correctly', () => {
    const result = calculateMonthlyInterest(100000, 6.0)
    expect(result).toBeCloseTo(500, 2)
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
    expect(schedule.length).toBe(5)
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
    expect(result.payoffOrder[0]).toBe('2')
  })
})

describe('calculateAvalanche', () => {
  it('pays off highest interest first', () => {
    const loans = [
      makeLoan({ id: '1', name: 'Low rate', currentBalance: 50000, monthlyPayment: 1000, nominalInterestRate: 3 }),
      makeLoan({ id: '2', name: 'High rate', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 8 }),
    ]
    const result = calculateAvalanche(loans, 0)
    expect(result.payoffOrder[0]).toBe('2')
  })
})

describe('calculateCustomStrategy', () => {
  it('follows custom order', () => {
    const loans = [
      makeLoan({ id: '1', name: 'Loan A', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 3, monthlyFees: 0 }),
      makeLoan({ id: '2', name: 'Loan B', currentBalance: 10000, monthlyPayment: 500, nominalInterestRate: 8, monthlyFees: 0 }),
    ]
    const result = calculateCustomStrategy(loans, 2000, ['1', '2'])
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
    expect(result.avalanche.totalInterest).toBeLessThanOrEqual(result.snowball.totalInterest)
  })
})
