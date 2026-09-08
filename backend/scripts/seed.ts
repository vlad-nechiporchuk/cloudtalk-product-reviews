import { sql } from 'drizzle-orm';
import { DATABASE_URL, db, queryClient } from '../src/db/client';
import type { Tx } from '../src/db/client';
import { assertLocalDatabase } from '../src/db/assert-local-database';
import { hashToken } from '../src/auth/hash-token';
import { maskDatabaseUrl } from '../src/db/mask-database-url';
import { RatingAggregateRepository } from '../src/ratings/rating-aggregate.repository';
import type { Rating } from '../src/ratings/rating-aggregate.repository';
import { ALL_TABLE_NAMES } from '../src/db/schema-table-names';
import { users, products, orders, reviews, ratingAggregates } from '../src/db/schema';
import type { ProductRow } from '../src/db/schema';

const ratingAggregateRepository = new RatingAggregateRepository();

const DEMO_USERS = [
  { name: 'Marta K.', email: 'marta@demo.dev', token: 'demo-token-marta' },
  { name: 'Daniel P.', email: 'daniel@demo.dev', token: 'demo-token-daniel' },
  { name: 'Ingrid S.', email: 'ingrid@demo.dev', token: 'demo-token-ingrid' },
];

// Seed 24 reviews from separate users so all demo actions remain available.
const SEED_REVIEWS: {
  author: string;
  rating: Rating;
  title: string;
  body: string;
  verified: boolean;
  daysAgo: number;
}[] = [
  {
    author: 'Tomáš V.',
    rating: 5,
    title: 'Worth every crown',
    body: "Switched from a much pricier brand and honestly can't tell the difference in call quality. The app's EQ presets are a nice touch.",
    verified: true,
    daysAgo: 2,
  },
  {
    author: 'Priya N.',
    rating: 3,
    title: 'Good, not great',
    body: 'They do the job but the touch controls are overly sensitive — I keep pausing music by accident when adjusting the headband.',
    verified: true,
    daysAgo: 4,
  },
  {
    author: 'Lucas F.',
    rating: 5,
    title: 'Exceeded expectations',
    body: 'Bought these for a long-haul flight and they were a game changer. Pairing with two devices at once is seamless.',
    verified: false,
    daysAgo: 6,
  },
  {
    author: 'Nadia R.',
    rating: 1,
    title: 'Arrived with a defective left earcup',
    body: 'Unfortunately mine came with static in the left ear. Support was responsive though and a replacement is already on the way.',
    verified: true,
    daysAgo: 8,
  },
  {
    author: 'Oskar B.',
    rating: 4,
    title: 'Solid daily driver',
    body: 'Nothing flashy, just consistently good sound and a comfortable fit for someone who wears glasses.',
    verified: true,
    daysAgo: 10,
  },
  {
    author: 'Hana K.',
    rating: 5,
    title: 'Best purchase this year',
    body: 'The ANC actually blocks my open-plan office. I was skeptical after a few disappointing pairs, these delivered.',
    verified: true,
    daysAgo: 13,
  },
  {
    author: 'Marcus T.',
    rating: 2,
    title: 'Comfortable but battery drains fast',
    body: 'Advertised 30 hours, I get closer to 18 with ANC on. Fit and finish are nice otherwise.',
    verified: false,
    daysAgo: 15,
  },
  {
    author: 'Ines A.',
    rating: 4,
    title: 'Great for the price',
    body: 'Not audiophile-grade but for commuting and calls they are more than enough. App could use more presets.',
    verified: true,
    daysAgo: 18,
  },
  {
    author: 'Rowan D.',
    rating: 5,
    title: 'Impressed with the build quality',
    body: 'The hinges feel sturdy, the case is compact, and they survived a drop from my desk with no issue.',
    verified: true,
    daysAgo: 21,
  },
  {
    author: 'Sofia M.',
    rating: 3,
    title: 'Fine for the gym, not for running',
    body: 'They stay on for lifting but shift around during runs. Sound quality is good throughout.',
    verified: false,
    daysAgo: 24,
  },
  {
    author: 'Elias G.',
    rating: 5,
    title: 'Multipoint pairing just works',
    body: 'Switching between my laptop and phone mid-call used to be a hassle with my old pair. These handle it without a hiccup.',
    verified: true,
    daysAgo: 27,
  },
  {
    author: 'Petra L.',
    rating: 4,
    title: 'Good sound, mediocre app',
    body: 'The headphones themselves are great — the companion app crashes on my phone about once a week.',
    verified: true,
    daysAgo: 30,
  },
  {
    author: 'Amir K.',
    rating: 1,
    title: "Ear tips don't seal well",
    body: 'None of the included tips form a good seal for my ears, so passive isolation is weak and ANC has to work overtime.',
    verified: false,
    daysAgo: 33,
  },
  {
    author: 'Clara S.',
    rating: 5,
    title: 'My third pair from this brand',
    body: 'Consistent quality across every generation I have owned. This is the most comfortable one yet for long sessions.',
    verified: true,
    daysAgo: 36,
  },
  {
    author: 'Viktor H.',
    rating: 4,
    title: 'Reliable, if a bit heavy',
    body: 'Noticeable weight after a few hours but the clamping force is well judged so it never feels loose.',
    verified: true,
    daysAgo: 39,
  },
  {
    author: 'Julia P.',
    rating: 5,
    title: 'Perfect for video calls',
    body: 'Coworkers stopped asking me to repeat myself. The mic quality alone justified the upgrade.',
    verified: false,
    daysAgo: 42,
  },
  {
    author: 'Noah B.',
    rating: 3,
    title: 'Average ANC, good passive isolation',
    body: 'The active cancellation is fine for engine noise but does little for voices nearby. Still decent overall.',
    verified: true,
    daysAgo: 45,
  },
  {
    author: 'Freya T.',
    rating: 5,
    title: 'Battery life as advertised',
    body: 'Used them daily for two weeks on one charge with ANC mostly off. Quick-charge is genuinely quick too.',
    verified: true,
    daysAgo: 48,
  },
  {
    author: 'Dmitri O.',
    rating: 2,
    title: 'Bluetooth connection drops occasionally',
    body: 'Every few days there is a brief dropout, always on the same device. Might be my phone, might be the headphones.',
    verified: false,
    daysAgo: 51,
  },
  {
    author: 'Mei C.',
    rating: 4,
    title: 'Compact and travel-friendly',
    body: 'The folding case fits in a jacket pocket, which none of my previous over-ear headphones managed.',
    verified: true,
    daysAgo: 54,
  },
  {
    author: 'Bjorn A.',
    rating: 5,
    title: 'Sound stage surprised me',
    body: 'For a wireless pair at this price, the soundstage is wider than I expected. Bass is present without being overdone.',
    verified: true,
    daysAgo: 57,
  },
  {
    author: 'Alessia R.',
    rating: 3,
    title: 'Decent, returned for a different color',
    body: 'No complaints about performance — swapped for the other colorway, which delayed my review a bit.',
    verified: false,
    daysAgo: 60,
  },
  {
    author: 'Yusuf D.',
    rating: 5,
    title: 'Ideal for open offices',
    body: 'ANC plus the "focus" EQ preset makes background chatter disappear. Highly recommend for shared workspaces.',
    verified: true,
    daysAgo: 63,
  },
  {
    author: 'Greta N.',
    rating: 4,
    title: 'Good all-rounder',
    body: 'Not the best at any one thing but strong across sound, comfort, and battery. Happy with the purchase overall.',
    verified: true,
    daysAgo: 66,
  },
];

