import { getLoans, getInvestments } from '@/lib/db'
import { OptimalPlanView } from '@/components/strategi/optimal-plan-view'

export default async function StrategiPage() {
  const loans = await getLoans()
  const investments = await getInvestments()

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Optimal strategi</h1>
        <p className="text-muted-foreground">Legg til lån først.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Optimal strategi</h1>
      <p className="text-muted-foreground">
        Din personlige plan: betal ned lån smart, invester frigjorte midler, og maksimer formue.
      </p>
      <OptimalPlanView loans={loans} investments={investments} />
    </div>
  )
}
