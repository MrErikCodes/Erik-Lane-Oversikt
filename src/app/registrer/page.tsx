import { getLoans } from '@/lib/db'
import { PaymentForm } from '@/components/payments/payment-form'

export default async function RegisterPaymentPage() {
  const loans = await getLoans()

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Registrer betaling</h1>
        <p className="text-muted-foreground">Legg til lån først.</p>
        <a href="/lan" className="text-primary underline">Gå til Lån →</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Registrer betaling</h1>
      <p className="text-muted-foreground">Logg en betaling og se automatisk beregning av rente vs avdrag.</p>
      <PaymentForm loans={loans} />
    </div>
  )
}
