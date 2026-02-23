# Feature Specification: Transactions — Vue unifiée, filtres et catégorisation

**Feature Branch**: `004-transactions`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "Vue unifiée, catégorisation et filtres sur les transactions bancaires importées et saisies manuellement"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vue unifiée de toutes les transactions (Priority: P1)

En tant qu'utilisateur, je veux voir toutes mes transactions (importées depuis mon relevé bancaire et saisies manuellement) dans une seule liste chronologique, afin d'avoir une vision complète de mes flux financiers sans jongler entre plusieurs écrans.

**Why this priority**: C'est la valeur fondamentale de la feature. Sans cette vue consolidée, l'utilisateur doit naviguer entre la page d'import et le formulaire de saisie manuelle sans jamais avoir de vue d'ensemble cohérente.

**Independent Test**: Peut être testé dès qu'il y a des transactions importées et des dépenses manuelles en base — l'utilisateur accède à la page Transactions et voit les deux types dans une seule liste triée par date.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec des transactions CSV importées et des dépenses manuelles, **When** il accède à la page Transactions, **Then** il voit toutes ses transactions dans une liste unique triée par date décroissante, avec indication visuelle de la source (CSV ou manuelle).
2. **Given** une longue liste de transactions, **When** l'utilisateur scrolle vers le bas, **Then** les transactions suivantes se chargent automatiquement sans perte de contexte ni rechargement de page.
3. **Given** une transaction dans la liste, **When** l'utilisateur clique dessus, **Then** il voit le détail complet : date, montant, libellé, détail (si présent), catégorie, source et statut de rapprochement.
4. **Given** un utilisateur sans aucune transaction, **When** il accède à la page, **Then** un état vide lui indique comment importer un relevé ou saisir sa première dépense.

---

### User Story 2 - Filtrer et rechercher les transactions (Priority: P2)

En tant qu'utilisateur, je veux filtrer mes transactions par période, catégorie et sens (dépense/entrée), et rechercher par texte dans le libellé, afin de retrouver rapidement une transaction ou d'analyser un poste de dépenses spécifique.

**Why this priority**: Une liste sans filtres devient inutilisable après quelques mois d'historique. Les filtres sont essentiels pour toute analyse financière personnelle.

**Independent Test**: Peut être testé avec des transactions en base de périodes et catégories différentes — appliquer un filtre de période et vérifier que seules les transactions concernées apparaissent.

**Acceptance Scenarios**:

1. **Given** une liste de transactions, **When** l'utilisateur définit une plage de dates (ex: du 01/01 au 31/01/2026), **Then** seules les transactions de cette période sont affichées avec le total des dépenses et des entrées.
2. **Given** une liste de transactions, **When** l'utilisateur sélectionne une ou plusieurs catégories, **Then** seules les transactions de ces catégories sont affichées.
3. **Given** une liste de transactions, **When** l'utilisateur saisit "CARREFOUR" dans la recherche, **Then** toutes les transactions dont le libellé ou le détail contient "CARREFOUR" (insensible à la casse) sont affichées.
4. **Given** plusieurs filtres actifs simultanément, **When** l'utilisateur clique "Réinitialiser les filtres", **Then** tous les filtres sont effacés et la liste complète réapparaît.
5. **Given** des filtres actifs dont la combinaison ne retourne aucun résultat, **When** la liste est vide, **Then** un message indique qu'aucune transaction ne correspond et propose de modifier les filtres.

---

### User Story 3 - Catégoriser les transactions (Priority: P3)

En tant qu'utilisateur, je veux que mes transactions soient automatiquement catégorisées lors de l'import, et pouvoir corriger manuellement la catégorie de n'importe quelle transaction, afin de maintenir un suivi précis de mes dépenses par poste.

**Why this priority**: La catégorisation est le fondement de l'analyse financière et du dashboard (Phase 4). Une catégorisation correcte dès l'import réduit le travail manuel.

**Independent Test**: Peut être testé en important un CSV avec des libellés connus (ex: "CARREFOUR", "SNCF") et en vérifiant les catégories assignées, puis en modifiant manuellement une catégorie incorrecte.

**Acceptance Scenarios**:

