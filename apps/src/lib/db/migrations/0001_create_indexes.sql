CREATE TABLE "index_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_id" text NOT NULL,
	"asset_symbol" text NOT NULL,
	"weight_bps" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "index_allocations_index_id_asset_symbol_unique" UNIQUE("index_id","asset_symbol")
);
--> statement-breakpoint
CREATE TABLE "indexes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_user_id" uuid,
	"creator_address" text NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "index_allocations" ADD CONSTRAINT "index_allocations_index_id_indexes_id_fk" FOREIGN KEY ("index_id") REFERENCES "public"."indexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexes" ADD CONSTRAINT "indexes_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;