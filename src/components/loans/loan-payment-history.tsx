import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNOK, formatDate } from '@/lib/format'
import type { Payment } from '@/lib/types'

interface LoanPaymentHistoryProps {
  payments: Payment[]
}

export function LoanPaymentHistory({ payments }: LoanPaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Betalingshistorikk</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Ingen betalinger registrert for dette lånet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Betalingshistorikk</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead className="text-right">Avdrag</TableHead>
              <TableHead className="text-right">Rente</TableHead>
              <TableHead className="text-right">Gebyrer</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.date)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.amount)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.principal)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.interest)}</TableCell>
                <TableCell className="text-right">{formatNOK(p.fees)}</TableCell>
                <TableCell>{p.isExtraPayment && <Badge>Ekstra</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
