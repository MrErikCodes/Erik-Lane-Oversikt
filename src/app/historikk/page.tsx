import { getLoans, getPayments } from '@/lib/db'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNOK, formatDate } from '@/lib/format'

export default async function PaymentHistoryPage() {
  const loans = await getLoans()
  const payments = await getPayments()
  const loanNames = new Map(loans.map((l) => [l.id, l.name]))

  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date))

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0)
  const totalPrincipal = payments.reduce((sum, p) => sum + p.principal, 0)
  const totalFees = payments.reduce((sum, p) => sum + p.fees, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Betalingshistorikk</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt betalt</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalPaid)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt avdrag</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalPrincipal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total rente betalt</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatNOK(totalInterest)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totale gebyrer</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalFees)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {sorted.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Ingen betalinger registrert enn&#229;.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>L&#229;n</TableHead>
                  <TableHead className="text-right">Bel&#248;p</TableHead>
                  <TableHead className="text-right">Avdrag</TableHead>
                  <TableHead className="text-right">Rente</TableHead>
                  <TableHead className="text-right">Gebyrer</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{loanNames.get(p.loanId) || 'Ukjent'}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.amount)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.principal)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.interest)}</TableCell>
                    <TableCell className="text-right">{formatNOK(p.fees)}</TableCell>
                    <TableCell>{p.isExtraPayment && <Badge>Ekstra</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
