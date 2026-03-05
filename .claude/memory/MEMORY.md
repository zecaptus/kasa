# Kasa Project Memory

## Icon Convention (`frontend/src/icons/`)

Chaque icône SVG suit ce pattern strict :

- `type.ts` exporte `IconProps = { className?: string }` — type partagé par toutes les icônes
- Un fichier `<Name>.tsx` par icône, composant nommé `<Name>Icon`
- `import type { IconProps } from './type'` (import de type uniquement)
- SVG : `viewBox="0 -960 960 960"`, `fill="currentColor"`, `className={className}`
- Premier enfant SVG : `<title>NomIcon</title>`
- Return wrappé en parenthèses, JSX auto-fermant sur les éléments vides
- **Source** : toujours prendre les SVG sur https://fonts.google.com/icons (Material Icons)

Exemple de référence : `Plus.tsx`, `Dashbord.tsx`, `Transactions.tsx`

## Biome — règles à respecter

- **Complexité cognitive max : 10** (`lint/complexity/noExcessiveCognitiveComplexity`)
- Dès qu'une fonction devient complexe, extraire des helpers (comme `buildRecurringClauses()`)
- Toujours lancer `pnpm check` avant de committer

## Navigation active state

- `MenuItem` utilise `NavLink` (react-router) avec `className` en fonction pour détecter `isActive`
- Lien racine `to="/"` doit toujours avoir la prop `end` pour éviter le match sur toutes les routes
