

# Forbedret duplikat-detektion ved import

## Problem
Den nuværende duplikat-detektion matcher kun på `bilag + dato`, hvilket kan give false positives/negatives. Derudover ser brugeren ikke i forhåndsvisningen hvilke rækker der allerede findes.

## Ændringer

### 1. Forbedret duplikat-nøgle (`ImportTab.tsx`)
- Udvid match-nøglen til `bilag + dato + konto + belob` for mere præcis detektion
- Samme nøgle bruges ved både filtrering og preview-markering

### 2. Vis duplikater i forhåndsvisningen
- Marker duplikat-rækker visuelt (grå/strikethrough) i preview-tabellen
- Vis tæller: "X nye posteringer, Y duplikater sprunget over"
- Opdater import-knappen til kun at vise antal nye: "Importér X nye posteringer"

### 3. Automatisk filtrering
- Preview filtrerer automatisk duplikater fra, men viser dem stadig med markering
- Import-funktionen overfører kun de nye posteringer (som nu, men med bedre nøgle)

