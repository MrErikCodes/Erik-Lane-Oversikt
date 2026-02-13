import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatMonths } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface SummaryCardsProps {
  loans: Loan[]
  debtFreeDate: string
}

export function SummaryCards({ loans, debtFreeDate }: SummaryCardsProps) {
  const totalDebt = loans.reduce((sum, l) => sum + l.currentBalance, 0)
  const totalMonthlyPayment = loans.reduce((sum, l) => sum + l.monthlyPayment, 0)
  const totalMonthlyInterest = loans.reduce(
    (sum, l) => sum + calculateMonthlyInterest(l.currentBalance, l.nominalInterestRate), 0
  )
  const maxTerm = Math.max(...loans.map((l) => l.remainingTermMonths), 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total gjeld</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalDebt)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rente per måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalMonthlyInterest)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Betaling per måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNOK(totalMonthlyPayment)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gjeldsfri om</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMonths(maxTerm)}</div>
          <p className="text-xs text-muted-foreground mt-1">{debtFreeDate}</p>
        </CardContent>
      </Card>
    </div>
  )
}
