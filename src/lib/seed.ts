import { createLoan, getDb } from './db'

const realLoans = [
  {
    name: 'Boliglån',
    type: 'housing' as const,
    lender: 'Nordea',
    loanNumber: '6006.82.18600',
    originalAmount: 2110000,
    currentBalance: 2086547,
    nominalInterestRate: 4.79,
    effectiveInterestRate: 4.95,
    monthlyFees: 65,
    monthlyPayment: 11126,
    remainingTermMonths: 351,
    originationDate: '2025-05-05',
    paymentDueDay: 5,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 4,
  },
  {
    name: 'Billån',
    type: 'car' as const,
    lender: 'DNB',
    loanNumber: 'EN48854',
    originalAmount: 625770.68,
    currentBalance: 578082.91,
    nominalInterestRate: 0,
    effectiveInterestRate: 0,
    monthlyFees: 95,
    monthlyPayment: 5302,
    remainingTermMonths: 111,
    originationDate: '2025-05-08',
    paymentDueDay: 8,
    fixedRateTermsRemaining: 27,
    rateAfterFixedPeriod: null,
    priority: 3,
  },
  {
    name: 'Studielån',
    type: 'student' as const,
    lender: 'Lånekassen',
    loanNumber: '',
    originalAmount: 82664.04,
    currentBalance: 82664.04,
    nominalInterestRate: 4.698,
    effectiveInterestRate: 4.897,
    monthlyFees: 0,
    monthlyPayment: 1569,
    remainingTermMonths: 58,
    originationDate: '2024-03-16',
    paymentDueDay: 5,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 9999,
  },
  {
    name: 'Forbrukslån',
    type: 'consumer' as const,
    lender: 'Resurs Bank',
    loanNumber: '',
    originalAmount: 46270.53,
    currentBalance: 53435.53,
    nominalInterestRate: 0,
    effectiveInterestRate: 13.4,
    monthlyFees: 0,
    monthlyPayment: 1517,
    remainingTermMonths: 37,
    originationDate: '2025-12-01',
    paymentDueDay: 1,
    fixedRateTermsRemaining: 0,
    rateAfterFixedPeriod: null,
    priority: 1,
  },
]

async function seed() {
  const db = await getDb()
  db.data.loans = []
  await db.write()
  console.log('Cleared existing loans')

  for (const loan of realLoans) {
    await createLoan(loan)
    console.log(`Created: ${loan.name}`)
  }
  console.log('Seed complete!')
}

seed()
