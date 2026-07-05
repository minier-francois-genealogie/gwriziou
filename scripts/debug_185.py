import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "bdd" / "genealogie.sqlite"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

for pid in ("@185@", "@54@", "@181@", "@51@"):
    print(f"\n=== {pid} ===")
    row = conn.execute(
        "SELECT nom, prenoms, id_famille_enfant FROM personnes WHERE id_gedcom = ?",
        (pid,),
    ).fetchone()
    print(dict(row))
    print("Children:")
    for r in conn.execute(
        """
        SELECT p.id_gedcom, p.nom, p.prenoms
        FROM famille_enfants fe
        JOIN famille_conjoints fc ON fc.id_famille = fe.id_famille
        JOIN personnes p ON p.id_gedcom = fe.id_enfant
        WHERE fc.id_personne = ?
        """,
        (pid,),
    ):
        print(f"  {r['id_gedcom']} {r['nom']} {r['prenoms']}")