1. **Given** une transaction importée avec le libellé "CARTE CARREFOUR MARKET", **When** elle est importée, **Then** la catégorie Alimentation lui est automatiquement assignée.
2. **Given** une transaction dont le libellé ne correspond à aucune règle connue, **When** elle est importée, **Then** elle est catégorisée comme "Non catégorisée" et mise en évidence dans la liste.
3. **Given** une transaction catégorisée, **When** l'utilisateur sélectionne une autre catégorie, **Then** la modification est enregistrée immédiatement et visible dans la liste.
4. **Given** une transaction recatégorisée manuellement, **When** le même fichier CSV est réimporté (déduplication), **Then** la catégorie choisie manuellement est conservée et non écrasée.
5. **Given** la liste des transactions, **When** l'utilisateur filtre par "Non catégorisée", **Then** seules les transactions sans catégorie assignée sont affichées.

---

### User Story 4 - Gérer ses catégories personnalisées (Priority: P4)

En tant qu'utilisateur, je veux créer, renommer et supprimer mes propres catégories de dépenses, afin d'adapter le suivi à ma situation personnelle (ex: "Sport", "Enfants", "Vacances").

**Why this priority**: Les catégories prédéfinies ne couvrent pas tous les cas de vie. La personnalisation améliore la pertinence des analyses et l'adoption de l'outil.

**Independent Test**: Peut être testé en créant une catégorie personnalisée et en l'assignant à une transaction, indépendamment de la catégorisation automatique.

**Acceptance Scenarios**:

1. **Given** un utilisateur sur la page de gestion des catégories, **When** il crée une catégorie "Sport" avec une couleur verte, **Then** elle apparaît dans la liste des catégories et est disponible pour catégoriser des transactions.
2. **Given** une catégorie personnalisée utilisée par des transactions, **When** l'utilisateur la supprime, **Then** les transactions concernées passent à "Non catégorisée" et un message de confirmation indique le nombre de transactions impactées.
3. **Given** une catégorie existante, **When** l'utilisateur la renomme, **Then** toutes les transactions qui l'utilisaient affichent immédiatement le nouveau nom.
4. **Given** les catégories prédéfinies système (Alimentation, Transport, etc.), **When** l'utilisateur tente de les supprimer, **Then** la suppression est refusée avec un message explicatif.

---

### Edge Cases

- Que se passe-t-il si une transaction a été manuellement recatégorisée et qu'un nouveau CSV est importé avec la même transaction (déduplication) ?
- Comment afficher une transaction avec un montant de 0 € (ex: remboursement intégral) ?
- Que faire si le libellé d'une transaction est vide ou contient uniquement des caractères spéciaux ?
- Comment gérer la pagination si de nouvelles transactions sont importées pendant que l'utilisateur consulte la liste ?
- Que se passe-t-il si l'utilisateur supprime une catégorie qui est utilisée dans des règles de catégorisation automatique ?
- Comment représenter une transaction rapprochée (liée à la fois à un import CSV et à une dépense manuelle) — quelle source afficher ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT afficher une vue unifiée de toutes les transactions de l'utilisateur (importées CSV et saisies manuelles) dans une liste unique triée par date décroissante.
- **FR-002**: La liste DOIT distinguer visuellement les transactions importées (CSV) des transactions saisies manuellement.
- **FR-003**: Le système DOIT supporter le chargement progressif (pagination) sans rechargement de page ni perte du contexte de défilement.
- **FR-004**: Le système DOIT permettre le filtrage des transactions par plage de dates (date de début et/ou date de fin).
- **FR-005**: Le système DOIT permettre le filtrage des transactions par catégorie (une ou plusieurs catégories simultanément).
- **FR-006**: Le système DOIT permettre le filtrage par sens du mouvement (dépenses uniquement / entrées uniquement / les deux).
- **FR-007**: Le système DOIT permettre la recherche en texte libre sur le libellé et le champ détail d'une transaction (insensible à la casse).
- **FR-008**: L'affichage du total des montants filtrés (somme des dépenses, somme des entrées) DOIT être mis à jour en temps réel lorsque les filtres changent.
- **FR-009**: Le système DOIT afficher le détail complet d'une transaction : date, montant, libellé, détail, catégorie, source et statut de rapprochement.
- **FR-010**: Le système DOIT catégoriser automatiquement les transactions à l'import en appliquant des règles basées sur le libellé.
- **FR-011**: Les transactions dont le libellé ne correspond à aucune règle DOIVENT être catégorisées comme "Non catégorisée" et mises en évidence dans la liste.
- **FR-012**: Le système DOIT permettre à l'utilisateur de modifier manuellement la catégorie de n'importe quelle transaction.
- **FR-013**: La catégorie d'une transaction modifiée manuellement DOIT être préservée lors d'un ré-import de la même transaction.
- **FR-014**: Le système DOIT fournir des catégories prédéfinies non supprimables (Alimentation, Transport, Logement, Santé, Loisirs, Autre).
- **FR-015**: Le système DOIT permettre à l'utilisateur de créer des catégories personnalisées avec un nom et une couleur.
- **FR-016**: Le système DOIT permettre à l'utilisateur de renommer et supprimer ses catégories personnalisées.
- **FR-017**: La suppression d'une catégorie DOIT recatégoriser automatiquement les transactions concernées comme "Non catégorisée" après confirmation de l'utilisateur.
- **FR-018**: Le système DOIT fournir des règles de catégorisation système prédéfinies (ex: "CARREFOUR" → Alimentation) ET permettre à l'utilisateur de créer ses propres règles personnalisées (condition sur le libellé → catégorie cible), qui sont appliquées en priorité sur les règles système lors de l'import.
- **FR-019**: Le système DOIT permettre à l'utilisateur de créer, modifier et supprimer ses règles de catégorisation personnalisées.
- **FR-020**: Les règles personnalisées de l'utilisateur DOIVENT être appliquées en priorité sur les règles système lors de la catégorisation automatique.
- **FR-021**: La suppression d'une règle NE DOIT PAS recatégoriser rétroactivement les transactions déjà catégorisées par cette règle.

