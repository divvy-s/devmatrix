ALTER TABLE "posts" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
