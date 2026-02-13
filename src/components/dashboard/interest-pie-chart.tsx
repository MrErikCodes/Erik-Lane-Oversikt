'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateMonthlyInterest } from '@/lib/calculations'
import { formatNOK } from '@/lib/format'
import type { Loan } from '@/lib/types'

const COLORS = ['hsl(220, 70%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 55%)', 'hsl(350, 65%, 50%)']

interface InterestPieChartProps {
  loans: Loan[]
}

export function InterestPieChart({ loans }: InterestPieChartProps) {
  const data = loans.map((l) => ({
    name: l.name,
    rente: Math.round(calculateMonthlyInterest(l.currentBalance, l.nominalInterestRate)),
  }))

  return (
    <Card>
      <CardHeader><CardTitle>Rentefordeling per måned</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="rente" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
            </Pie>
            <Tooltip formatter={(value) => formatNOK(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
