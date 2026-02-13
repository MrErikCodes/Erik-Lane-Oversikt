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
