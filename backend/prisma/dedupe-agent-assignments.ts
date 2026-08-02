import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove duplicate agent_assignment rows so @@unique([ownerId, relationshipType])
 * can be applied. Keeps the most recent row per (owner_id, relationship_type).
 */
export async function dedupeAgentAssignments(): Promise<number> {
  const tableExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'agent_assignment'
    ) AS "exists"
  `;

  if (!tableExists[0]?.exists) {
    console.log('agent_assignment table not found - skipping dedupe');
    return 0;
  }

  const duplicateGroups = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS "count"
    FROM (
      SELECT owner_id, relationship_type
      FROM agent_assignment
      GROUP BY owner_id, relationship_type
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  const groupCount = Number(duplicateGroups[0]?.count ?? 0);
  if (groupCount === 0) {
    console.log('No duplicate agent assignments found');
    return 0;
  }

  const deleted = await prisma.$executeRaw`
    DELETE FROM agent_assignment
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY owner_id, relationship_type
            ORDER BY created_at DESC, id DESC
          ) AS rn
        FROM agent_assignment
      ) ranked
      WHERE rn > 1
    )
  `;

  console.log(
    `Removed ${deleted} duplicate agent assignment row(s) across ${groupCount} owner/relationship group(s)`
  );
  return deleted;
}

async function main() {
  await dedupeAgentAssignments();
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Agent assignment dedupe failed:', error.message || error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
