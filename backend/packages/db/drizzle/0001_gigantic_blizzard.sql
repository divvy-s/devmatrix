CREATE TABLE IF NOT EXISTS "github_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"repo" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "repo_url" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_assets_user_idx" ON "github_assets" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "github_assets_user_repo_unique" ON "github_assets" ("user_id","repo");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_assets" ADD CONSTRAINT "github_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
