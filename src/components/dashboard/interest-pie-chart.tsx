'use client'

import { useState } from 'react'
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
  const [hiddenLoans, setHiddenLoans] = useState<Set<string>>(new Set())

  const allData = loans.map((l, i) => ({
    name: l.name,
    rente: Math.round(calculateMonthlyInterest(l.currentBalance, l.nominalInterestRate)),
    color: COLORS[i % COLORS.length],
  }))

  const visibleData = allData.filter((d) => !hiddenLoans.has(d.name))

  const toggleLoan = (name: string) => {
    setHiddenLoans((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        if (next.size < allData.length - 1) next.add(name)
      }
      return next
    })
  }

  const renderLegend = () => (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {allData.map((entry) => {
        const isHidden = hiddenLoans.has(entry.name)
        return (
          <button
            key={entry.name}
            onClick={() => toggleLoan(entry.name)}
            className="flex items-center gap-1.5 text-sm cursor-pointer transition-opacity"
            style={{ opacity: isHidden ? 0.35 : 1 }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: 'hsl(var(--card-foreground))' }}>{entry.name}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <Card>
      <CardHeader><CardTitle>Rentefordeling per måned</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={visibleData} dataKey="rente" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {visibleData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))' }}
              formatter={(value) => formatNOK(Number(value))}
            />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
