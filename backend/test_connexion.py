from dotenv import load_dotenv
import psycopg

load_dotenv()

try:
    conn = psycopg.connect(
        host="localhost",
        port=5432,
        dbname="sante_mentale",
        user="postgres",
        password="ayem34"
    )

    print("✅ Connexion PostgreSQL réussie !")

    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(cur.fetchone())

    cur.close()
    conn.close()

except Exception as e:
    print("❌ Erreur :")
    print(type(e))
    print(e)