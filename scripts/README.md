# Scripts généalogie

## Scripts actifs (à rejouer)

| Script | Commande | Sortie |
|--------|----------|--------|
| **`generate_ascendance_table.py`** | `python scripts/generate_ascendance_table.py` | `data/ascendance_ged_actes.xlsx` — tableau SOSA GEDCOM + actes, style Excel |
| **`analyze_ascendance.py`** | `python scripts/analyze_ascendance.py` | `scripts/ascendance_analysis.json` — analyse structure ascendance GEDCOM |

### Modules partagés (ne pas supprimer)

- `act_path_normalize.py` — normalisation noms/chemins actes (ASCII)
- `gedcom_dates.py` — parsing dates GEDCOM → ISO

---

## Archive (`archive/`)

Scripts ponctuels déjà exécutés : migrations actes v1→v2, renommages, nettoyage placeholders, vérification `ancetres.xls`, etc.

Rapports JSON historiques : `archive/reports/`.

Pour relancer un script archivé (depuis la racine `cursor_ws`) :

```bash
python scripts/archive/nom_du_script.py
```

Les scripts archivés remontent automatiquement vers `scripts/` pour importer `act_path_normalize` et `gedcom_dates`.
