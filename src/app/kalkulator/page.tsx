import { getLoans, getInvestments } from '@/lib/db'
import { calculatePayoffComparison } from '@/lib/calculations'
import { StrategyComparison } from '@/components/calculator/strategy-comparison'
import { WhatIfPanel } from '@/components/calculator/what-if-panel'
import { OpportunityCostPanel } from '@/components/calculator/opportunity-cost-panel'

export default async function CalculatorPage() {
  const loans = await getLoans()
  const investments = await getInvestments()

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Kalkulator</h1>
        <p className="text-muted-foreground">Legg til lån først for å bruke kalkulatoren.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  const comparison = calculatePayoffComparison(loans, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kalkulator</h1>
      <p className="text-muted-foreground">Sammenlign strategier for å bli gjeldsfri raskere.</p>
      <StrategyComparison snowball={comparison.snowball} avalanche={comparison.avalanche} minimumOnly={comparison.minimumOnly} loans={loans} />
      <WhatIfPanel loans={loans} baseComparison={comparison} />
      <OpportunityCostPanel loans={loans} investments={investments} />
    </div>
  )
}
