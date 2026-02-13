import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK, formatPercent, formatDate, formatMonths, loanTypeLabel } from '@/lib/format'
import { calculateMonthlyInterest } from '@/lib/calculations'
import type { Loan } from '@/lib/types'

interface LoanInfoCardProps {
  loan: Loan
}

export function LoanInfoCard({ loan }: LoanInfoCardProps) {
  const monthlyInterest = calculateMonthlyInterest(loan.currentBalance, loan.nominalInterestRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {loan.name}
          <span className="text-sm font-normal text-muted-foreground">{loanTypeLabel(loan.type)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Långiver</p>
            <p className="font-medium">{loan.lender}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lånenummer</p>
            <p className="font-medium">{loan.loanNumber || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Opprinnelig beløp</p>
            <p className="font-medium">{formatNOK(loan.originalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nåværende saldo</p>
            <p className="font-medium text-lg">{formatNOK(loan.currentBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nominell rente</p>
            <p className="font-medium">{formatPercent(loan.nominalInterestRate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Effektiv rente</p>
            <p className="font-medium">{formatPercent(loan.effectiveInterestRate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Månedlig rente</p>
            <p className="font-medium">{formatNOK(monthlyInterest)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Månedlig betaling</p>
            <p className="font-medium">{formatNOK(loan.monthlyPayment)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gebyrer/mnd</p>
            <p className="font-medium">{formatNOK(loan.monthlyFees)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gjenstående</p>
            <p className="font-medium">{formatMonths(loan.remainingTermMonths)}</p>
          </div>
          {loan.fixedRateTermsRemaining > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Fastrente gjenstående</p>
              <p className="font-medium">{formatMonths(loan.fixedRateTermsRemaining)}</p>
            </div>
          )}
          {loan.rateAfterFixedPeriod !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Rente etter fastperiode</p>
              <p className="font-medium">{formatPercent(loan.rateAfterFixedPeriod)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Startdato</p>
            <p className="font-medium">{formatDate(loan.originationDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Forfallsdag</p>
            <p className="font-medium">{loan.paymentDueDay}. hver måned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
