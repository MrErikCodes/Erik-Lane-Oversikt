'use client'

import { Button } from '@/components/ui/button'
import { deleteInvestmentAction } from '@/app/actions'
import { Trash2 } from 'lucide-react'

export function DeleteInvestmentButton({ id }: { id: string }) {
  return (
    <Button variant="ghost" size="icon" onClick={() => deleteInvestmentAction(id)}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  )
}
