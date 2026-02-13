import { describe, it, expect } from 'vitest'
import { loanSchema, paymentSchema, scenarioSchema, rateChangeSchema } from '../schemas'

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

describe('Rate change schema validation', () => {
  it('accepts valid rate change', () => {
    const result = rateChangeSchema.safeParse({
      loanId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-03-01',
      oldNominalRate: 4.5,
      newNominalRate: 4.75,
      oldEffectiveRate: 4.65,
      newEffectiveRate: 4.9,
      reason: 'Norges Bank renteheving',
    })
    expect(result.success).toBe(true)
  })
})
