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
