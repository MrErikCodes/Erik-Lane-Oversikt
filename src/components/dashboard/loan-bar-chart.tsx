'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { Loan } from '@/lib/types'

interface LoanBarChartProps {
  loans: Loan[]
}

export function LoanBarChart({ loans }: LoanBarChartProps) {
  const data = loans.map((l) => ({ name: l.name, saldo: l.currentBalance }))

  return (
    <Card>
      <CardHeader><CardTitle>Lånebalanse</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatNOK(Number(value))} />
            <Bar dataKey="saldo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
