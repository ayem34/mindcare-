import psycopg2

print("Début")

conn = psycopg2.connect(
    host="localhost",
    database="sante_mentale",
    user="postgres",
    password="postgres"
)

print("Connexion OK")
conn.close()