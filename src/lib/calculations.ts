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

export function calculatePayoffComparison(loans: Loan[], extraMonthly: number, excludeIds: string[] = []): PayoffComparison {
  const activeLoans = loans.filter((l) => !excludeIds.includes(l.id))
  return {
    snowball: calculateSnowball(activeLoans, extraMonthly),
    avalanche: calculateAvalanche(activeLoans, extraMonthly),
    minimumOnly: runStrategy(activeLoans, 0, activeLoans.map((l) => l.id)),
  }
}

export interface WealthSnapshot {
  month: number
  investWealth: number
  payThenInvestWealth: number
}

export interface WealthComparisonResult {
  extraMonthly: number
  horizon: number
  investOnly: {
    portfolioValue: number
    targetInterestPaid: number
  }
  payThenInvest: {
    portfolioValue: number
    targetInterestPaid: number
    targetsPaidOffMonth: number
    freedMonthlyAfterPayoff: number
  }
  interestSaved: number
  netBenefit: number // positive = payThenInvest creates more wealth
  recommendation: 'invest' | 'pay_loans'
  timeline: WealthSnapshot[]
}

function simulateScenario(
  targetLoans: Loan[],
  extraMonthly: number,
  monthlyReturn: number,
  payDownTargets: boolean,
  horizon: number
) {
  const balances = new Map<string, number>()
  const rates = new Map<string, number>()
  const mins = new Map<string, number>()
  const loanFees = new Map<string, number>()

  for (const loan of targetLoans) {
    balances.set(loan.id, loan.currentBalance)
    rates.set(loan.id, loan.nominalInterestRate)
    mins.set(loan.id, loan.monthlyPayment)
    loanFees.set(loan.id, loan.monthlyFees)
  }

  // Target loans in avalanche order (highest rate first)
  const targetOrder = targetLoans
    .slice()
    .sort((a, b) => b.nominalInterestRate - a.nominalInterestRate)
    .map((l) => l.id)

  let portfolio = 0
  let targetInterest = 0
  let targetsPaidOffMonth = 0
  const snapshots: { month: number; portfolio: number }[] = []

  for (let month = 1; month <= horizon; month++) {
    let toInvest = extraMonthly

    // Pay minimums on target loans; freed payments add to investable
    for (const loan of targetLoans) {
      const bal = balances.get(loan.id)!
      if (bal <= 0.01) {
        toInvest += mins.get(loan.id)!
        continue
      }
      const rate = rates.get(loan.id)!
      const fee = loanFees.get(loan.id)!
      const interest = calculateMonthlyInterest(bal, rate)
      targetInterest += interest
      const pmt = Math.min(mins.get(loan.id)!, bal + interest + fee)
      const principal = Math.max(0, pmt - interest - fee)
      balances.set(loan.id, Math.max(0, bal - principal))
    }

    // If paying down targets: apply investable to loans first (avalanche)
    if (payDownTargets) {
      let budget = toInvest
      toInvest = 0
      for (const id of targetOrder) {
        if (budget <= 0) break
        const bal = balances.get(id)!
        if (bal <= 0.01) continue
        const extra = Math.min(budget, bal)
        balances.set(id, Math.max(0, bal - extra))
        budget -= extra
      }
      toInvest = budget // leftover goes to investments
    }

    // Track when all target loans are paid off
    if (targetsPaidOffMonth === 0 && targetOrder.every((id) => (balances.get(id) ?? 0) <= 0.01)) {
      targetsPaidOffMonth = month
    }

    // Invest
    portfolio += toInvest
    portfolio *= (1 + monthlyReturn)

    if (month % 6 === 0 || month === horizon || month <= 12) {
      snapshots.push({ month, portfolio })
    }
  }

  const freedMonthly = targetLoans.reduce((sum, l) => sum + l.monthlyPayment, 0) + extraMonthly
  return { portfolio, targetInterest, targetsPaidOffMonth, freedMonthly, snapshots }
}

