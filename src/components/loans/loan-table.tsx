'use client'

import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNOK, formatPercent, formatMonths, loanTypeLabel } from '@/lib/format'
import { deleteLoanAction } from '@/app/actions'
import { LoanForm } from './loan-form'
import type { Loan } from '@/lib/types'
import { Trash2, Pencil, ArrowRight } from 'lucide-react'

interface LoanTableProps {
  loans: Loan[]
}

export function LoanTable({ loans }: LoanTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Nominell rente</TableHead>
            <TableHead className="text-right">Effektiv rente</TableHead>
            <TableHead className="text-right">Mnd. betaling</TableHead>
            <TableHead className="text-right">Gjenstående</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell className="font-medium">{loan.name}</TableCell>
              <TableCell><Badge variant="secondary">{loanTypeLabel(loan.type)}</Badge></TableCell>
              <TableCell className="text-right">{formatNOK(loan.currentBalance)}</TableCell>
              <TableCell className="text-right">{formatPercent(loan.nominalInterestRate)}</TableCell>
              <TableCell className="text-right">{formatPercent(loan.effectiveInterestRate)}</TableCell>
              <TableCell className="text-right">{formatNOK(loan.monthlyPayment)}</TableCell>
              <TableCell className="text-right">{formatMonths(loan.remainingTermMonths)}</TableCell>
              <TableCell className="text-right space-x-1">
                <LoanForm loan={loan} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                <Button variant="ghost" size="icon" onClick={() => deleteLoanAction(loan.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Link href={`/lan/${loan.id}`}>
                  <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {loans.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Ingen lån registrert ennå. Legg til ditt første lån.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
