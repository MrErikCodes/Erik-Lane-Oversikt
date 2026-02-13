import { describe, it, expect } from 'vitest'
import { formatNOK, formatPercent, formatDate, formatMonths, loanTypeLabel } from '../format'

describe('formatNOK', () => {
  it('formats currency with kr', () => {
    const result = formatNOK(1234567)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
    expect(result).toContain('kr')
  })
  it('formats zero', () => {
    expect(formatNOK(0)).toContain('0')
  })
})

describe('formatPercent', () => {
  it('formats percentage', () => {
    expect(formatPercent(4.5)).toBe('4,50 %')
  })
})

describe('formatDate', () => {
  it('formats ISO date to Norwegian format', () => {
    const result = formatDate('2026-02-13')
    expect(result).toContain('13')
    expect(result).toContain('2026')
  })
})

describe('formatMonths', () => {
  it('formats months into years and months', () => {
    expect(formatMonths(25)).toBe('2 år 1 mnd')
  })
  it('formats exact years', () => {
    expect(formatMonths(24)).toBe('2 år 0 mnd')
  })
  it('formats less than a year', () => {
    expect(formatMonths(5)).toBe('0 år 5 mnd')
  })
})

describe('loanTypeLabel', () => {
  it('returns Norwegian labels', () => {
    expect(loanTypeLabel('housing')).toBe('Boliglån')
    expect(loanTypeLabel('car')).toBe('Billån')
    expect(loanTypeLabel('consumer')).toBe('Forbrukslån')
    expect(loanTypeLabel('student')).toBe('Studielån')
  })
})
