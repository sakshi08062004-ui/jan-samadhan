import sqlite3

db_path = 'jan_samadhan_fullstack.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Current tables before removal:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(tables)

# Remove admins table
try:
    cursor.execute("DROP TABLE IF EXISTS admins;")
    print("✅ admins table DROPPED")
except Exception as e:
    print(f"Error dropping admins: {e}")

conn.commit()
conn.close()

print("\n✅ admins table removed from database!")
print("Remaining tables: departments, user_profiles + original tables")
