'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  User,
  Clock,
  FileText,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  Loader2,
  Bell,
  BellOff,
} from 'lucide-react'
import {
  isNotificationSupported,
  isNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  initializeReminders,
  stopAllReminders,
} from '@/lib/notifications'

interface UserProfile {
  name: string
  age: number | null
  weight: number | null
  target_weight: number | null
  activity_level: string | null
  protein_preference: string | null
  dietary_restrictions: string[] | null
  foods_to_avoid: string | null
  fasting_start_hour: number
  fasting_end_hour: number
}

const activityLevels = [
  { value: 'sedentary', label: 'Sedentária' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'active', label: 'Ativa' },
] as const

const proteinOptions = [
  { value: 'chicken', label: 'Frango' },
  { value: 'fish', label: 'Peixe' },
  { value: 'meat', label: 'Carne' },
  { value: 'eggs', label: 'Ovos' },
  { value: 'legumes', label: 'Leguminosas' },
] as const

const dietaryOptions = [
  'vegetariana',
  'sem lactose',
  'sem glúten',
  'vegana',
]

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [fastingOpen, setFastingOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit profile form state
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editTargetWeight, setEditTargetWeight] = useState('')
  const [editActivityLevel, setEditActivityLevel] = useState('')
  const [editProteinPref, setEditProteinPref] = useState('')
  const [editDietaryRestrictions, setEditDietaryRestrictions] = useState<string[]>([])
  const [editFoodsToAvoid, setEditFoodsToAvoid] = useState('')
  const [regeneratingPlan, setRegeneratingPlan] = useState(false)

  // Fasting form state
  const [fastingStart, setFastingStart] = useState('20')
  const [fastingEnd, setFastingEnd] = useState('12')

  // Notification state
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [notifSupported, setNotifSupported] = useState(true)

  useEffect(() => {
    setNotifSupported(isNotificationSupported())
    setNotificationsOn(isNotificationsEnabled())
  }, [])

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          setEditName(data.name || '')
          setEditAge(data.age?.toString() || '')
          setEditWeight(data.weight?.toString() || '')
          setEditTargetWeight(data.target_weight?.toString() || '')
          setEditActivityLevel(data.activity_level || '')
          setEditProteinPref(data.protein_preference || '')
          setEditDietaryRestrictions(data.dietary_restrictions || [])
          setEditFoodsToAvoid(data.foods_to_avoid || '')
          setFastingStart(data.fasting_start_hour?.toString() || '20')
          setFastingEnd(data.fasting_end_hour?.toString() || '12')
        }
      } catch {
        // offline
      }
    }
    loadProfile()
  }, [])

  async function handleLogout() {
    const { logout } = await import('@/lib/auth/logout')
    await logout()
  }

  async function handleExportData() {
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) {
        alert('Erro ao exportar dados. Tente novamente.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'meus-dados.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao exportar dados. Tente novamente.')
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        'Tem certeza? Todos seus dados serão apagados permanentemente. Esta ação não pode ser desfeita.'
      )
    ) {
      return
    }

    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/login'
      } else {
        alert('Erro ao excluir conta. Tente novamente.')
      }
    } catch {
      alert('Erro ao excluir conta. Tente novamente.')
    }
  }

  function toggleDietary(item: string) {
    setEditDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    )
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName || undefined,
          age: editAge ? Number(editAge) : undefined,
          weight: editWeight ? Number(editWeight) : undefined,
          target_weight: editTargetWeight ? Number(editTargetWeight) : undefined,
          activity_level: editActivityLevel || undefined,
          protein_preference: editProteinPref || undefined,
          dietary_restrictions: editDietaryRestrictions.length > 0 ? editDietaryRestrictions : undefined,
          foods_to_avoid: editFoodsToAvoid || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile((prev) => prev ? { ...prev, ...data } : prev)
        setEditProfileOpen(false)

        // Regenerate AI plan with new data
        setRegeneratingPlan(true)
        try {
          await fetch('/api/generate-plan', { method: 'POST' })
        } catch {
          // Plan regeneration is optional
        } finally {
          setRegeneratingPlan(false)
        }
      } else {
        alert('Erro ao salvar. Tente novamente.')
      }
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function saveFasting() {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fasting_start_hour: Number(fastingStart),
          fasting_end_hour: Number(fastingEnd),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile((prev) => prev ? { ...prev, ...data } : prev)
        setFastingOpen(false)
      } else {
        alert('Erro ao salvar. Tente novamente.')
      }
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleNotifications() {
    if (notificationsOn) {
      setNotificationsEnabled(false)
      stopAllReminders()
      setNotificationsOn(false)
    } else {
      const granted = await requestNotificationPermission()
      if (granted) {
        setNotificationsEnabled(true)
        setNotificationsOn(true)
        const startH = Number(fastingStart) || 20
        const endH = Number(fastingEnd) || 12
        initializeReminders(startH, endH)
      } else {
        alert('Permissão de notificação negada. Ative nas configurações do navegador.')
      }
    }
  }

  const menuItems = [
    {
      icon: User,
      label: 'Editar perfil',
      desc: profile ? `${profile.name || 'Sem nome'} · ${profile.weight || '?'}kg` : 'Nome, dados, restrições',
      action: () => setEditProfileOpen(true),
    },
    {
      icon: Clock,
      label: 'Horário do jejum',
      desc: profile ? `${profile.fasting_start_hour}h - ${profile.fasting_end_hour}h (16:8)` : 'Personalizar janela 16:8',
      action: () => setFastingOpen(true),
    },
    ...(notifSupported ? [{
      icon: notificationsOn ? Bell : BellOff,
      label: 'Notificações',
      desc: notificationsOn
        ? 'Ativadas — lembretes de água e jejum'
        : 'Desativadas — toque para ativar',
      action: toggleNotifications,
    }] : []),
    {
      icon: FileText,
      label: 'Política de privacidade',
      desc: 'Seus dados protegidos',
      action: () => router.push('/privacidade'),
    },
    {
      icon: Shield,
      label: 'Exportar meus dados',
      desc: 'LGPD: baixar todos seus dados',
      action: handleExportData,
    },
    {
      icon: Trash2,
      label: 'Excluir minha conta',
      desc: 'Apagar todos os dados',
      action: handleDeleteAccount,
      danger: true,
    },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="relative">
        <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-secondary/5 blur-2xl" />
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Configurações
        </p>
        <h1 className="text-2xl font-bold">Mais</h1>
      </div>

      <div className="space-y-2 stagger-children">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-4 rounded-2xl glass-card p-4 transition-all card-lift text-left"
            onClick={item.action}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              item.danger ? 'bg-destructive/10' : 'bg-muted'
            }`}>
              <item.icon
                size={20}
                className={item.danger ? 'text-destructive' : 'text-muted-foreground'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  item.danger ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground/40" />
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl"
        size="lg"
        onClick={handleLogout}
      >
        <LogOut size={18} className="mr-2" />
        Sair da conta
      </Button>

      <p className="text-center text-[10px] text-muted-foreground/60">
        Queima Intermitente v1.0
      </p>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize seus dados. Um novo plano será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-age">Idade</Label>
                <Input
                  id="edit-age"
                  type="number"
                  inputMode="numeric"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  placeholder="55"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-weight">Peso atual (kg)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  inputMode="decimal"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-target">Peso desejado (kg)</Label>
              <Input
                id="edit-target"
                type="number"
                inputMode="decimal"
                value={editTargetWeight}
                onChange={(e) => setEditTargetWeight(e.target.value)}
                placeholder="65"
              />
            </div>

            <div className="space-y-2">
              <Label>Nível de atividade física</Label>
              <div className="flex flex-wrap gap-2">
                {activityLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setEditActivityLevel(level.value)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      editActivityLevel === level.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Restrições alimentares</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleDietary(item)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      editDietaryRestrictions.includes(item)
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-foods-avoid">O que você NÃO come?</Label>
              <Input
                id="edit-foods-avoid"
                type="text"
                value={editFoodsToAvoid}
                onChange={(e) => setEditFoodsToAvoid(e.target.value)}
                placeholder="Ex: camarão, amendoim, pimenta"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>Proteína preferida</Label>
              <div className="flex flex-wrap gap-2">
                {proteinOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditProteinPref(opt.value)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      editProteinPref === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full rounded-xl"
              onClick={saveProfile}
              disabled={saving || regeneratingPlan}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : regeneratingPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando novo plano...
                </>
              ) : (
                'Salvar e Atualizar Plano'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fasting Schedule Dialog */}
      <Dialog open={fastingOpen} onOpenChange={setFastingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horário do Jejum</DialogTitle>
            <DialogDescription>
              Defina quando sua janela de jejum começa e termina.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Janela de jejum</p>
              <div className="flex items-center justify-center gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fasting-start" className="text-xs">Início</Label>
                  <Input
                    id="fasting-start"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={23}
                    value={fastingStart}
                    onChange={(e) => setFastingStart(e.target.value)}
                    className="w-20 text-center text-lg font-bold"
                  />
                </div>
                <span className="text-2xl font-bold text-muted-foreground mt-5">-</span>
                <div className="space-y-1">
                  <Label htmlFor="fasting-end" className="text-xs">Fim</Label>
                  <Input
                    id="fasting-end"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={23}
                    value={fastingEnd}
                    onChange={(e) => setFastingEnd(e.target.value)}
                    className="w-20 text-center text-lg font-bold"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Jejum de {fastingStart}h até {fastingEnd}h do dia seguinte
              </p>
            </div>
            <Button
              className="w-full rounded-xl"
              onClick={saveFasting}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar Horário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
