CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"price_cents" integer NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rating_aggregates" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" bigint DEFAULT 0 NOT NULL,
	"count_1" integer DEFAULT 0 NOT NULL,
	"count_2" integer DEFAULT 0 NOT NULL,
	"count_3" integer DEFAULT 0 NOT NULL,
	"count_4" integer DEFAULT 0 NOT NULL,
	"count_5" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rating_aggregates_count_sum_matches_review_count" CHECK ("rating_aggregates"."count_1" + "rating_aggregates"."count_2" + "rating_aggregates"."count_3" + "rating_aggregates"."count_4" + "rating_aggregates"."count_5" = "rating_aggregates"."review_count"),
	CONSTRAINT "rating_aggregates_rating_sum_matches_counts" CHECK ("rating_aggregates"."count_1" + 2 * "rating_aggregates"."count_2" + 3 * "rating_aggregates"."count_3" + 4 * "rating_aggregates"."count_4" + 5 * "rating_aggregates"."count_5" = "rating_aggregates"."rating_sum"),
	CONSTRAINT "rating_aggregates_counts_non_negative" CHECK ("rating_aggregates"."count_1" >= 0 AND "rating_aggregates"."count_2" >= 0 AND "rating_aggregates"."count_3" >= 0 AND "rating_aggregates"."count_4" >= 0 AND "rating_aggregates"."count_5" >= 0)
);
--> statement-breakpoint
CREATE TABLE "review_helpful_votes" (
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_helpful_votes_review_id_user_id_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "review_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_helpful_count_non_negative" CHECK ("reviews"."helpful_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_aggregates" ADD CONSTRAINT "rating_aggregates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_product_idx" ON "orders" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_product_user_unique" ON "reviews" USING btree ("product_id","user_id");--> statement-breakpoint
CREATE INDEX "reviews_product_created_idx" ON "reviews" USING btree ("product_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "reviews_product_rating_idx" ON "reviews" USING btree ("product_id","rating" DESC NULLS FIRST,"created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "reviews_product_verified_idx" ON "reviews" USING btree ("product_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "reviews"."is_verified" = true;