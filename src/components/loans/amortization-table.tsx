import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { AmortizationRow } from '@/lib/calculations'

interface AmortizationTableProps {
  schedule: AmortizationRow[]
}

export function AmortizationTable({ schedule }: AmortizationTableProps) {
  const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0)
  const totalFees = schedule.reduce((sum, r) => sum + r.fees, 0)
  const totalPaid = schedule.reduce((sum, r) => sum + r.payment + r.fees, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nedbetalingsplan</CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total rente: {formatNOK(totalInterest)}</span>
          <span>Totale gebyrer: {formatNOK(totalFees)}</span>
          <span>Totalt betalt: {formatNOK(totalPaid)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mnd</TableHead>
                <TableHead className="text-right">Betaling</TableHead>
                <TableHead className="text-right">Avdrag</TableHead>
                <TableHead className="text-right">Rente</TableHead>
                <TableHead className="text-right">Gebyrer</TableHead>
                <TableHead className="text-right">Gjenstående</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.payment)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.principal)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.interest)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.fees)}</TableCell>
                  <TableCell className="text-right">{formatNOK(row.remainingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
