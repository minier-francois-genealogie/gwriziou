#!/usr/bin/env python3
"""Enrichit france.json avec naissance, deces, regime et faits marquants."""

from __future__ import annotations

import json
from pathlib import Path

DATA_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "histoire"
    / "dirigeants"
    / "france.json"
)

ENRICHMENT: dict[str, dict] = {
    "louis_xii": {
        "naissance": "1462",
        "deces": "1515",
        "regime": "Monarchie",
        "faits_positifs": ["Conquête du duché de Milan", "Ordonnance de Villers-Cotterêts"],
        "faits_negatifs": ["Guerres d'Italie coûteuses", "Traité de Blois cédant la Bourgogne"],
    },
    "francois_i": {
        "naissance": "1494",
        "deces": "1547",
        "regime": "Monarchie",
        "faits_positifs": ["Renaissance à la cour", "Château de Chambord", "Alliance avec Soliman"],
        "faits_negatifs": ["Défaite de Pavie (1525)", "Guerres d'Italie prolongées"],
    },
    "henri_ii": {
        "naissance": "1519",
        "deces": "1559",
        "regime": "Monarchie",
        "faits_positifs": ["Expansion coloniale (Canada)", "Traité de Cateau-Cambrésis"],
        "faits_negatifs": ["Persécutions religieuses", "Chambre ardente contre les protestants"],
    },
    "francois_ii": {
        "naissance": "1544",
        "deces": "1560",
        "regime": "Monarchie",
        "faits_positifs": ["Tentative de conciliation religieuse"],
        "faits_negatifs": ["Règne très bref", "Influence de la famille de Guise"],
    },
    "charles_ix": {
        "naissance": "1550",
        "deces": "1574",
        "regime": "Monarchie",
        "faits_positifs": ["Paix de Saint-Germain (1570)"],
        "faits_negatifs": ["Massacre de la Saint-Barthélemy (1572)", "Guerres de Religion"],
    },
    "henri_iii": {
        "naissance": "1551",
        "deces": "1589",
        "regime": "Monarchie",
        "faits_positifs": ["Édit de Nemours", "Entrée à Paris (1590)"],
        "faits_negatifs": ["Assassinat du duc de Guise", "Guerres de Religion prolongées"],
    },
    "henri_iv": {
        "naissance": "1553",
        "deces": "1610",
        "regime": "Monarchie",
        "faits_positifs": ["Édit de Nantes (1598)", "Paix civile", "Développement économique"],
        "faits_negatifs": ["Conversion au catholicisme controversée", "Assassinat par Ravaillac"],
    },
    "louis_xiii": {
        "naissance": "1601",
        "deces": "1643",
        "regime": "Monarchie",
        "faits_positifs": ["Richelieu consolide l'État", "Victoire contre les Espagnols"],
        "faits_negatifs": ["Guerre de Trente Ans coûteuse", "Répression des nobles"],
    },
    "louis_xiv": {
        "naissance": "1638",
        "deces": "1715",
        "regime": "Monarchie absolue",
        "faits_positifs": ["Versailles", "Code noir révisé", "Rayonnement culturel"],
        "faits_negatifs": ["Révocation de l'Édit de Nantes", "Guerres ruineuses", "Famine de 1693"],
    },
    "louis_xv": {
        "naissance": "1710",
        "deces": "1774",
        "regime": "Monarchie absolue",
        "faits_positifs": ["École militaire", "Lumières à la cour"],
        "faits_negatifs": ["Perte du Canada (1763)", "Affaire Damiens", "Déclin financier"],
    },
    "louis_xvi": {
        "naissance": "1754",
        "deces": "1793",
        "regime": "Monarchie absolue",
        "faits_positifs": ["Soutien à la guerre d'indépendance américaine", "Abolition des servitudes"],
        "faits_negatifs": ["Révolution française", "Crise financière", "Exécution à la guillotine"],
    },
    "napoleon_i": {
        "naissance": "1769",
        "deces": "1821",
        "regime": "Ier Empire",
        "faits_positifs": ["Code civil", "Réforme administrative", "Victoires militaires"],
        "faits_negatifs": ["Guerres napoléoniennes", "Blocus continental", "Campagne de Russie"],
    },
    "louis_xviii": {
        "naissance": "1755",
        "deces": "1824",
        "regime": "Restauration",
        "faits_positifs": ["Charte constitutionnelle (1814)", "Stabilisation post-révolution"],
        "faits_negatifs": ["Terreur blanche", "Occupation étrangère"],
    },
    "charles_x": {
        "naissance": "1757",
        "deces": "1836",
        "regime": "Restauration",
        "faits_positifs": ["Expédition d'Alger (1830)"],
        "faits_negatifs": ["Ordonnances de juillet", "Révolution de 1830"],
    },
    "louis_philippe": {
        "naissance": "1773",
        "deces": "1850",
        "regime": "Monarchie de Juillet",
        "faits_positifs": ["Développement ferroviaire", "Colonisation algérienne"],
        "faits_negatifs": ["Corruption du régime", "Révolution de 1848"],
    },
    "napoleon_iii": {
        "naissance": "1808",
        "deces": "1873",
        "regime": "IIe Empire",
        "faits_positifs": ["Grands travaux parisiens", "Modernisation économique"],
        "faits_negatifs": ["Coup d'État du 2 décembre", "Défaite de Sedan (1870)"],
    },
    "mac_mahon": {
        "naissance": "1808",
        "deces": "1893",
        "regime": "IIIe République",
        "faits_positifs": ["Stabilisation républicaine", "Lois constitutionnelles de 1875"],
        "faits_negatifs": ["Crise du 16 mai", "Répression de la Commune"],
    },
    "grevy": {
        "naissance": "1807",
        "deces": "1891",
        "regime": "IIIe République",
        "faits_positifs": ["Séparation pouvoirs exécutif/législatif", "Paix extérieure"],
        "faits_negatifs": ["Affaire Wilson", "Démission forcée"],
    },
    "carnot": {
        "naissance": "1837",
        "deces": "1894",
        "regime": "IIIe République",
        "faits_positifs": ["Lois scolaires laïques", "Alliance avec la Russie"],
        "faits_negatifs": ["Assassinat par Caserio", "Crise boulangiste"],
    },
    "faure": {
        "naissance": "1841",
        "deces": "1899",
        "regime": "IIIe République",
        "faits_positifs": ["Rapprochement franco-russe", "Exposition universelle 1900"],
        "faits_negatifs": ["Affaire Dreyfus", "Mort subite à l'Élysée"],
    },
    "loubet": {
        "naissance": "1838",
        "deces": "1929",
        "regime": "IIIe République",
        "faits_positifs": ["Entente cordiale (1904)", "Loi sur les associations"],
        "faits_negatifs": ["Crise des églises", "Tensions coloniales"],
    },
    "fallieres": {
        "naissance": "1841",
        "deces": "1931",
        "regime": "IIIe République",
        "faits_positifs": ["Création du Conseil supérieur de la pêche"],
        "faits_negatifs": ["Agadir (1911)", "Montée des tensions européennes"],
    },
    "poincare": {
        "naissance": "1860",
        "deces": "1934",
        "regime": "IIIe République",
        "faits_positifs": ["Victoire de la Marne", "Réforme des retraites"],
        "faits_negatifs": ["Première Guerre mondiale", "Occupation du Ruhr"],
    },
    "millerand": {
        "naissance": "1859",
        "deces": "1943",
        "regime": "IIIe République",
        "faits_positifs": ["Participation à la Conférence de paix"],
        "faits_negatifs": ["Conflit avec la Chambre", "Démission forcée"],
    },
    "doumer": {
        "naissance": "1857",
        "deces": "1932",
        "regime": "IIIe République",
        "faits_positifs": ["Présidence de la Conférence de Lausanne"],
        "faits_negatifs": ["Assassinat par Gorguloff", "Crise économique"],
    },
    "lebrun": {
        "naissance": "1871",
        "deces": "1950",
        "regime": "IIIe République",
        "faits_positifs": ["Front populaire (1936)", "Lois sociales"],
        "faits_negatifs": ["Défaite de 1940", "Capitulation"],
    },
    "petain": {
        "naissance": "1856",
        "deces": "1951",
        "regime": "Régime de Vichy",
        "faits_positifs": ["Héros de Verdun (1916)"],
        "faits_negatifs": ["Collaboration nazie", "Rafle du Vel d'Hiv", "Condamnation pour haute trahison"],
    },
    "de_gaulle_gprf": {
        "naissance": "1890",
        "deces": "1970",
        "regime": "GPRF",
        "faits_positifs": ["Libération de la France", "Droit de vote des femmes", "Sécurité sociale"],
        "faits_negatifs": ["Épuration", "Guerre d'Indochine relancée"],
    },
    "auriol": {
        "naissance": "1884",
        "deces": "1966",
        "regime": "IVe République",
        "faits_positifs": ["Plan Marshall", "Création de la CEE"],
        "faits_negatifs": ["Guerre d'Indochine", "Instabilité gouvernementale"],
    },
    "coty": {
        "naissance": "1882",
        "deces": "1962",
        "regime": "IVe République",
        "faits_positifs": ["Début de la Ve République", "Paix en Tunisie"],
        "faits_negatifs": ["Crise d'Alger", "Guerre d'Algérie"],
    },
    "de_gaulle": {
        "naissance": "1890",
        "deces": "1970",
        "regime": "Ve République",
        "faits_positifs": ["Indépendance de l'Algérie", "Force de dissuasion", "May 68 maîtrisé"],
        "faits_negatifs": ["Répression en Algérie", "Quitte le pouvoir après référendum"],
    },
    "pompidou": {
        "naissance": "1911",
        "deces": "1974",
        "regime": "Ve République",
        "faits_positifs": ["Modernisation économique", "Centre Pompidou"],
        "faits_negatifs": ["Mai 68", "Décès en fonctions"],
    },
    "giscard": {
        "naissance": "1926",
        "deces": "2020",
        "regime": "Ve République",
        "faits_positifs": ["Majorité à 18 ans", "IVG (loi Veil)", "Abolition de la peine de mort"],
        "faits_negatifs": ["Crise économique des années 1970", "Affaires politico-financières"],
    },
    "mitterrand": {
        "naissance": "1916",
        "deces": "1996",
        "regime": "Ve République",
        "faits_positifs": ["Abolition de la peine de mort", "Construction européenne", "Grands travaux"],
        "faits_negatifs": ["Cohabitations", "Affaires de financement", "Sida peu anticipé"],
    },
    "chirac": {
        "naissance": "1932",
        "deces": "2019",
        "regime": "Ve République",
        "faits_positifs": ["Opposition à la guerre en Irak", "Loi Taubira"],
        "faits_negatifs": ["Emplois fictifs", "Grèves de 1995"],
    },
    "sarkozy": {
        "naissance": "1955",
        "deces": "",
        "regime": "Ve République",
        "faits_positifs": ["Présidence du G20", "Réforme des retraites"],
        "faits_negatifs": ["Crise financière 2008", "Affaires judiciaires"],
    },
    "hollande": {
        "naissance": "1954",
        "deces": "",
        "regime": "Ve République",
        "faits_positifs": ["Accord de Paris sur le climat", "Mariage pour tous"],
        "faits_negatifs": ["Chômage élevé", "Attentats de 2015-2016"],
    },
    "macron": {
        "naissance": "1977",
        "deces": "",
        "regime": "Ve République",
        "faits_positifs": ["Loi climat", "Réforme des retraites (2023)"],
        "faits_negatifs": ["Gilets jaunes", "Crise covid mal gérée selon critiques"],
    },
}


