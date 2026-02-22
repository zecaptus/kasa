# Kasa — Frontend Agent Directives

> Ces directives s'appliquent à **tout** code frontend (`frontend/`).
> Elles ont priorité sur les conventions génériques React/Tailwind.
> Dernière mise à jour : 2026-02-22

---

## 1. Mobile-first obligatoire

- Concevoir **d'abord** pour ≤375 px. Les breakpoints plus larges sont additifs.
- Utiliser les préfixes Tailwind en ordre croissant : `sm:` → `md:` → `lg:` → `xl:`.
- Ne jamais écrire de style "desktop-first" puis le surcharger pour mobile.

```tsx
// ✅ correct — mobile-first
<div className="flex flex-col sm:flex-row gap-4">

// ❌ interdit — desktop-first
<div className="flex flex-row [override mobile quelque part]">
```

---

## 2. i18n — aucune chaîne en dur

Toute chaîne visible par l'utilisateur **doit** passer par `react-intl`.
Les chaînes en dur dans JSX/TSX/attributs `aria-*` sont **interdites**.

### Toujours le hook, toujours destructuré

```tsx
import { useIntl } from 'react-intl'

export function AccountCard(): JSX.Element {
  const { formatMessage, formatNumber } = useIntl()

  return (
    <div aria-label={formatMessage({ id: 'account.card.label' })}>
      <h2>{formatMessage({ id: 'account.card.title' })}</h2>
      <span>
        {formatNumber(account.balance, { style: 'currency', currency: 'EUR' })}
      </span>
    </div>
  )
}
```

`<FormattedMessage />` est **interdit** — utiliser uniquement `useIntl()`.

### Fichiers de traductions
- Placer les catalogues dans `frontend/src/i18n/` : `fr.json`, `en.json`, etc.
- Clé de message : `domaine.composant.élément` (ex : `dashboard.accountCard.balance`)
- La locale par défaut est `fr`.

---

## 3. Class names — `cn()` et syntaxe objet

### Helper `cn`
Toujours utiliser le helper `cn()` (clsx + tailwind-merge) défini dans `src/lib/cn.ts`.

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

### Règles d'utilisation

```tsx
// ✅ correct — syntaxe objet pour les conditionnels
<button
  className={cn(
    'rounded-xl px-4 py-2 text-sm font-medium',
    {
      'bg-primary text-white': variant === 'primary',
      'bg-surface text-foreground border': variant === 'secondary',
      'opacity-50 cursor-not-allowed': disabled,
    }
  )}
>

// ❌ interdit — ternaire de classes
<button className={`btn ${isActive ? 'btn-active' : ''}`}>

// ❌ interdit — concaténation manuelle
<button className={'btn ' + (isActive ? 'btn-active' : '')}>
```

---

## 4. State — Redux Toolkit + RTK Query

### Séparation des responsabilités

| Type d'état | Outil | Exemples |
|---|---|---|
| État client / UI | Redux Toolkit (slices) | Auth, locale, thème, modales ouvertes |
| État serveur | RTK Query | Comptes, transactions, cagnottes |

### Structure des slices
```
frontend/src/store/
├── index.ts          # configureStore
├── auth/
│   └── authSlice.ts  # token, user info, isAuthenticated
└── ui/
    └── uiSlice.ts    # locale, thème
```

### Structure des services RTK Query
```
frontend/src/services/
├── api.ts            # createApi — baseQuery, tagTypes
├── accounts.ts       # injectEndpoints — getAccounts, getAccountById
├── transactions.ts   # injectEndpoints — getTransactions, createTransaction
└── pockets.ts        # injectEndpoints — getPockets, createPocket, updatePocket
```

### Utilisation dans les composants
```tsx
// ✅ correct — hook RTK Query
import { useGetAccountsQuery } from '@/services/accounts'

export function AccountList(): JSX.Element {
  const { data: accounts, isLoading, isError } = useGetAccountsQuery()
  ...
}

// ❌ interdit — fetch brut dans un composant
const [accounts, setAccounts] = useState([])
useEffect(() => { fetch('/api/accounts').then(...) }, [])
```

---

## 5. Typage strict

- Tous les composants ont un type de retour explicite (`JSX.Element` ou `ReactNode`).
- Aucun `any`. Aucun cast `as any`.
- Les props sont typées via une interface nommée `XxxProps`.

```tsx
interface AccountCardProps {
  accountId: string
  variant?: 'default' | 'compact'
}

export function AccountCard({ accountId, variant = 'default' }: AccountCardProps): JSX.Element {
  ...
}
```

---

## 6. Structure des composants

```
frontend/src/
├── components/          # composants réutilisables (pas de logique métier)
│   ├── ui/              # primitives : Button, Card, Badge, Input…
│   └── domain/          # composants métier : AccountCard, PocketCard…
├── pages/               # composants route-level (1 par route)
├── store/               # Redux slices + store config
├── services/            # RTK Query createApi + endpoints
├── i18n/                # catalogues de traduction (fr.json, en.json…)
├── lib/
│   └── cn.ts            # helper cn()
└── styles/
    └── globals.css      # @import Tailwind
```

---

## 7. Accessibilité

- Tous les éléments interactifs ont un `aria-label` ou un texte visible (via `formatMessage`).
- Les images décoratives ont `alt=""`.
- Le contraste des couleurs doit respecter WCAG 2.1 AA (ratio ≥ 4,5:1 pour le texte normal).
- La navigation au clavier doit être fonctionnelle sur toutes les pages.
