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
