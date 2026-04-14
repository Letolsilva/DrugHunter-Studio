"""Migração manual: adiciona colunas target e base_input_path à tabela user_pdb_csv."""
import sqlite3

DB_PATH = "pdb_explorer.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(user_pdb_csv)")
colunas = {row[1] for row in cur.fetchall()}

if "target" not in colunas:
    cur.execute("ALTER TABLE user_pdb_csv ADD COLUMN target VARCHAR(255)")
    print("Coluna 'target' adicionada.")
else:
    print("Coluna 'target' já existe.")

if "base_input_path" not in colunas:
    cur.execute("ALTER TABLE user_pdb_csv ADD COLUMN base_input_path VARCHAR(512)")
    print("Coluna 'base_input_path' adicionada.")
else:
    print("Coluna 'base_input_path' já existe.")

conn.commit()
conn.close()
print("Migração concluída.")
