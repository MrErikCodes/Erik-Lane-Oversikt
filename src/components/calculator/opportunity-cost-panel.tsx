'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatNOK, formatPercent } from '@/lib/format'
import { calculateOpportunityCost } from '@/lib/calculations'
import type { Loan, Investment } from '@/lib/types'
import type { OpportunityCostResult } from '@/lib/calculations'

interface OpportunityCostPanelProps {
  loans: Loan[]
  investments: Investment[]
}

export function OpportunityCostPanel({ loans, investments }: OpportunityCostPanelProps) {
  const [extraAmount, setExtraAmount] = useState(2000)
  const [months, setMonths] = useState(60)
  const [result, setResult] = useState<OpportunityCostResult | null>(null)

  const avgReturn = investments.length > 0
    ? investments.reduce((sum, i) => sum + i.averageNetReturn, 0) / investments.length
    : 0

  function handleCalculate() {
    if (extraAmount > 0 && months > 0) {
      setResult(calculateOpportunityCost(loans, investments, extraAmount, months))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alternativkostnad: Investere vs betale ned lån</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sammenlign hva som lønner seg mest: betale ekstra på lån eller investere pengene (gj.snitt {formatPercent(avgReturn)} avkastning)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="ocExtra">Ekstra beløp per måned (kr)</Label>
            <Input id="ocExtra" type="number" min="0" step="500" value={extraAmount || ''} onChange={(e) => setExtraAmount(Number(e.target.value))} />
          </div>
          <div className="w-32">
            <Label htmlFor="ocMonths">Måneder</Label>
            <Input id="ocMonths" type="number" min="1" value={months || ''} onChange={(e) => setMonths(Number(e.target.value))} />
          </div>
          <Button onClick={handleCalculate}>Beregn</Button>
        </div>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className={`p-4 rounded-lg ${result.recommendation === 'invest' ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
              <p className="font-bold text-lg">
                {result.recommendation === 'invest'
                  ? `Investering lønner seg mest! Du tjener ${formatNOK(result.netBenefit)} mer.`
                  : `Nedbetaling lønner seg mest! Du sparer ${formatNOK(Math.abs(result.netBenefit))} mer.`
                }
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Investere {formatNOK(extraAmount)}/mnd</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Totalverdi etter {months} mnd: <strong className="text-green-500">{formatNOK(result.investInstead.totalValueAfterMonths)}</strong></p>
                  <p>Avkastning: <strong className="text-green-500">{formatNOK(result.investInstead.totalEarnings)}</strong></p>
                  <p>Månedlig inntekt nå: <strong>{formatNOK(result.investInstead.monthlyIncome)}</strong></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Betale ned lån med {formatNOK(extraAmount)}/mnd</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Rente spart: <strong>{formatNOK(result.payLoansInstead.interestSaved)}</strong></p>
                  <p>Måneder spart: <strong>{result.payLoansInstead.monthsSaved} mnd</strong></p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {investments.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Legg til investeringer under <a href="/investeringer" className="text-primary underline">Investeringer</a> for å bruke denne kalkulatoren.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
