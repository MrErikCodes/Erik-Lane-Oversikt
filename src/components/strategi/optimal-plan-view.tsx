'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNOK, formatPercent } from '@/lib/format'
import { calculateOptimalPlan } from '@/lib/calculations'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Loan, Investment } from '@/lib/types'
import type { OptimalPlanResult } from '@/lib/calculations'

interface OptimalPlanViewProps {
  loans: Loan[]
  investments: Investment[]
}

function fmt(m: number) {
  const y = Math.floor(m / 12)
  const mo = m % 12
  if (y === 0) return `${mo} mnd`
  if (mo === 0) return `${y} år`
  return `${y}å ${mo}m`
}

export function OptimalPlanView({ loans, investments }: OptimalPlanViewProps) {
  const avgReturn = investments.length > 0
    ? investments.reduce((sum, i) => sum + i.averageNetReturn, 0) / investments.length
    : 0

  // Auto-categorize loans
  const autoMinimumIds = useMemo(() => {
    const ids = new Set<string>()
    for (const loan of loans) {
      // Priority 9999 = user says minimum only
      if (loan.priority >= 9999) ids.add(loan.id)
      // If investment return > loan rate, investing is smarter → minimum only
      if (loan.nominalInterestRate > 0 && loan.nominalInterestRate < avgReturn) ids.add(loan.id)
    }
    return ids
  }, [loans, avgReturn])

  const [minimumOnlyIds, setMinimumOnlyIds] = useState<Set<string>>(autoMinimumIds)

  const aggressiveLoans = loans.filter((l) => !minimumOnlyIds.has(l.id))
  const minimumLoans = loans.filter((l) => minimumOnlyIds.has(l.id))

  // Default order: smallest balance first among aggressive loans
  const [payoffOrder, setPayoffOrder] = useState<string[]>(
    aggressiveLoans.sort((a, b) => a.currentBalance - b.currentBalance).map((l) => l.id)
  )

  const [extraAmount, setExtraAmount] = useState(2000)
  const [result, setResult] = useState<OptimalPlanResult | null>(null)

  const horizon = Math.max(...loans.map((l) => l.remainingTermMonths))

  function toggleMinimumOnly(id: string) {
    setMinimumOnlyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setPayoffOrder((order) => order.includes(id) ? order : [...order, id])
      } else {
        next.add(id)
        setPayoffOrder((order) => order.filter((x) => x !== id))
      }
      return next
    })
    setResult(null)
  }

  function handleCalculate() {
    if (extraAmount > 0) {
      setResult(calculateOptimalPlan(
        loans, investments, extraAmount,
        payoffOrder,
        [...minimumOnlyIds],
        horizon
      ))
    }
  }

  function moveUp(idx: number) {
    if (idx <= 0) return
    const next = [...payoffOrder]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setPayoffOrder(next)
    setResult(null)
  }

  function moveDown(idx: number) {
    if (idx >= payoffOrder.length - 1) return
    const next = [...payoffOrder]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setPayoffOrder(next)
    setResult(null)
  }

  const loanMap = useMemo(() => new Map(loans.map((l) => [l.id, l])), [loans])

  const chartData = result?.months.map((m) => ({
    month: m.month,
    gjeld: Math.round(m.totalDebt),
    portefolje: Math.round(m.investmentPortfolio),
    nettoFormue: Math.round(m.netWealth),
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigurer din plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gj.snitt avkastning: {formatPercent(avgReturn)}. Lån med rente under avkastningen settes automatisk til &quot;kun minimum&quot; — det lønner seg å investere i stedet.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="optExtra">Ekstra per måned (kr)</Label>
            <Input id="optExtra" type="number" min="0" step="500" value={extraAmount || ''} onChange={(e) => { setExtraAmount(Number(e.target.value)); setResult(null) }} />
          </div>

          {/* Loan categorization */}
          <div>
            <Label className="mb-2 block">Velg hva som skal nedbetales aggressivt vs minimum</Label>
            <div className="flex flex-wrap gap-2">
              {loans.map((loan) => {
                const isMinimum = minimumOnlyIds.has(loan.id)
                const isLocked = loan.priority >= 9999
                const reason = isLocked
                  ? 'Beste lån'
                  : (loan.nominalInterestRate > 0 && loan.nominalInterestRate < avgReturn)
                    ? `${formatPercent(loan.nominalInterestRate)} < ${formatPercent(avgReturn)}`
                    : null
                return (
                  <button
                    key={loan.id}
                    onClick={() => !isLocked && toggleMinimumOnly(loan.id)}
                    disabled={isLocked}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isLocked ? 'opacity-50 cursor-not-allowed' :
                      isMinimum
                        ? 'bg-muted text-muted-foreground border-border cursor-pointer'
                        : 'bg-primary text-primary-foreground border-primary cursor-pointer'
                    }`}
                  >
                    {loan.name} ({loan.effectiveInterestRate > loan.nominalInterestRate ? `${formatPercent(loan.effectiveInterestRate)} eff.` : formatPercent(loan.nominalInterestRate)})
                    {reason && <span className="ml-1 text-xs opacity-70">— {reason}</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Farget = betal ned aggressivt</span>
              <span>Grå = kun minimum (invester i stedet)</span>
            </div>
          </div>

          {/* Payoff order for aggressive loans */}
          {payoffOrder.length > 0 && (
            <div>
              <Label className="mb-2 block">Nedbetalingsrekkefølge</Label>
              <div className="space-y-2">
                {payoffOrder.map((id, idx) => {
                  const loan = loanMap.get(id)
                  if (!loan) return null
                  return (
                    <div key={id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{loan.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatNOK(loan.currentBalance)} — {formatNOK(loan.monthlyPayment)}/mnd
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="px-2 py-1 text-xs rounded bg-background border disabled:opacity-30 cursor-pointer">↑</button>
                        <button onClick={() => moveDown(idx)} disabled={idx === payoffOrder.length - 1} className="px-2 py-1 text-xs rounded bg-background border disabled:opacity-30 cursor-pointer">↓</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {minimumLoans.length > 0 && (
            <div className="text-xs space-y-3">
              <p className="font-medium text-muted-foreground">Kun minimumsbetaling (investerer differansen):</p>
              {minimumLoans.map((l) => {
                // Per 1 000 kr ekstra: what do you save vs earn?
                const hasHiddenCost = l.effectiveInterestRate > l.nominalInterestRate
                const savedPerYear = l.nominalInterestRate * 10 // 1000 * rate/100 = rate*10
                const earnedPerYear = avgReturn * 10
                const advantagePerYear = earnedPerYear - savedPerYear
                const spread = avgReturn - l.nominalInterestRate
                // Calculate the baked-in fee cost
                const feeAmount = hasHiddenCost ? l.currentBalance - (l.originalAmount || l.currentBalance) : 0
                return (
                  <div key={l.id} className="bg-muted rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{l.name}</span>
                      <span className="text-muted-foreground">{formatNOK(l.monthlyPayment)}/mnd — saldo {formatNOK(l.currentBalance)}</span>
                    </div>
                    {hasHiddenCost && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1.5">
                        <p className="text-yellow-500 font-medium">
                          Effektiv rente: {formatPercent(l.effectiveInterestRate)} (nominell {formatPercent(l.nominalInterestRate)})
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {feeAmount > 0 && `Etableringsgebyr på ${formatNOK(Math.round(feeAmount))} er allerede bakt inn i saldoen. `}
                          Løpende rente er {formatPercent(l.nominalInterestRate)} — å betale raskere sparer deg ikke for gebyret, men du blir ferdig tidligere.
                        </p>
                      </div>
                    )}
                    <p className="text-muted-foreground font-medium">Per 1 000 kr ekstra du har tilgjengelig:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-muted-foreground">Betale ned lånet</p>
                        <p className="text-red-400 font-medium">Sparer {formatNOK(Math.round(savedPerYear))} kr/år</p>
                        <p className="text-[10px] text-muted-foreground">{formatPercent(l.nominalInterestRate)} løpende rente</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investere i stedet</p>
                        <p className="text-green-500 font-medium">Gir {formatNOK(Math.round(earnedPerYear))} kr/år</p>
                        <p className="text-[10px] text-muted-foreground">{formatPercent(avgReturn)} avkastning</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fordel ved å investere</p>
                        <p className={`font-medium ${advantagePerYear > 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {advantagePerYear > 0 ? '+' : ''}{formatNOK(Math.round(advantagePerYear))} kr/år
                        </p>
                        <p className="text-[10px] text-muted-foreground">spread {formatPercent(spread)}</p>
                      </div>
                    </div>
                    {advantagePerYear > 0 && (
                      <p className="text-green-500 text-[10px]">
                        Hver 1 000 kr du investerer i stedet for å betale ekstra, gir deg {formatNOK(Math.round(advantagePerYear))} kr mer per år.
                        {l.nominalInterestRate === 0 && !hasHiddenCost && ' Lånet har 0 % rente — det koster ingenting å beholde det.'}
                        {l.nominalInterestRate === 0 && hasHiddenCost && ' Gebyret er allerede betalt — løpende koster lånet deg ingenting ekstra.'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Existing portfolio compound info */}
          {investments.length > 0 && (() => {
            const existingValue = investments.reduce((sum, i) => sum + i.currentValue, 0)
            const monthlyCompound = existingValue * (avgReturn / 100) / 12
            const yearlyCompound = existingValue * Math.pow(1 + avgReturn / 100 / 12, 12) - existingValue
            return (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium text-green-500">Eksisterende portefølje: {formatNOK(existingValue)}</p>
                <p className="text-muted-foreground">
                  Gir ca {formatNOK(Math.round(monthlyCompound))}/mnd i avkastning ({formatPercent(avgReturn)}).
                  Med rentes rente: ca {formatNOK(Math.round(yearlyCompound))} første år — alt reinvesteres automatisk.
                </p>
              </div>
            )
          })()}

          <Button onClick={handleCalculate} className="w-full">Beregn optimal plan</Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary */}
          {(() => {
            const existingPortfolio = investments.reduce((sum, i) => sum + i.currentValue, 0)
            const compoundGrowth = result.summary.finalPortfolio - existingPortfolio - result.summary.totalInvested
            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Netto formue ved slutten</p>
                    <p className="text-2xl font-bold">{formatNOK(result.summary.finalNetWealth)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Porteføljeverdi</p>
                    <p className="text-2xl font-bold text-green-500">{formatNOK(result.summary.finalPortfolio)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Startverdi {formatNOK(existingPortfolio)} + {formatNOK(result.summary.totalInvested)} nyinvestert
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Rentes rente (avkastning)</p>
                    <p className="text-2xl font-bold text-green-500">{formatNOK(Math.round(compoundGrowth))}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reinvestert avkastning over {fmt(result.horizon)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total rente betalt</p>
                    <p className="text-2xl font-bold text-red-400">{formatNOK(result.summary.totalInterestPaid)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Restgjeld</p>
                    <p className="text-2xl font-bold">{formatNOK(result.summary.finalDebt)}</p>
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Milepæler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.summary.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Badge variant="outline">{fmt(m.month)}</Badge>
                    <span className="text-sm">{m.event}</span>
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart: Debt vs Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Gjeld vs portefølje over tid</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} tickFormatter={(m) => `${Math.floor(m / 12)}å`} />
                  <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    labelFormatter={(m) => `Måned ${m} (${fmt(Number(m))})`}
                    formatter={(value) => formatNOK(Number(value))}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="gjeld" name="Total gjeld" stroke="hsl(350, 65%, 50%)" fill="hsl(350, 65%, 50%)" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="portefolje" name="Portefølje" stroke="hsl(160, 60%, 45%)" fill="hsl(160, 60%, 45%)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Net wealth chart */}
          <Card>
            <CardHeader>
              <CardTitle>Netto formue over tid</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} tickFormatter={(m) => `${Math.floor(m / 12)}å`} />
                  <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    labelFormatter={(m) => `Måned ${m} (${fmt(Number(m))})`}
                    formatter={(value) => formatNOK(Number(value))}
                  />
                  <Line type="monotone" dataKey="nettoFormue" name="Netto formue" stroke="hsl(220, 70%, 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed monthly action plan */}
          <Card>
            <CardHeader>
              <CardTitle>Handlingsplan — hver måned</CardTitle>
              <p className="text-sm text-muted-foreground">Nøyaktig hva du betaler på hvert lån og investerer i FundingPartner</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-1 sticky left-0 bg-card">Dato</th>
                      {loans.map((l) => (
                        <th key={l.id} className="text-right py-2 px-1 whitespace-nowrap">
                          <div>{l.name}</div>
                          <div className="font-normal text-[10px]">betaling</div>
                        </th>
                      ))}
                      <th className="text-right py-2 px-1 whitespace-nowrap text-green-500">
                        <div>FundingPartner</div>
                        <div className="font-normal text-[10px]">investering</div>
                      </th>
                      <th className="text-right py-2 px-1 whitespace-nowrap text-green-500">
                        <div>Portefølje</div>
                        <div className="font-normal text-[10px]">total</div>
                      </th>
                      <th className="text-right py-2 px-1">Gjeld</th>
                      <th className="text-right py-2 px-1 font-bold">Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.months.map((m) => {
                      const hasEvent = m.events.length > 0
                      return (
                        <tr key={m.month} className={`border-b ${hasEvent ? 'bg-primary/10 font-medium' : ''}`}>
                          <td className="py-1.5 px-1 sticky left-0 bg-card whitespace-nowrap">
                            {m.date.slice(0, 7)}
                            {hasEvent && <span className="ml-1 text-[10px] text-primary">★</span>}
                          </td>
                          {loans.map((l) => {
                            const payment = m.loanPayments.get(l.id) ?? 0
                            const balance = m.loanBalances.get(l.id) ?? 0
                            return (
                              <td key={l.id} className={`py-1.5 px-1 text-right ${balance <= 0.01 ? 'text-muted-foreground/30' : ''}`}>
                                {balance <= 0.01 && payment === 0 ? '—' : formatNOK(Math.round(payment))}
                              </td>
                            )
                          })}
                          <td className="py-1.5 px-1 text-right text-green-500 font-medium">
                            {m.toFundingPartner > 0 ? formatNOK(Math.round(m.toFundingPartner)) : '—'}
                          </td>
                          <td className="py-1.5 px-1 text-right text-green-500">
                            {formatNOK(Math.round(m.investmentPortfolio))}
                          </td>
                          <td className="py-1.5 px-1 text-right text-red-400">
                            {m.totalDebt > 0 ? formatNOK(Math.round(m.totalDebt)) : '0 kr'}
                          </td>
                          <td className="py-1.5 px-1 text-right font-medium">
                            {formatNOK(Math.round(m.netWealth))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {result.months.some((m) => m.events.length > 0) && (
                <p className="text-xs text-muted-foreground mt-2">★ = lån nedbetalt denne måneden</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