export function calculateWealthComparison(
  loans: Loan[],
  investments: Investment[],
  extraMonthly: number,
  excludeLoanIds: string[] = [],
  customHorizon?: number
): WealthComparisonResult {
  // Weighted average investment return
  const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0)
  const weightedReturn = totalValue > 0
    ? investments.reduce((sum, i) => sum + (i.currentValue * i.averageNetReturn / 100), 0) / totalValue
    : 0
  const monthlyReturn = weightedReturn / 12

  // Only simulate target loans — non-target loans behave the same in both scenarios
  const targetLoans = loans.filter((l) => !excludeLoanIds.includes(l.id))

  // Default horizon: max natural payoff time of target loans
  const maxTargetPayoff = targetLoans.reduce((max, l) => Math.max(max, l.remainingTermMonths), 0)
  const horizon = customHorizon ?? maxTargetPayoff

  // Scenario A: Invest extra directly, target loans pay off naturally
  const scenarioA = simulateScenario(targetLoans, extraMonthly, monthlyReturn, false, horizon)

  // Scenario B: Pay down target loans first, then invest everything
  const scenarioB = simulateScenario(targetLoans, extraMonthly, monthlyReturn, true, horizon)

  const netBenefit = scenarioB.portfolio - scenarioA.portfolio
  const interestSaved = Math.round(scenarioA.targetInterest - scenarioB.targetInterest)

  // Build merged timeline
  const allMonths = new Set<number>()
  for (const s of scenarioA.snapshots) allMonths.add(s.month)
  for (const s of scenarioB.snapshots) allMonths.add(s.month)
  const sortedMonths = [...allMonths].sort((a, b) => a - b)

  const aMap = new Map(scenarioA.snapshots.map((s) => [s.month, s.portfolio]))
  const bMap = new Map(scenarioB.snapshots.map((s) => [s.month, s.portfolio]))

  const timeline: WealthSnapshot[] = sortedMonths.map((m) => ({
    month: m,
    investWealth: aMap.get(m) ?? 0,
    payThenInvestWealth: bMap.get(m) ?? 0,
  }))

  return {
    extraMonthly,
    horizon,
    investOnly: {
      portfolioValue: Math.round(scenarioA.portfolio),
      targetInterestPaid: Math.round(scenarioA.targetInterest),
    },
    payThenInvest: {
      portfolioValue: Math.round(scenarioB.portfolio),
      targetInterestPaid: Math.round(scenarioB.targetInterest),
      targetsPaidOffMonth: scenarioB.targetsPaidOffMonth,
      freedMonthlyAfterPayoff: scenarioB.freedMonthly,
    },
    interestSaved,
    netBenefit: Math.round(netBenefit),
    recommendation: netBenefit > 0 ? 'pay_loans' : 'invest',
    timeline,
  }
}

// Optimal plan: month-by-month simulation combining loan payoff + investing

export interface OptimalPlanMonth {
  month: number
  date: string
  loanPayments: Map<string, number> // total paid per loan this month (min + extra)
  loanBalances: Map<string, number>
  toFundingPartner: number
  totalDebt: number
  investmentPortfolio: number
  totalInterestPaid: number
  netWealth: number
  events: string[]
}

export interface OptimalPlanResult {
  months: OptimalPlanMonth[] // EVERY month
  summary: {
    totalInterestPaid: number
    totalInvested: number
    finalPortfolio: number
    finalDebt: number
    finalNetWealth: number
    milestones: { month: number; date: string; event: string }[]
  }
  horizon: number
}

