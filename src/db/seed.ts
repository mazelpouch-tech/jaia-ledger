import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import "dotenv/config";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Settings
  await db.insert(schema.settings).values({
    riadName: "Riad JAÏA",
    email: "contact@riadjaia.com",
    address: "Derb ..., Médina, Marrakech 40000, Maroc",
    phone: "+212 5 24 00 00 00",
    currency: "MAD",
    tvaRate: "10",
  });

  // Rooms
  const roomNames = [
    "Chambre 1", "Chambre 2", "Chambre 3", "Chambre 4", "Chambre 5",
    "Chambre 6", "Chambre 7", "Chambre 8", "Chambre 9",
  ];
  for (const name of roomNames) {
    await db.insert(schema.rooms).values({ name });
  }

  // Categories - Encaissement
  const encCategories = ["Hébergement", "Restaurant", "Spa & Bien-être", "Activités", "Boutique", "Autre recette"];
  for (const name of encCategories) {
    await db.insert(schema.categories).values({ name, type: "encaissement" });
  }

  // Categories - Decaissement
  const decCategories = [
    "Salaires & charges", "Alimentation & boissons", "Entretien & réparations",
    "Fournitures", "Énergie & eau", "Marketing", "Assurance", "Impôts & taxes", "Autre dépense",
  ];
  for (const name of decCategories) {
    await db.insert(schema.categories).values({ name, type: "decaissement" });
  }

  // Currencies
  await db.insert(schema.currencies).values([
    { code: "MAD", rate: "1" },
    { code: "EUR", rate: "10.8" },
    { code: "USD", rate: "10.0" },
    { code: "GBP", rate: "12.5" },
  ]);

  console.log("Seed completed!");
}

seed().catch(console.error);
