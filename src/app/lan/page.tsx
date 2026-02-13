import { getLoans } from '@/lib/db'
import { LoanTable } from '@/components/loans/loan-table'
import { LoanForm } from '@/components/loans/loan-form'

export default async function LoansPage() {
  const loans = await getLoans()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lån</h1>
        <LoanForm />
      </div>
      <LoanTable loans={loans} />
    </div>
  )
}
