import psycopg

try:
    conn = psycopg.connect(
        "host=localhost dbname=sante_mentale user=postgres password=ayem34"
    )

    print("Connexion OK")
    conn.close()

except Exception as e:
    print(type(e))
    print(e)