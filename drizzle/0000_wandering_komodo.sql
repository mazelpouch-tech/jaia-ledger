CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" integer,
	"user_id" integer,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bdc_depense_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bdc_id" integer,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tva_rate" numeric(5, 2) DEFAULT '10'
);
--> statement-breakpoint
CREATE TABLE "bdc_depenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"date" date NOT NULL,
	"supplier" text NOT NULL,
	"status" text DEFAULT 'brouillon',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bdc_recette_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bdc_id" integer,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tva_rate" numeric(5, 2) DEFAULT '10'
);
--> statement-breakpoint
CREATE TABLE "bdc_recettes" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"date" date NOT NULL,
	"client" text NOT NULL,
	"status" text DEFAULT 'brouillon',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"rate" numeric(10, 4) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decaissements" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"reference" text NOT NULL,
	"category_id" integer,
	"supplier" text,
	"description" text NOT NULL,
	"currency" text DEFAULT 'MAD',
	"amount" numeric(12, 2) NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"payment_method" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "encaissements" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"reference" text NOT NULL,
	"check_in" date,
	"check_out" date,
	"category_id" integer,
	"room_id" integer,
	"client" text,
	"description" text NOT NULL,
	"currency" text DEFAULT 'MAD',
	"amount" numeric(12, 2) NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"payment_method" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"riad_name" text DEFAULT 'Riad JAÏA' NOT NULL,
	"email" text DEFAULT 'contact@riadjaia.com',
	"address" text DEFAULT 'Derb ..., Médina, Marrakech 40000, Maroc',
	"phone" text DEFAULT '+212 5 24 00 00 00',
	"currency" text DEFAULT 'MAD',
	"ice" text DEFAULT '',
	"rc" text DEFAULT '',
	"tva_rate" numeric(5, 2) DEFAULT '10'
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bdc_depense_items" ADD CONSTRAINT "bdc_depense_items_bdc_id_bdc_depenses_id_fk" FOREIGN KEY ("bdc_id") REFERENCES "public"."bdc_depenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bdc_recette_items" ADD CONSTRAINT "bdc_recette_items_bdc_id_bdc_recettes_id_fk" FOREIGN KEY ("bdc_id") REFERENCES "public"."bdc_recettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decaissements" ADD CONSTRAINT "decaissements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;