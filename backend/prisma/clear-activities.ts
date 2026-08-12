import { Prisma, PrismaClient } from '@prisma/client';
import { PLATFORM_NAME } from '../src/constants/platform';

const prisma = new PrismaClient();

/** Neon/large DBs need longer interactive tx windows; batches keep each tx short. */
const TX_OPTIONS = { timeout: 120_000, maxWait: 30_000 } satisfies Prisma.TransactionOptions;

/** Demo accounts from seed.ts — keep these users and their profiles. */
export const DEMO_EMAILS = [
  'kwame@farm.gh',
  'ama@buyer.gh',
  'yaw@handler.gh',
  'kofi@handler.gh',
  'accountant@ani.gh',
  'admin@ani.gh',
  'cto@ani.gh',
  'comms@ani.gh',
  'akua@research.gh',
] as const;

type DeleteCounts = Record<string, number>;

async function deleteMany(label: string, fn: () => Promise<{ count: number }>): Promise<number> {
  const { count } = await fn();
  console.log(`  ${label}: ${count}`);
  return count;
}

type Tx = Prisma.TransactionClient;

async function runBatch(label: string, fn: (tx: Tx) => Promise<void>): Promise<void> {
  console.log(`\n  — ${label} —`);
  await prisma.$transaction(fn, TX_OPTIONS);
}

