import psycopg

try:
    conn = psycopg.connect(
        "host=localhost dbname=postgres user=postgres password=postgres"
    )
    print("Connexion OK")
    conn.close()
except Exception as e:
    print(type(e))
    print(e)