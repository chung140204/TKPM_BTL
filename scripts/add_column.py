import sqlite3
conn = sqlite3.connect('prisma/dev.db')
try:
    conn.execute('ALTER TABLE ContractDocument ADD COLUMN documentType TEXT NOT NULL DEFAULT "CONTRACT"')
    conn.commit()
    print('Column added OK')
except Exception as e:
    print(f'Error (may already exist): {e}')
conn.close()