async function clearActivities(options: { dryRun: boolean }): Promise<DeleteCounts> {
  const counts: DeleteCounts = {};

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: [...DEMO_EMAILS] } },
    select: { id: true, email: true },
  });
  const demoIds = demoUsers.map((u) => u.id);

  console.log(`\nDemo accounts found (${demoUsers.length}/${DEMO_EMAILS.length}):`);
  for (const email of DEMO_EMAILS) {
    const found = demoUsers.find((u) => u.email === email);
    console.log(`  ${found ? '✓' : '✗'} ${email}`);
  }

  const nonDemoFilter = demoIds.length
    ? { email: { notIn: [...DEMO_EMAILS] } }
    : {};

  if (options.dryRun) {
    console.log('\n[dry-run] Would delete activity data (counts only):\n');
    counts.orderDistributionLines = await prisma.orderDistributionLine.count();
    counts.orderMoneyDistributions = await prisma.orderMoneyDistribution.count();
    counts.productOrders = await prisma.productOrder.count();
    counts.researchComments = await prisma.researchComment.count();
    counts.researchPublicationLikes = await prisma.researchPublicationLike.count();
    counts.researchViews = await prisma.researchView.count();
    counts.researchPurchases = await prisma.researchPurchase.count();
    counts.productMediaLikes = await prisma.productMediaLike.count();
    counts.productMedia = await prisma.productMedia.count();
    counts.farmerMediaLikes = await prisma.farmerMediaLike.count();
    counts.farmerMedia = await prisma.farmerMedia.count();
    counts.notifications = await prisma.notification.count();
    counts.messages = await prisma.message.count();
    counts.connectionRequests = await prisma.connectionRequest.count();
    counts.buyerFarmerAccess = await prisma.buyerFarmerAccess.count();
    counts.buyerAccess = await prisma.buyerAccess.count();
    counts.payments = await prisma.payment.count();
    counts.platformWithdrawals = await prisma.platformWithdrawal.count();
    counts.auditLogs = await prisma.auditLog.count();
    counts.refreshTokens = await prisma.refreshToken.count();
    counts.emailVerificationChallenges = await prisma.emailVerificationChallenge.count();
    counts.userVerificationTags = await prisma.userVerificationTag.count();
    counts.commodityListings = await prisma.commodityListing.count();
    counts.researchPublications = await prisma.researchPublication.count();
    counts.ads = await prisma.ad.count();
    counts.nonDemoAgentAssignments = await prisma.agentAssignment.count({
      where: {
        OR: [
          { agentId: { notIn: demoIds } },
          { ownerId: { notIn: demoIds } },
        ],
      },
    });
    counts.nonDemoUsers = await prisma.user.count({ where: nonDemoFilter });

    for (const [key, value] of Object.entries(counts)) {
      console.log(`  ${key}: ${value}`);
    }
    return counts;
  }

  console.log('\nDeleting transactional and activity data...');
  console.log('(Idempotent — safe to re-run if a batch fails partway through.)\n');

  await runBatch('orders', async (tx) => {
    counts.orderDistributionLines = await deleteMany(
      'order_distribution_lines',
      () => tx.orderDistributionLine.deleteMany(),
    );
    counts.orderMoneyDistributions = await deleteMany(
      'order_money_distributions',
      () => tx.orderMoneyDistribution.deleteMany(),
    );
    counts.productOrders = await deleteMany('product_orders', () => tx.productOrder.deleteMany());
  });

  await runBatch('research', async (tx) => {
    counts.researchComments = await deleteMany('research_comments', () => tx.researchComment.deleteMany());
    counts.researchPublicationLikes = await deleteMany(
      'research_publication_likes',
      () => tx.researchPublicationLike.deleteMany(),
    );
    counts.researchViews = await deleteMany('research_views', () => tx.researchView.deleteMany());
    counts.researchPurchases = await deleteMany('research_purchases', () => tx.researchPurchase.deleteMany());
    counts.researchPublications = await deleteMany(
      'research_publications',
      () => tx.researchPublication.deleteMany(),
    );
  });

  await runBatch('media', async (tx) => {
    counts.productMediaLikes = await deleteMany('product_media_likes', () => tx.productMediaLike.deleteMany());
    counts.productMedia = await deleteMany('product_media', () => tx.productMedia.deleteMany());
    counts.farmerMediaLikes = await deleteMany('farmer_media_likes', () => tx.farmerMediaLike.deleteMany());
    counts.farmerMedia = await deleteMany('farmer_media', () => tx.farmerMedia.deleteMany());
  });

  await runBatch('comms & access', async (tx) => {
    counts.notifications = await deleteMany('notifications', () => tx.notification.deleteMany());
    counts.messages = await deleteMany('messages', () => tx.message.deleteMany());
    counts.connectionRequests = await deleteMany('connection_requests', () => tx.connectionRequest.deleteMany());
    counts.buyerFarmerAccess = await deleteMany('buyer_farmer_access', () => tx.buyerFarmerAccess.deleteMany());
    counts.buyerAccess = await deleteMany('buyer_access', () => tx.buyerAccess.deleteMany());
  });

  await runBatch('payments, audit & auth', async (tx) => {
    counts.payments = await deleteMany('payments', () => tx.payment.deleteMany());
    counts.platformWithdrawals = await deleteMany('platform_withdrawals', () => tx.platformWithdrawal.deleteMany());
    counts.auditLogs = await deleteMany('audit_logs', () => tx.auditLog.deleteMany());
    counts.refreshTokens = await deleteMany('refresh_tokens', () => tx.refreshToken.deleteMany());
    counts.emailVerificationChallenges = await deleteMany(
      'email_verification_challenges',
      () => tx.emailVerificationChallenge.deleteMany(),
    );
    // Remove tags on non-demo users; keep demo user verification tags.
    counts.userVerificationTags = await deleteMany('user_verification_tags (non-demo)', () =>
      tx.userVerificationTag.deleteMany({
        where: demoIds.length ? { userId: { notIn: demoIds } } : {},
      }),
    );
  });

  await runBatch('listings & ads', async (tx) => {
    counts.commodityListings = await deleteMany('commodity_listings', () => tx.commodityListing.deleteMany());
    counts.ads = await deleteMany('ads', () => tx.ad.deleteMany());
  });

  await runBatch('users (non-demo)', async (tx) => {
    if (demoIds.length) {
      counts.nonDemoAgentAssignments = await deleteMany('agent_assignments (non-demo)', () =>
        tx.agentAssignment.deleteMany({
          where: {
            OR: [{ agentId: { notIn: demoIds } }, { ownerId: { notIn: demoIds } }],
          },
        }),
      );
      counts.nonDemoUsers = await deleteMany('users (non-demo)', () =>
        tx.user.deleteMany({ where: nonDemoFilter }),
      );
    } else {
      console.warn('  ⚠ No demo users found — skipping user deletion to avoid wiping all accounts.');
      counts.nonDemoAgentAssignments = 0;
      counts.nonDemoUsers = 0;
    }
  });

  return counts;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reseed = args.includes('--reseed');
  const skipConfirm = args.includes('--yes');

  const dbUrl = process.env.DATABASE_URL ?? '';
  const isRemote =
    /neon\.tech|render\.com|supabase\.co|amazonaws\.com|railway\.app/i.test(dbUrl);

  console.log(`🧹 ${PLATFORM_NAME} — clear activity data (preserve demo accounts)`);
  if (dryRun) console.log('   Mode: dry-run (no changes)');

  if (isRemote && !dryRun && !skipConfirm) {
    console.error(
      '\n⚠ DATABASE_URL looks like a remote/production database.',
    );
    console.error('  Re-run with --yes to confirm, or use --dry-run first.');
    process.exit(1);
  }

  const counts = await clearActivities({ dryRun });

  if (dryRun) {
    console.log('\n[dry-run] No changes made.');
    return;
  }

  const preserved = await prisma.user.findMany({
    where: { email: { in: [...DEMO_EMAILS] } },
    select: { email: true, firstName: true, lastName: true, roleId: true },
    orderBy: { email: 'asc' },
  });

  console.log(`\n✅ Activity clear complete. Preserved ${preserved.length} demo account(s).`);

  if (reseed) {
    console.log('\n🌱 Re-seeding reference data and demo content...');
    const { execSync } = await import('child_process');
    execSync('tsx prisma/seed.ts', { stdio: 'inherit', cwd: process.cwd() });
  } else {
    console.log('\nTip: run with --reseed to restore demo listings, publications, ads, and passwords.');
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Clear failed:', error.message || error);
      if (error.code === 'P1001') {
        console.error('\nPostgreSQL is not reachable. Check DATABASE_URL and start the database.');
      }
      if (/transaction.*(closed|expired|timeout)/i.test(String(error.message))) {
        console.error(
          '\nTransaction timed out. Completed batches were committed; re-run the same command to finish.',
        );
      }
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
