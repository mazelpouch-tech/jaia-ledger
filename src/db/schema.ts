import { pgTable, serial, text, numeric, date, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  riadName: text("riad_name").notNull().default("Riad JAÏA"),
  email: text("email").default("contact@riadjaia.com"),
  address: text("address").default("Derb ..., Médina, Marrakech 40000, Maroc"),
  phone: text("phone").default("+212 5 24 00 00 00"),
  currency: text("currency").default("MAD"),
  ice: text("ice").default(""),
  rc: text("rc").default(""),
  tvaRate: numeric("tva_rate", { precision: 5, scale: 2 }).default("10"),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'encaissement' or 'decaissement'
});

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  rate: numeric("rate", { precision: 10, scale: 4 }).notNull().default("1"),
});

export const encaissements = pgTable("encaissements", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  reference: text("reference").notNull(),
  checkIn: date("check_in"),
  checkOut: date("check_out"),
  categoryId: integer("category_id").references(() => categories.id),
  roomId: integer("room_id").references(() => rooms.id),
  client: text("client"),
  description: text("description").notNull(),
  currency: text("currency").default("MAD"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }).default("1"),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const decaissements = pgTable("decaissements", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  reference: text("reference").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  supplier: text("supplier"),
  description: text("description").notNull(),
  currency: text("currency").default("MAD"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }).default("1"),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bdcRecettes = pgTable("bdc_recettes", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  date: date("date").notNull(),
  client: text("client").notNull(),
  status: text("status").default("brouillon"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bdcRecetteItems = pgTable("bdc_recette_items", {
  id: serial("id").primaryKey(),
  bdcId: integer("bdc_id").references(() => bdcRecettes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  tvaRate: numeric("tva_rate", { precision: 5, scale: 2 }).default("10"),
});

export const bdcDepenses = pgTable("bdc_depenses", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  date: date("date").notNull(),
  supplier: text("supplier").notNull(),
  status: text("status").default("brouillon"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bdcDepenseItems = pgTable("bdc_depense_items", {
  id: serial("id").primaryKey(),
  bdcId: integer("bdc_id").references(() => bdcDepenses.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  tvaRate: numeric("tva_rate", { precision: 5, scale: 2 }).default("10"),
});
