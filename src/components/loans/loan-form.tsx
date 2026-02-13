'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { addLoanAction, updateLoanAction } from '@/app/actions'
import type { Loan } from '@/lib/types'

interface LoanFormProps {
  loan?: Loan
  trigger?: React.ReactNode
}

export function LoanForm({ loan, trigger }: LoanFormProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = !!loan

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateLoanAction(loan!.id, formData)
      : await addLoanAction(formData)
    if ('success' in result && result.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>{isEdit ? 'Rediger' : 'Legg til lån'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger lån' : 'Legg til nytt lån'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Lånenavn</Label>
            <Input id="name" name="name" defaultValue={loan?.name} required />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={loan?.type || 'consumer'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="housing">Boliglån</SelectItem>
                <SelectItem value="car">Billån</SelectItem>
                <SelectItem value="consumer">Forbrukslån</SelectItem>
                <SelectItem value="student">Studielån</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="lender">Långiver</Label>
            <Input id="lender" name="lender" defaultValue={loan?.lender} required />
          </div>
          <div>
            <Label htmlFor="loanNumber">Lånenummer</Label>
            <Input id="loanNumber" name="loanNumber" defaultValue={loan?.loanNumber} />
          </div>
          <div>
            <Label htmlFor="originalAmount">Opprinnelig beløp (kr)</Label>
            <Input id="originalAmount" name="originalAmount" type="number" defaultValue={loan?.originalAmount} required />
          </div>
          <div>
            <Label htmlFor="currentBalance">Nåværende saldo (kr)</Label>
            <Input id="currentBalance" name="currentBalance" type="number" defaultValue={loan?.currentBalance} required />
          </div>
          <div>
            <Label htmlFor="nominalInterestRate">Nominell rente (%)</Label>
            <Input id="nominalInterestRate" name="nominalInterestRate" type="number" step="0.01" defaultValue={loan?.nominalInterestRate} required />
          </div>
          <div>
            <Label htmlFor="effectiveInterestRate">Effektiv rente (%)</Label>
            <Input id="effectiveInterestRate" name="effectiveInterestRate" type="number" step="0.01" defaultValue={loan?.effectiveInterestRate} required />
          </div>
          <div>
            <Label htmlFor="monthlyFees">Månedlige gebyrer (kr)</Label>
            <Input id="monthlyFees" name="monthlyFees" type="number" defaultValue={loan?.monthlyFees ?? 0} required />
          </div>
          <div>
            <Label htmlFor="monthlyPayment">Månedlig betaling (kr)</Label>
            <Input id="monthlyPayment" name="monthlyPayment" type="number" defaultValue={loan?.monthlyPayment} required />
          </div>
          <div>
            <Label htmlFor="remainingTermMonths">Gjenstående måneder</Label>
            <Input id="remainingTermMonths" name="remainingTermMonths" type="number" defaultValue={loan?.remainingTermMonths} required />
          </div>
          <div>
            <Label htmlFor="originationDate">Startdato</Label>
            <Input id="originationDate" name="originationDate" type="date" defaultValue={loan?.originationDate} required />
          </div>
          <div>
            <Label htmlFor="paymentDueDay">Forfallsdag</Label>
            <Input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="31" defaultValue={loan?.paymentDueDay ?? 15} required />
          </div>
          <div>
            <Label htmlFor="fixedRateTermsRemaining">Fastrenteperiode (mnd gjenstående)</Label>
            <Input id="fixedRateTermsRemaining" name="fixedRateTermsRemaining" type="number" min="0" defaultValue={loan?.fixedRateTermsRemaining ?? 0} />
          </div>
          <div>
            <Label htmlFor="rateAfterFixedPeriod">Rente etter fastperiode (%)</Label>
            <Input id="rateAfterFixedPeriod" name="rateAfterFixedPeriod" type="number" step="0.01" defaultValue={loan?.rateAfterFixedPeriod ?? ''} placeholder="La stå tom hvis ukjent" />
          </div>
          <div>
            <Label htmlFor="priority">Prioritet</Label>
            <Input id="priority" name="priority" type="number" min="1" defaultValue={loan?.priority ?? 1} required />
          </div>
          <div className="col-span-2">
            <Button type="submit" className="w-full">
              {isEdit ? 'Lagre endringer' : 'Legg til lån'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
