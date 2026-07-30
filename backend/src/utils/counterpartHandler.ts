import prisma from '../database/prisma';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import type { RelationshipType } from '@prisma/client';

export type CounterpartHandlerContact = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
};

type HandlerUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
};

function formatHandlerContact(agent: HandlerUser): CounterpartHandlerContact {
  return {
    id: agent.id,
    firstName: agent.firstName,
    lastName: agent.lastName,
    name: `${agent.firstName} ${agent.lastName}`,
    email: agent.email,
    phone: agent.phone,
    profilePicture: normalizePublicAssetUrl(agent.profilePicture),
  };
}

const agentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  profilePicture: true,
} as const;

/** Look up assigned liaison officers for a set of client owner IDs. */
export async function fetchCounterpartHandlersByOwnerIds(
  ownerIds: string[],
  relationshipType: RelationshipType
): Promise<Map<string, CounterpartHandlerContact>> {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const assignments = await prisma.agentAssignment.findMany({
    where: {
      ownerId: { in: uniqueIds },
      relationshipType,
    },
    include: { agent: { select: agentSelect } },
  });

  return new Map(
    assignments.map((assignment) => [assignment.ownerId, formatHandlerContact(assignment.agent)])
  );
}

export async function fetchCounterpartHandlerForOwner(
  ownerId: string,
  relationshipType: RelationshipType
): Promise<CounterpartHandlerContact | null> {
  const assignment = await prisma.agentAssignment.findFirst({
    where: { ownerId, relationshipType },
    include: { agent: { select: agentSelect } },
  });

  return assignment ? formatHandlerContact(assignment.agent) : null;
}

/** Attach counterpart liaison officer contact to handler-scoped order rows. */
export async function enrichOrdersWithCounterpartHandler<
  T extends { buyerId?: string; farmerId?: string },
>(
  orders: T[],
  relationshipType: RelationshipType,
  ownerIdField: 'buyerId' | 'farmerId'
): Promise<Array<T & { counterpartHandler: CounterpartHandlerContact | null }>> {
  const ownerIds = orders
    .map((order) => order[ownerIdField])
    .filter((id): id is string => Boolean(id));

  const handlersByOwner = await fetchCounterpartHandlersByOwnerIds(ownerIds, relationshipType);

  return orders.map((order) => ({
    ...order,
    counterpartHandler: order[ownerIdField]
      ? (handlersByOwner.get(order[ownerIdField]!) ?? null)
      : null,
  }));
}
