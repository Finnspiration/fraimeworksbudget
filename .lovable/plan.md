

# Kundedatabase med salgspipeline

## Overblik

Sæt Supabase op som backend og byg en ny "Pipeline"-fane hvor du kan indtaste kunder og jobs med beskrivelse, forventet betalingsdato, beløb og sandsynlighed. Den vægtede pipeline (beløb × sandsynlighed) integreres i budgettet.

## 1. Supabase setup

Aktivér Lovable Cloud (Supabase) og opret følgende tabeller:

**`customers`**
- `id` (uuid, PK)
- `name` (text, not null)
- `contact_email` (text)
- `notes` (text)
- `created_at` (timestamptz)

**`pipeline_jobs`**
- `id` (uuid, PK)
- `customer_id` (uuid, FK → customers)
- `description` (text, not null)
- `amount` (numeric, not null) — forventet beløb ekskl. moms
- `probability` (integer, 0-100) — sandsynlighed i %
- `expected_payment_date` (date, not null)
- `status` (text: 'lead', 'tilbud', 'forhandling', 'vundet', 'tabt')
- `konto` (integer) — kontonummer fra kontoplanen (default: omsætningskonto)
- `notes` (text)
- `created_at` (timestamptz)

RLS: Åben for authenticated users (single-user app). Evt. kan vi tilføje auth senere.

## 2. Ny fane: "Pipeline"

Tilføj 5. fane med ikon (Funnel/Target) i `Index.tsx`.

**Pipeline-fanen viser:**
- **Kunde-sektion**: Simpel tabel med kunder (navn, email, noter). Tilføj/rediger/slet.
- **Pipeline-tabel**: Alle jobs med kolonner: Kunde, Beskrivelse, Beløb, Sandsynlighed, Vægtet beløb, Forventet dato, Status. Sorteret efter dato.
- **Pipeline-summary cards**: Total pipeline, vægtet pipeline, antal aktive jobs
- **Tilføj job**: Dialog/form med felter for kunde (dropdown), beskrivelse, beløb, sandsynlighed (slider 0-100%), forventet betalingsdato, status, kontonummer

## 3. Integration med budget

Den vægtede pipeline (beløb × sandsynlighed/100) fordeles på måneder baseret på forventet betalingsdato og vises som en ekstra "Pipeline forecast" kolonne/linje i budgettet.

**I `use-budget-state.ts`:**
- Hent pipeline_jobs fra Supabase
- Beregn `pipelineBudget`: for hvert job, tilføj `amount × probability/100` til den måned som `expected_payment_date` falder i, på den relevante konto
- Merge med eksisterende budget: `budget + pipelineBudget`

**I `ResultatTab.tsx`:**
- Vis pipeline-bidraget visuelt (f.eks. som en tredje farve/markering i budget-cellerne)

**I `OverblikTab.tsx`:**
- Tilføj KPI-card: "Pipeline (vægtet)" med total vægtet beløb

## 4. Filer der oprettes/ændres

| Fil | Handling |
|---|---|
| `src/integrations/supabase/client.ts` | Oprettes — Supabase client |
| `supabase/migrations/001_pipeline.sql` | Migration med customers + pipeline_jobs tabeller |
| `src/components/budget/PipelineTab.tsx` | **Ny** — Pipeline-fane med CRUD |
| `src/hooks/use-pipeline.ts` | **Ny** — React Query hooks for pipeline data |
| `src/hooks/use-budget-state.ts` | Ændres — integrer pipeline i budget |
| `src/pages/Index.tsx` | Ændres — tilføj Pipeline-fane |
| `src/components/budget/OverblikTab.tsx` | Ændres — pipeline KPI |

## 5. Rækkefølge

1. Aktivér Supabase / Lovable Cloud
2. Opret database-tabeller (migration)
3. Byg Pipeline-fane med CRUD
4. Integrer vægtet pipeline i budget-beregninger
5. Vis pipeline-KPI på dashboard

