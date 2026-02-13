import { notFound } from 'next/navigation'
import { getLoan, getPayments, getRateChanges } from '@/lib/db'
import { generateAmortizationSchedule } from '@/lib/calculations'
import { LoanInfoCard } from '@/components/loans/loan-info-card'
import { AmortizationTable } from '@/components/loans/amortization-table'
import { LoanPaymentHistory } from '@/components/loans/loan-payment-history'
import { RateChangeHistory } from '@/components/loans/rate-change-history'
import { LoanForm } from '@/components/loans/loan-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface LoanDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params
  const loan = await getLoan(id)
  if (!loan) notFound()

  const payments = await getPayments(id)
  const rateChanges = await getRateChanges(id)
  const schedule = generateAmortizationSchedule(loan)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/lan">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">{loan.name}</h1>
        <LoanForm loan={loan} trigger={<Button variant="outline">Rediger</Button>} />
      </div>
      <LoanInfoCard loan={loan} />
      <RateChangeHistory rateChanges={rateChanges} loanId={loan.id} />
      <AmortizationTable schedule={schedule} />
      <LoanPaymentHistory payments={payments} />
    </div>
  )
}
