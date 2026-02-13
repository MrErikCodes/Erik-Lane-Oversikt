'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addPaymentAction } from '@/app/actions'
import { formatNOK } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface PaymentFormProps {
  loans: Loan[]
}

export function PaymentForm({ loans }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [amount, setAmount] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const selectedLoan = loans.find((l) => l.id === selectedLoanId)
  const interest = selectedLoan ? calculateMonthlyInterest(selectedLoan.currentBalance, selectedLoan.nominalInterestRate) : 0
  const fees = selectedLoan?.monthlyFees ?? 0
  const principal = Math.max(0, amount - interest - fees)

  async function handleSubmit(formData: FormData) {
    const result = await addPaymentAction(formData)
    if ('success' in result && result.success) {
      formRef.current?.reset()
      setAmount(0)
      setSelectedLoanId('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle>Registrer betaling</CardTitle></CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="loanId">Velg lån</Label>
            <Select name="loanId" value={selectedLoanId} onValueChange={(v) => {
              setSelectedLoanId(v)
              const loan = loans.find((l) => l.id === v)
              if (loan) setAmount(loan.monthlyPayment)
            }}>
              <SelectTrigger><SelectValue placeholder="Velg et lån" /></SelectTrigger>
              <SelectContent>
                {loans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — Saldo: {formatNOK(l.currentBalance)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Beløp (kr)</Label>
            <Input id="amount" name="amount" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} required />
          </div>
          <div>
            <Label htmlFor="date">Dato</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isExtraPayment" name="isExtraPayment" value="true" />
            <Label htmlFor="isExtraPayment">Ekstra innbetaling</Label>
          </div>
          {selectedLoan && amount > 0 && (
            <div className="bg-muted rounded-md p-4 space-y-1 text-sm">
              <p>Rente: <strong>{formatNOK(interest, true)}</strong></p>
              <p>Gebyrer: <strong>{formatNOK(fees)}</strong></p>
              <p>Avdrag (nedbetaling): <strong>{formatNOK(principal, true)}</strong></p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={!selectedLoanId}>Registrer betaling</Button>
          {submitted && <p className="text-green-500 text-sm text-center">Betaling registrert!</p>}
        </form>
      </CardContent>
    </Card>
  )
}
