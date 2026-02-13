'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addInvestmentAction, updateInvestmentAction } from '@/app/actions'
import type { Investment } from '@/lib/types'

interface InvestmentFormProps {
  investment?: Investment
  trigger?: React.ReactNode
}

export function InvestmentForm({ investment, trigger }: InvestmentFormProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = !!investment

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateInvestmentAction(investment!.id, formData)
      : await addInvestmentAction(formData)
    if ('success' in result && result.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>{isEdit ? 'Rediger' : 'Legg til investering'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger investering' : 'Legg til investering'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Navn</Label>
            <Input id="name" name="name" defaultValue={investment?.name} placeholder="F.eks. FundingPartner Portefølje" required />
          </div>
          <div>
            <Label htmlFor="platform">Plattform</Label>
            <Input id="platform" name="platform" defaultValue={investment?.platform} placeholder="F.eks. FundingPartner" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalInvested">Totalt investert (kr)</Label>
              <Input id="totalInvested" name="totalInvested" type="number" defaultValue={investment?.totalInvested} required />
            </div>
            <div>
              <Label htmlFor="currentValue">Nåværende verdi (kr)</Label>
              <Input id="currentValue" name="currentValue" type="number" defaultValue={investment?.currentValue} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="averageNetReturn">Gj.snitt nettorente (%)</Label>
              <Input id="averageNetReturn" name="averageNetReturn" type="number" step="0.01" defaultValue={investment?.averageNetReturn} required />
            </div>
            <div>
              <Label htmlFor="activeLoansCount">Antall aktive lån</Label>
              <Input id="activeLoansCount" name="activeLoansCount" type="number" min="0" defaultValue={investment?.activeLoansCount ?? 0} required />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notater</Label>
            <Input id="notes" name="notes" defaultValue={investment?.notes} placeholder="Valgfrie notater" />
          </div>
          <Button type="submit" className="w-full">
            {isEdit ? 'Lagre endringer' : 'Legg til'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
