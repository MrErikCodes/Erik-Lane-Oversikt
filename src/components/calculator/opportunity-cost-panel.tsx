'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatNOK, formatPercent } from '@/lib/format'
import { calculateWealthComparison } from '@/lib/calculations'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Loan, Investment } from '@/lib/types'
import type { WealthComparisonResult } from '@/lib/calculations'

interface OpportunityCostPanelProps {
  loans: Loan[]
  investments: Investment[]
}

function formatMonths(m: number) {
  const years = Math.floor(m / 12)
  const months = m % 12
  if (years === 0) return `${months} mnd`
  if (months === 0) return `${years} år`
  return `${years} år ${months} mnd`
}

export function OpportunityCostPanel({ loans, investments }: OpportunityCostPanelProps) {
  const [extraAmount, setExtraAmount] = useState(2000)
  const [horizon, setHorizon] = useState<number | undefined>(undefined)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => {
    return new Set(loans.filter((l) => l.priority >= 9999).map((l) => l.id))
  })
  const [result, setResult] = useState<WealthComparisonResult | null>(null)

  const avgReturn = investments.length > 0
    ? investments.reduce((sum, i) => sum + i.averageNetReturn, 0) / investments.length
    : 0

  function handleCalculate() {
    if (extraAmount > 0) {
      setResult(calculateWealthComparison(loans, investments, extraAmount, [...excludedIds], horizon))
    }
  }

  function toggleExclude(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setResult(null)
  }

  const targetLoans = loans.filter((l) => !excludedIds.has(l.id))
  const targetPayment = targetLoans.reduce((sum, l) => sum + l.monthlyPayment, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betal ned lån, så invester alt</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sammenlign: investere {formatPercent(avgReturn)} avkastning direkte, eller betal ned valgte lån først og invester frigjorte betalinger etterpå?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Hvilke lån skal nedbetales først?</Label>
          <div className="flex flex-wrap gap-2">
            {loans.map((loan) => {
              const isTarget = !excludedIds.has(loan.id)
              return (
                <button
                  key={loan.id}
                  onClick={() => toggleExclude(loan.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                    isTarget
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {loan.name} ({formatPercent(loan.nominalInterestRate)})
                </button>
              )
            })}
          </div>
          {targetLoans.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Frigjør {formatNOK(targetPayment)}/mnd etter nedbetaling
            </p>
          )}
          {targetLoans.length === 0 && (
            <p className="text-sm text-yellow-500 mt-1">Velg minst ett lån</p>
          )}
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="ocExtra">Ekstra per måned (kr)</Label>
            <Input id="ocExtra" type="number" min="0" step="500" value={extraAmount || ''} onChange={(e) => setExtraAmount(Number(e.target.value))} />
          </div>
          <div className="w-40">
            <Label htmlFor="ocHorizon">Tidshorisont (mnd)</Label>
            <Input id="ocHorizon" type="number" min="12" step="12" placeholder="Auto" value={horizon ?? ''} onChange={(e) => setHorizon(e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <Button onClick={handleCalculate} disabled={targetLoans.length === 0}>Beregn</Button>
        </div>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className={`p-4 rounded-lg ${result.recommendation === 'pay_loans' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
              <p className="font-bold text-lg">
                {result.recommendation === 'pay_loans'
                  ? `Betal ned først! ${formatNOK(result.netBenefit)} mer i portefølje.`
                  : `Invester direkte! ${formatNOK(Math.abs(result.netBenefit))} mer i portefølje.`
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sammenlignet over {formatMonths(result.horizon)} — kun valgte lån
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-500">A: Invester {formatNOK(extraAmount)}/mnd direkte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Investerer {formatNOK(extraAmount)}/mnd fra dag 1</p>
                  <p>Lån nedbetalt naturlig: <strong>{formatMonths(targetLoans.reduce((max, l) => Math.max(max, l.remainingTermMonths), 0))}</strong></p>
                  <p>Etter nedbetaling: investerer {formatNOK(targetPayment + extraAmount)}/mnd</p>
                  <p className="pt-2 border-t">Portefølje: <strong className="text-green-500">{formatNOK(result.investOnly.portfolioValue)}</strong></p>
                  {result.investOnly.targetInterestPaid > 0 && (
                    <p>Rente betalt: <strong className="text-red-400">{formatNOK(result.investOnly.targetInterestPaid)}</strong></p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-500">B: Betal ned lån, så invester</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Betaler {formatNOK(targetPayment + extraAmount)}/mnd på lån</p>
                  <p>Lån nedbetalt: <strong>{formatMonths(result.payThenInvest.targetsPaidOffMonth)}</strong></p>
                  <p>Etter nedbetaling: investerer {formatNOK(result.payThenInvest.freedMonthlyAfterPayoff)}/mnd</p>
                  <p className="pt-2 border-t">Portefølje: <strong className="text-green-500">{formatNOK(result.payThenInvest.portfolioValue)}</strong></p>
                  {result.payThenInvest.targetInterestPaid > 0 && (
                    <p>Rente betalt: <strong className="text-red-400">{formatNOK(result.payThenInvest.targetInterestPaid)}</strong></p>
                  )}
                  {result.interestSaved > 0 && (
                    <p>Rente spart: <strong className="text-green-500">{formatNOK(result.interestSaved)}</strong></p>
                  )}
                </CardContent>
              </Card>
            </div>

            {result.interestSaved === 0 && (
              <p className="text-xs text-muted-foreground">
                Valgte lån er rentefrie — forskjellen skyldes kun tidspunktet for investering.
              </p>
            )}

            {result.timeline.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Porteføljeverdi over tid</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={result.timeline}>
                      <XAxis
                        dataKey="month"
                        stroke="#888"
                        fontSize={12}
                        tickFormatter={(m) => `${Math.floor(m / 12)}å`}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        labelFormatter={(m) => `Måned ${m} (${formatMonths(Number(m))})`}
                        formatter={(value) => formatNOK(Number(value))}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="investWealth" name="Invester direkte" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="payThenInvestWealth" name="Betal ned, så invester" stroke="hsl(220, 70%, 50%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
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