export function calculateOptimalPlan(
  loans: Loan[],
  investments: Investment[],
  extraMonthly: number,
  payoffOrder: string[], // loan IDs in desired payoff priority
  autopilotIds: string[], // loans that only get minimums (e.g. studielån)
  horizon: number
): OptimalPlanResult {
  const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0)
  const weightedReturn = totalValue > 0
    ? investments.reduce((sum, i) => sum + (i.currentValue * i.averageNetReturn / 100), 0) / totalValue
    : 0
  const monthlyReturn = weightedReturn / 12

  const balances = new Map<string, number>()
  const rates = new Map<string, number>()
  const mins = new Map<string, number>()
  const loanFeesMap = new Map<string, number>()

  for (const loan of loans) {
    balances.set(loan.id, loan.currentBalance)
    rates.set(loan.id, loan.nominalInterestRate)
    mins.set(loan.id, loan.monthlyPayment)
    loanFeesMap.set(loan.id, loan.monthlyFees)
  }

  const autopilotSet = new Set(autopilotIds)
  // Start portfolio from existing investment value — it compounds from day one
  let portfolio = investments.reduce((sum, i) => sum + i.currentValue, 0)
  let totalInterestPaid = 0
  let totalInvested = 0
  const months: OptimalPlanMonth[] = []
  const milestones: { month: number; date: string; event: string }[] = []
  const now = new Date()
  const paidOff = new Set<string>()

  for (let month = 1; month <= horizon; month++) {
    const events: string[] = []
    const loanPayments = new Map<string, number>()
    let budget = extraMonthly

    // Pay minimums on all active loans
    for (const loan of loans) {
      const bal = balances.get(loan.id)!
      if (bal <= 0.01) {
        budget += mins.get(loan.id)!
        loanPayments.set(loan.id, 0)
        continue
      }
      const rate = rates.get(loan.id)!
      const fee = loanFeesMap.get(loan.id)!
      const interest = calculateMonthlyInterest(bal, rate)
      totalInterestPaid += interest
      const pmt = Math.min(mins.get(loan.id)!, bal + interest + fee)
      const principal = Math.max(0, pmt - interest - fee)
      balances.set(loan.id, Math.max(0, bal - principal))
      loanPayments.set(loan.id, pmt)
    }

    // Apply extra to payoff order (skip autopilot loans)
    for (const id of payoffOrder) {
      if (budget <= 0) break
      if (autopilotSet.has(id)) continue
      const bal = balances.get(id)!
      if (bal <= 0.01) continue
      const extra = Math.min(budget, bal)
      balances.set(id, Math.max(0, bal - extra))
      budget -= extra
      loanPayments.set(id, (loanPayments.get(id) ?? 0) + extra)
    }

    // Check for newly paid-off loans
    for (const loan of loans) {
      if (!paidOff.has(loan.id) && (balances.get(loan.id) ?? 0) <= 0.01) {
        paidOff.add(loan.id)
        const d = new Date(now.getFullYear(), now.getMonth() + month, 1)
        const dateStr = d.toISOString().split('T')[0]
        events.push(`${loan.name} nedbetalt!`)
        milestones.push({ month, date: dateStr, event: `${loan.name} nedbetalt` })
      }
    }

    // Invest remaining budget
    portfolio += budget
    totalInvested += budget
    portfolio *= (1 + monthlyReturn)

    const totalDebt = Array.from(balances.values()).reduce((a, b) => a + b, 0)
    const date = new Date(now.getFullYear(), now.getMonth() + month, 1).toISOString().split('T')[0]

    months.push({
      month,
      date,
      loanPayments,
      loanBalances: new Map(balances),
      toFundingPartner: budget,
      totalDebt,
      investmentPortfolio: portfolio,
      totalInterestPaid,
      netWealth: portfolio - totalDebt,
      events,
    })
  }

  const finalDebt = Array.from(balances.values()).reduce((a, b) => a + b, 0)

  return {
    months,
    summary: {
      totalInterestPaid: Math.round(totalInterestPaid),
      totalInvested: Math.round(totalInvested),
      finalPortfolio: Math.round(portfolio),
      finalDebt: Math.round(finalDebt),
      finalNetWealth: Math.round(portfolio - finalDebt),
      milestones,
    },
    horizon,
  }
}