### Key Entities

- **Transaction unifiée**: Représentation commune d'un mouvement financier, qu'il provienne d'un import CSV ou d'une saisie manuelle. Porte une date, un montant, un libellé, un détail optionnel, une catégorie, une source et un statut de rapprochement.
- **Catégorie**: Libellé et couleur permettant de classifier une transaction. Peut être prédéfinie par le système (non supprimable) ou créée par l'utilisateur (modifiable/supprimable).
- **Règle de catégorisation**: Association entre un mot-clé (présent dans le libellé) et une catégorie cible. Peut être prédéfinie par le système (non modifiable) ou créée par l'utilisateur (prioritaire sur les règles système, modifiable/supprimable).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% des transactions d'un relevé bancaire réel sont catégorisées automatiquement avec la catégorie attendue, sans intervention manuelle.
- **SC-002**: Un utilisateur retrouve une transaction spécifique parmi 6 mois d'historique en moins de 30 secondes en utilisant les filtres ou la recherche.
- **SC-003**: La liste de transactions (première page) s'affiche en moins de 2 secondes, même avec plus de 500 transactions en base.
- **SC-004**: La recatégorisation manuelle d'une transaction se fait en moins de 5 secondes (sélection → choix de catégorie → confirmation visuelle).
- **SC-005**: 90% des nouveaux utilisateurs réussissent à créer une catégorie personnalisée et à l'assigner à une transaction lors d'une première utilisation sans aide.

## Assumptions

- Les catégories système prédéfinies (Alimentation, Transport, Logement, Santé, Loisirs, Autre) sont disponibles par défaut pour tous les utilisateurs et ne peuvent pas être supprimées.
- Les règles de catégorisation automatique sont basées sur des correspondances de mots-clés dans le libellé. Il existe deux niveaux de règles : les règles système prédéfinies et les règles personnalisées créées par l'utilisateur (prioritaires sur les règles système).
- Un utilisateur ne voit et ne modifie que ses propres transactions et catégories.
- La pagination est en cursor-based pour éviter les décalages lors de nouveaux imports pendant la navigation.
- Les dépenses manuelles existantes (Phase 3) sont intégrées dans la vue unifiée avec leur catégorie déjà définie.
- La recherche plein texte porte sur le libellé et le champ détail uniquement, pas sur la catégorie ni la date.
- Le tri par défaut est date décroissante ; d'autres tris (montant, catégorie) ne sont pas dans le périmètre de cette phase.

## Dependencies

- **Dépend de 003-csv-import**: Les modèles `ImportedTransaction` et `ManualExpense` doivent exister et être alimentés pour que cette feature ait de la valeur.
- Les données de rapprochement (Phase 3) sont affichées en lecture seule dans le détail d'une transaction.
