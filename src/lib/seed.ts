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
