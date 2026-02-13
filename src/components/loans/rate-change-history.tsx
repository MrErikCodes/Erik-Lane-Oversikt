'use client'

import { useRef, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatPercent, formatDate } from '@/lib/format'
import { addRateChangeAction } from '@/app/actions'
import type { RateChange } from '@/lib/types'
import { TrendingUp } from 'lucide-react'

interface RateChangeHistoryProps {
  rateChanges: RateChange[]
  loanId: string
}

export function RateChangeHistory({ rateChanges, loanId }: RateChangeHistoryProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const sorted = [...rateChanges].sort((a, b) => b.date.localeCompare(a.date))

  async function handleSubmit(formData: FormData) {
    const result = await addRateChangeAction(formData)
    if ('success' in result && result.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rentehistorikk
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Registrer renteendring</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrer renteendring</DialogTitle></DialogHeader>
            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <input type="hidden" name="loanId" value={loanId} />
              <div>
                <Label htmlFor="date">Dato for endring</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <Label htmlFor="newNominalRate">Ny nominell rente (%)</Label>
                <Input id="newNominalRate" name="newNominalRate" type="number" step="0.01" required />
              </div>
              <div>
                <Label htmlFor="newEffectiveRate">Ny effektiv rente (%)</Label>
                <Input id="newEffectiveRate" name="newEffectiveRate" type="number" step="0.01" required />
              </div>
              <div>
                <Label htmlFor="reason">Årsak</Label>
                <Input id="reason" name="reason" placeholder="F.eks. Norges Bank renteheving" />
              </div>
              <Button type="submit" className="w-full">Lagre</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Ingen renteendringer registrert.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead className="text-right">Gammel nominell</TableHead>
                <TableHead className="text-right">Ny nominell</TableHead>
                <TableHead className="text-right">Gammel effektiv</TableHead>
                <TableHead className="text-right">Ny effektiv</TableHead>
                <TableHead>Årsak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>{formatDate(rc.date)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.oldNominalRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.newNominalRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.oldEffectiveRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rc.newEffectiveRate)}</TableCell>
                  <TableCell>{rc.reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