async function createProduct(
  tx: Tx,
  input: { name: string; slug: string; priceCents: number; category: string },
): Promise<ProductRow> {
  const [product] = await tx.insert(products).values(input).returning();
  await tx.insert(ratingAggregates).values({ productId: product.id });
  return product;
}

async function main(): Promise<void> {
  assertLocalDatabase(DATABASE_URL);
  console.log(`Seeding ${maskDatabaseUrl(DATABASE_URL)} — every table will be truncated first.`);

  const primaryProduct = await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE ${sql.raw(ALL_TABLE_NAMES.join(', '))} CASCADE`);

    const insertedUsers = await tx
      .insert(users)
      .values(
        DEMO_USERS.map((u) => ({ name: u.name, email: u.email, tokenHash: hashToken(u.token) })),
      )
      .returning();

    const primary = await createProduct(tx, {
      name: 'Aurora Wireless ANC Headphones',
      slug: 'aurora-wireless-anc-headphones',
      priceCents: 17900,
      category: 'Electronics / Audio / Headphones',
    });
    await createProduct(tx, {
      name: 'Aurora Trail Running Socks',
      slug: 'aurora-trail-running-socks',
      priceCents: 1800,
      category: 'Sports / Running / Socks',
    });

    // one order per demo user for the primary product, backing "Verified
    // Purchase" — none of these three ever authors a review themselves
    // (see SEED_REVIEWS above), just so this order exists for whichever
    // one writes a fresh review through the running demo.
    await tx.insert(orders).values(
      insertedUsers.map((u) => ({
        userId: u.id,
        productId: primary.id,
        purchasedAt: new Date(),
      })),
    );

    const reviewerEmail = (i: number): string => `reviewer${i}@demo.dev`;

    const insertedReviewers = await tx
      .insert(users)
      .values(
        SEED_REVIEWS.map((r, i) => ({
          name: r.author,
          email: reviewerEmail(i),
          tokenHash: `unused-reviewer-token-hash-${i}`,
        })),
      )
      .returning();

    // Matched by email, not by trusting `.returning()` to preserve
    // insertion order — that's an implementation detail Postgres/Drizzle
    // don't guarantee, and a mismatch here would silently misattribute
    // reviews/verification to the wrong seed author rather than fail loudly.
    const reviewerIdByEmail = new Map(insertedReviewers.map((u) => [u.email, u.id]));
    const reviewerId = (i: number): string => {
      const id = reviewerIdByEmail.get(reviewerEmail(i));
      if (!id) {
        throw new Error(`Seed reviewer ${i} (${reviewerEmail(i)}) not found after insert`);
      }

      return id;
    };

    const verifiedOrders = [...SEED_REVIEWS.entries()]
      .filter(([, r]) => r.verified)
      .map(([i, r]) => ({
        userId: reviewerId(i),
        productId: primary.id,
        // A week ahead of the review itself, not "now" — an order dated
        // after the review it backs would make "Verified Purchase" claim
        // a purchase that hadn't happened yet.
        purchasedAt: new Date(Date.now() - (r.daysAgo + 7) * 24 * 60 * 60 * 1000),
      }));
    if (verifiedOrders.length > 0) {
      await tx.insert(orders).values(verifiedOrders);
    }

    for (const [i, review] of SEED_REVIEWS.entries()) {
      await tx.insert(reviews).values({
        productId: primary.id,
        userId: reviewerId(i),
        rating: review.rating,
        title: review.title,
        body: review.body,
        isVerified: review.verified,
        createdAt: new Date(Date.now() - review.daysAgo * 24 * 60 * 60 * 1000),
      });
      await ratingAggregateRepository.applyNewRating(tx, primary.id, review.rating);
    }

    return primary;
  });

  console.log('Seeded (idempotent — re-run any time to reset demo data).');
  console.log('Demo user bearer tokens (fixed, also hardcoded in the frontend switcher):');
  DEMO_USERS.forEach((u) => console.log(`  ${u.name}: ${u.token}`));
  console.log(`Primary demo product slug: ${primaryProduct.slug}`);
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
