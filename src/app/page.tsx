import { getLoans } from '@/lib/db'
import { calculatePayoffComparison } from '@/lib/calculations'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LoanBarChart } from '@/components/dashboard/loan-bar-chart'
import { InterestPieChart } from '@/components/dashboard/interest-pie-chart'
import { ProgressChart } from '@/components/dashboard/progress-chart'

export default async function DashboardPage() {
  const loans = await getLoans()

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-3xl font-bold">Velkommen til Låneoversikt</h1>
        <p className="text-muted-foreground">Legg til dine lån for å komme i gang.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  const comparison = calculatePayoffComparison(loans, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Oversikt</h1>
      <SummaryCards loans={loans} debtFreeDate={comparison.minimumOnly.debtFreeDate} />
      <div className="grid gap-6 md:grid-cols-2">
        <LoanBarChart loans={loans} />
        <InterestPieChart loans={loans} />
      </div>
      <ProgressChart timeline={comparison.minimumOnly.timeline} />
    </div>
  )
}
