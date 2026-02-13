import { getLoans, getInvestments } from '@/lib/db'
import { calculatePayoffComparison } from '@/lib/calculations'
import { formatNOK, formatPercent } from '@/lib/format'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LoanBarChart } from '@/components/dashboard/loan-bar-chart'
import { InterestPieChart } from '@/components/dashboard/interest-pie-chart'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const loans = await getLoans()
  const investments = await getInvestments()

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
      {investments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investeringer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatNOK(investments.reduce((sum, i) => sum + i.currentValue, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Netto formue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNOK(investments.reduce((sum, i) => sum + i.currentValue, 0) - loans.reduce((sum, l) => sum + l.currentBalance, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gj.snitt avkastning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatPercent(investments.length > 0 ? investments.reduce((sum, i) => sum + i.averageNetReturn, 0) / investments.length : 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
