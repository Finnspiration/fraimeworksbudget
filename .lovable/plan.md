

# Sticky headers + YTD Budget omsætning

## 1. Sticky table headers

ResultatTab har allerede `sticky top-0` på `<thead>`, men det virker kun hvis parent-containeren har en fast højde med scroll. Lige nu scroller hele siden — `overflow-auto` på wrapperen gør intet uden en max-height.

**Løsning:** Giv table-wrapperen (`div.overflow-auto`) en `max-h-[calc(100vh-220px)]` så tabellen scroller internt og thead forbliver synlig.

### Filer:

**`src/components/budget/ResultatTab.tsx`** (linje 218)
- Tilføj `max-h-[calc(100vh-220px)]` til `<div className="overflow-auto ...">` wrapperen

**`src/components/budget/PipelineTab.tsx`** (linje 171-173)
- Tilføj `sticky top-0 z-10 bg-card` til pipeline-tabellens `<thead>` (linje 173)
- Tilføj `max-h-[calc(100vh-400px)]` til `<div className="overflow-auto">` wrapperen (linje 171)

Kundetabellen er en simpel liste uden `<table>`, så sticky header er ikke relevant der.

## 2. YTD Budget omsætning i Overblik

**`src/components/budget/OverblikTab.tsx`** (linje 44-45, 97)

Beregn `ytdOmsBud` (budget-omsætning YTD) og vis det som `sub`-tekst under YTD Omsætning KPI-kortet:

```typescript
const ytdOmsBud = omsRow ? sumArr(omsRow.b, 0, nReal - 1) : 0;
```

Opdatér KpiCard for YTD Omsætning (ca. linje 97) til:
```
sub={`Budget: ${fmt(ytdOmsBud)} kr`}
positive={ytdOms >= ytdOmsBud}
```

