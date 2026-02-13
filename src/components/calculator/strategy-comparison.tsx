'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatMonths } from '@/lib/format'
import type { StrategyResult } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface StrategyComparisonProps {
  snowball: StrategyResult
  avalanche: StrategyResult
  minimumOnly: StrategyResult
  loans: Loan[]
}

function StrategyCard({ title, result, savings, loans, highlight }: {
  title: string; result: StrategyResult; savings: number; loans: Loan[]; highlight?: boolean
}) {
  const loanNames = new Map(loans.map((l) => [l.id, l.name]))

  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {highlight && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Beste valg</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total rente</p>
            <p className="text-lg font-bold">{formatNOK(result.totalInterest)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tid til gjeldsfri</p>
            <p className="text-lg font-bold">{formatMonths(result.totalMonths)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gjeldsfri dato</p>
            <p className="font-medium">{result.debtFreeDate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Spart vs minimum</p>
            <p className="text-lg font-bold text-green-500">{formatNOK(savings)}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Nedbetalingsrekkefølge:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {result.payoffOrder.map((id) => (
              <li key={id}>{loanNames.get(id) || id}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

export function StrategyComparison({ snowball, avalanche, minimumOnly, loans }: StrategyComparisonProps) {
  const bestStrategy = avalanche.totalInterest <= snowball.totalInterest ? 'avalanche' : 'snowball'

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StrategyCard title="Snøball (lavest saldo først)" result={snowball} savings={minimumOnly.totalInterest - snowball.totalInterest} loans={loans} highlight={bestStrategy === 'snowball'} />
      <StrategyCard title="Skred (høyest rente først)" result={avalanche} savings={minimumOnly.totalInterest - avalanche.totalInterest} loans={loans} highlight={bestStrategy === 'avalanche'} />
      <StrategyCard title="Kun minimumsbetaling" result={minimumOnly} savings={0} loans={loans} />
    </div>
  )
}
