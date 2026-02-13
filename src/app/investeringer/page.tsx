import { getInvestments } from '@/lib/db'
import { formatNOK, formatPercent } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { InvestmentForm } from '@/components/investments/investment-form'
import { DeleteInvestmentButton } from '@/components/investments/delete-investment-button'
import { Pencil } from 'lucide-react'

export default async function InvestmentsPage() {
  const investments = await getInvestments()

  const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0)
  const totalInvested = investments.reduce((sum, i) => sum + i.totalInvested, 0)
  const totalProfit = totalValue - totalInvested
  const weightedReturn = totalValue > 0
    ? investments.reduce((sum, i) => sum + (i.currentValue * i.averageNetReturn / 100), 0) / totalValue * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investeringer</h1>
        <InvestmentForm />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total verdi</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{formatNOK(totalValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt investert</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatNOK(totalInvested)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total avkastning</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{formatNOK(totalProfit)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gj.snitt nettorente</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatPercent(weightedReturn)}</div></CardContent>
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Ingen investeringer registrert ennå. Legg til din første investering.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Plattform</TableHead>
                <TableHead className="text-right">Investert</TableHead>
                <TableHead className="text-right">Nåverdi</TableHead>
                <TableHead className="text-right">Nettorente</TableHead>
                <TableHead className="text-right">Aktive lån</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.name}</TableCell>
                  <TableCell>{inv.platform}</TableCell>
                  <TableCell className="text-right">{formatNOK(inv.totalInvested)}</TableCell>
                  <TableCell className="text-right">{formatNOK(inv.currentValue)}</TableCell>
                  <TableCell className="text-right">{formatPercent(inv.averageNetReturn)}</TableCell>
                  <TableCell className="text-right">{inv.activeLoansCount}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <InvestmentForm investment={inv} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                    <DeleteInvestmentButton id={inv.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
