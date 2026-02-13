'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNOK } from '@/lib/format'
import type { MonthlySnapshot } from '@/lib/calculations'

interface ProgressChartProps {
  timeline: MonthlySnapshot[]
}

export function ProgressChart({ timeline }: ProgressChartProps) {
  const data = timeline.filter((_, i) => i % 3 === 0 || i === timeline.length - 1).map((s) => ({
    mnd: s.month,
    gjeld: Math.round(s.totalBalance),
  }))

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle>Gjeldsutvikling over tid</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <XAxis dataKey="mnd" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatNOK(Number(value))} labelFormatter={(l) => `Måned ${l}`} />
            <Area type="monotone" dataKey="gjeld" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
