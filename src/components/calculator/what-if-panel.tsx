'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatNOK, formatMonths } from '@/lib/format'
import { calculatePayoffComparison } from '@/lib/calculations'
import type { Loan } from '@/lib/types'
import type { PayoffComparison } from '@/lib/calculations'

interface WhatIfPanelProps {
  loans: Loan[]
  baseComparison: PayoffComparison
}

export function WhatIfPanel({ loans, baseComparison }: WhatIfPanelProps) {
  const [extraAmount, setExtraAmount] = useState(0)
  const [result, setResult] = useState<PayoffComparison | null>(null)

  function handleCalculate() {
    if (extraAmount > 0) {
      setResult(calculatePayoffComparison(loans, extraAmount))
    }
  }

  const base = baseComparison.minimumOnly

  return (
    <Card>
      <CardHeader><CardTitle>Hva-hvis kalkulator</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="extraAmount">Ekstra månedlig beløp (kr)</Label>
            <Input id="extraAmount" type="number" min="0" step="500" value={extraAmount || ''} onChange={(e) => setExtraAmount(Number(e.target.value))} placeholder="F.eks. 2000" />
          </div>
          <Button onClick={handleCalculate}>Beregn</Button>
        </div>
        {result && (
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div>
              <h3 className="font-medium mb-3">Med {formatNOK(extraAmount)} ekstra/mnd (Skred)</h3>
              <div className="space-y-2 text-sm">
                <p>Gjeldsfri om: <strong>{formatMonths(result.avalanche.totalMonths)}</strong></p>
                <p>Total rente: <strong>{formatNOK(result.avalanche.totalInterest)}</strong></p>
                <p>Gjeldsfri dato: <strong>{result.avalanche.debtFreeDate}</strong></p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Besparelse</h3>
              <div className="space-y-2 text-sm">
                <p>Måneder spart: <strong className="text-green-500">{base.totalMonths - result.avalanche.totalMonths} mnd</strong></p>
                <p>Rente spart: <strong className="text-green-500">{formatNOK(base.totalInterest - result.avalanche.totalInterest)}</strong></p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
