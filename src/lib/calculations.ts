import type { Loan, Investment } from './types'

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

export function calculateMonthlyInterest(balance: number, annualRate: number): number {
  return (balance * annualRate / 100) / 12
}

// Handles fixed-rate periods: uses current rate for fixedRateTermsRemaining months,
// then switches to rateAfterFixedPeriod (if set)
export function generateAmortizationSchedule(loan: Loan): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  let balance = loan.currentBalance
  let month = 0
  let currentRate = loan.nominalInterestRate
  const fixedTerms = loan.fixedRateTermsRemaining || 0

  while (balance > 0.01 && month < 600) {
    month++
    if (fixedTerms > 0 && month > fixedTerms && loan.rateAfterFixedPeriod !== null) {
      currentRate = loan.rateAfterFixedPeriod
    }
    const interest = calculateMonthlyInterest(balance, currentRate)
    const fees = loan.monthlyFees
    const totalPayment = Math.min(loan.monthlyPayment, balance + interest + fees)
    const principal = Math.max(0, totalPayment - interest - fees)
    balance = Math.max(0, balance - principal)
    schedule.push({ month, payment: totalPayment, principal, interest, fees, remainingBalance: balance })
    if (balance <= 0.01) break
  }
  return schedule
}

function runStrategy(loans: Loan[], extraMonthly: number, orderedIds: string[]): StrategyResult {
  const balances = new Map<string, number>()
  const rates = new Map<string, number>()
  const minimums = new Map<string, number>()
  const fees = new Map<string, number>()
  for (const loan of loans) {
    balances.set(loan.id, loan.currentBalance)
    rates.set(loan.id, loan.nominalInterestRate)
    minimums.set(loan.id, loan.monthlyPayment)
    fees.set(loan.id, loan.monthlyFees)
  }
  const payoffOrder: string[] = []
  const timeline: MonthlySnapshot[] = []
  let totalInterest = 0, totalFees = 0, totalPaid = 0, month = 0, freedPayment = 0

  while (month < 600) {
    const activeLoans = orderedIds.filter((id) => (balances.get(id) ?? 0) > 0.01)
    if (activeLoans.length === 0) break
    month++
    let monthInterest = 0, monthFees = 0, monthPaid = 0
    let extraBudget = extraMonthly + freedPayment

    for (const id of activeLoans) {
      const balance = balances.get(id)!
      const rate = rates.get(id)!
      const fee = fees.get(id)!
      const interest = calculateMonthlyInterest(balance, rate)
      const min = minimums.get(id)!
      const payment = Math.min(min, balance + interest + fee)
      const principal = Math.max(0, payment - interest - fee)
      balances.set(id, Math.max(0, balance - principal))
      monthInterest += interest; monthFees += fee; monthPaid += payment
    }

    for (const id of orderedIds) {
      if ((balances.get(id) ?? 0) <= 0.01) continue
      if (extraBudget <= 0) break
      const balance = balances.get(id)!
      const extraPrincipal = Math.min(extraBudget, balance)
      balances.set(id, Math.max(0, balance - extraPrincipal))
      extraBudget -= extraPrincipal; monthPaid += extraPrincipal
    }

    totalInterest += monthInterest; totalFees += monthFees; totalPaid += monthPaid

    for (const id of activeLoans) {
      if ((balances.get(id) ?? 0) <= 0.01 && !payoffOrder.includes(id)) {
        payoffOrder.push(id); freedPayment += minimums.get(id)!
      }
    }

    timeline.push({
      month,
      totalBalance: Array.from(balances.values()).reduce((a, b) => a + b, 0),
      totalInterestPaid: totalInterest,
      loansRemaining: orderedIds.filter((id) => (balances.get(id) ?? 0) > 0.01).length,
    })
  }

  for (const id of orderedIds) {
    if (!payoffOrder.includes(id)) payoffOrder.push(id)
  }

  const now = new Date()
  const debtFreeDate = new Date(now.getFullYear(), now.getMonth() + month, 1).toISOString().split('T')[0]

  return {
    payoffOrder, totalMonths: month,
    totalInterest: Math.round(totalInterest), totalFees: Math.round(totalFees),
    totalPaid: Math.round(totalPaid), debtFreeDate, timeline,
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

export function calculateCustomStrategy(loans: Loan[], extraMonthly: number, customOrder: string[]): StrategyResult {
  return runStrategy(loans, extraMonthly, customOrder)
}

export function calculatePayoffComparison(loans: Loan[], extraMonthly: number): PayoffComparison {
  return {
    snowball: calculateSnowball(loans, extraMonthly),
    avalanche: calculateAvalanche(loans, extraMonthly),
    minimumOnly: runStrategy(loans, 0, loans.map((l) => l.id)),
  }
}

export interface OpportunityCostResult {
  extraMonthly: number
  investInstead: {
    totalValueAfterMonths: number
    totalEarnings: number
    monthlyIncome: number
  }
  payLoansInstead: {
    interestSaved: number
    monthsSaved: number
  }
  netBenefit: number // positive = investing is better
  recommendation: 'invest' | 'pay_loans'
}

export function calculateOpportunityCost(
  loans: Loan[],
  investments: Investment[],
  extraMonthly: number,
  months: number
): OpportunityCostResult {
  // Average investment return across all investments
  const totalInvested = investments.reduce((sum, i) => sum + i.currentValue, 0)
  const weightedReturn = totalInvested > 0
    ? investments.reduce((sum, i) => sum + (i.currentValue * i.averageNetReturn / 100), 0) / totalInvested
    : 0
  const monthlyReturn = weightedReturn / 12

  // Option A: Invest the extra monthly amount
  let investmentValue = 0
  for (let m = 0; m < months; m++) {
    investmentValue += extraMonthly
    investmentValue *= (1 + monthlyReturn)
  }
  const totalContributed = extraMonthly * months
  const totalEarnings = investmentValue - totalContributed

  // Option B: Pay extra on loans (use avalanche to calculate interest saved)
  const withExtra = calculateAvalanche(loans, extraMonthly)
  const withoutExtra = calculateAvalanche(loans, 0)
  const interestSaved = withoutExtra.totalInterest - withExtra.totalInterest
  const monthsSaved = withoutExtra.totalMonths - withExtra.totalMonths

  const netBenefit = totalEarnings - interestSaved

  return {
    extraMonthly,
    investInstead: {
      totalValueAfterMonths: Math.round(investmentValue),
      totalEarnings: Math.round(totalEarnings),
      monthlyIncome: Math.round(totalInvested * monthlyReturn),
    },
    payLoansInstead: {
      interestSaved: Math.round(interestSaved),
      monthsSaved,
    },
    netBenefit: Math.round(netBenefit),
    recommendation: netBenefit > 0 ? 'invest' : 'pay_loans',
  }
}
