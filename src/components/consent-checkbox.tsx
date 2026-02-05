'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface ConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function ConsentCheckbox({
  checked,
  onCheckedChange,
  disabled,
}: ConsentCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="consent"
        name="consent"
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        disabled={disabled}
        className="mt-1 h-6 w-6"
      />
      <Label
        htmlFor="consent"
        className="text-sm leading-relaxed text-muted-foreground"
      >
        Li e concordo com a{' '}
        <Link
          href="/privacidade"
          className="text-primary underline"
          target="_blank"
        >
          Politica de Privacidade
        </Link>
        . Entendo que meus dados de saude sao protegidos e nunca
        compartilhados com terceiros.
      </Label>
    </div>
  )
}
