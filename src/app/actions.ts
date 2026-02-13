'use server'

import { revalidatePath } from 'next/cache'
import {
  createLoan,
  updateLoan,
  deleteLoan,
  createPayment,
  createScenario,
  deleteScenario,
  getLoan,
  createRateChange,
} from '@/lib/db'
import { loanSchema, paymentSchema, scenarioSchema, rateChangeSchema } from '@/lib/schemas'
import { calculateMonthlyInterest } from '@/lib/calculations'

export async function addLoanAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    lender: formData.get('lender') as string,
    loanNumber: formData.get('loanNumber') as string,
    originalAmount: Number(formData.get('originalAmount')),
    currentBalance: Number(formData.get('currentBalance')),
    nominalInterestRate: Number(formData.get('nominalInterestRate')),
    effectiveInterestRate: Number(formData.get('effectiveInterestRate')),
    monthlyFees: Number(formData.get('monthlyFees')),
    monthlyPayment: Number(formData.get('monthlyPayment')),
    remainingTermMonths: Number(formData.get('remainingTermMonths')),
    originationDate: formData.get('originationDate') as string,
    paymentDueDay: Number(formData.get('paymentDueDay')),
    fixedRateTermsRemaining: Number(formData.get('fixedRateTermsRemaining') || 0),
    rateAfterFixedPeriod: formData.get('rateAfterFixedPeriod') ? Number(formData.get('rateAfterFixedPeriod')) : null,
    priority: Number(formData.get('priority')),
  }
  const parsed = loanSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await createLoan(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  return { success: true }
}

export async function updateLoanAction(id: string, formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    lender: formData.get('lender') as string,
    loanNumber: formData.get('loanNumber') as string,
    originalAmount: Number(formData.get('originalAmount')),
    currentBalance: Number(formData.get('currentBalance')),
    nominalInterestRate: Number(formData.get('nominalInterestRate')),
    effectiveInterestRate: Number(formData.get('effectiveInterestRate')),
    monthlyFees: Number(formData.get('monthlyFees')),
    monthlyPayment: Number(formData.get('monthlyPayment')),
    remainingTermMonths: Number(formData.get('remainingTermMonths')),
    originationDate: formData.get('originationDate') as string,
    paymentDueDay: Number(formData.get('paymentDueDay')),
    fixedRateTermsRemaining: Number(formData.get('fixedRateTermsRemaining') || 0),
    rateAfterFixedPeriod: formData.get('rateAfterFixedPeriod') ? Number(formData.get('rateAfterFixedPeriod')) : null,
    priority: Number(formData.get('priority')),
  }
  const parsed = loanSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await updateLoan(id, parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${id}`)
  return { success: true }
}

export async function deleteLoanAction(id: string) {
  await deleteLoan(id)
  revalidatePath('/')
  revalidatePath('/lan')
  return { success: true }
}

export async function addPaymentAction(formData: FormData) {
  const loanId = formData.get('loanId') as string
  const amount = Number(formData.get('amount'))
  const date = formData.get('date') as string
  const isExtraPayment = formData.get('isExtraPayment') === 'true'
  const loan = await getLoan(loanId)
  if (!loan) return { error: 'L\u00e5n ikke funnet' }
  const interest = calculateMonthlyInterest(loan.currentBalance, loan.nominalInterestRate)
  const fees = loan.monthlyFees
  const principal = Math.max(0, amount - interest - fees)
  const raw = { loanId, date, amount, principal, interest, fees, isExtraPayment }
  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await createPayment(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${loanId}`)
  revalidatePath('/historikk')
  return { success: true }
}

export async function addScenarioAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    strategy: formData.get('strategy') as string,
    extraMonthlyPayment: Number(formData.get('extraMonthlyPayment')),
    customOrder: JSON.parse((formData.get('customOrder') as string) || '[]'),
  }
  const parsed = scenarioSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await createScenario(parsed.data)
  revalidatePath('/kalkulator')
  return { success: true }
}

export async function deleteScenarioAction(id: string) {
  await deleteScenario(id)
  revalidatePath('/kalkulator')
  return { success: true }
}

export async function addRateChangeAction(formData: FormData) {
  const loanId = formData.get('loanId') as string
  const loan = await getLoan(loanId)
  if (!loan) return { error: 'L\u00e5n ikke funnet' }
  const raw = {
    loanId,
    date: formData.get('date') as string,
    oldNominalRate: loan.nominalInterestRate,
    newNominalRate: Number(formData.get('newNominalRate')),
    oldEffectiveRate: loan.effectiveInterestRate,
    newEffectiveRate: Number(formData.get('newEffectiveRate')),
    reason: (formData.get('reason') as string) || '',
  }
  const parsed = rateChangeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await createRateChange(parsed.data)
  revalidatePath('/')
  revalidatePath('/lan')
  revalidatePath(`/lan/${loanId}`)
  return { success: true }
}