LIENS_PREDECESSEUR: dict[str, str] = {
    "louis_xii": "Cousin de Charles VIII",
    "francois_i": "Cousin de Louis XII",
    "henri_ii": "Fils de François Ier",
    "francois_ii": "Fils d'Henri II",
    "charles_ix": "Frère de François II",
    "henri_iii": "Frère de Charles IX",
    "henri_iv": "Cousin de Henri III",
    "louis_xiii": "Fils d'Henri IV",
    "louis_xiv": "Fils de Louis XIII",
    "louis_xv": "Arrière-petit-fils de Louis XIV",
    "louis_xvi": "Petit-fils de Louis XV",
    "louis_xviii": "Frère de Louis XVI",
    "charles_x": "Frère de Louis XVIII",
    "louis_philippe": "Cousin de Charles X",
    "napoleon_iii": "Neveu de Napoléon Ier",
}


def main() -> None:
    if not DATA_FILE.is_file():
        raise SystemExit(f"Fichier introuvable : {DATA_FILE}")

    rows = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    missing: list[str] = []
    for row in rows:
        slug = row.get("slug", "")
        extra = ENRICHMENT.get(slug)
        if not extra:
            missing.append(slug)
            continue
        row.update(extra)
        lien = LIENS_PREDECESSEUR.get(slug)
        if lien:
            row["lien_predecesseur"] = lien
        elif "lien_predecesseur" in row and not row.get("lien_predecesseur"):
            row.pop("lien_predecesseur", None)

    if missing:
        raise SystemExit(f"Enrichissement manquant pour : {', '.join(missing)}")

    DATA_FILE.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Enrichi : {len(rows)} dirigeants -> {DATA_FILE}")


if __name__ == "__main__":
    main()
