import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES = [
  { id: 1, roleName: 'Crop Farmer' },
  { id: 2, roleName: 'Livestock Farmer' },
  { id: 3, roleName: 'Farmer Handler' },
  { id: 4, roleName: 'Buyer' },
  { id: 5, roleName: 'Buyer Handler' },
  { id: 6, roleName: 'ANI Accountant' },
  { id: 7, roleName: 'Admin' },
];

const PERMISSIONS = [
  'create_listing', 'manage_commodities', 'view_farmer_preview', 'view_full_farmer_data',
  'request_connection', 'approve_connection', 'manage_payments', 'verify_users',
  'manage_listings', 'negotiate_as_farmer', 'represent_farmer', 'search_farmers',
  'negotiate_as_buyer', 'represent_buyer', 'manage_packages', 'view_audit_logs',
  'manage_users', 'send_messages', 'purchase_access',
];

const ROLE_PERMS: Record<number, string[]> = {
  1: ['create_listing', 'manage_commodities', 'view_farmer_preview', 'send_messages'],
  2: ['create_listing', 'manage_commodities', 'view_farmer_preview', 'send_messages'],
  3: ['view_farmer_preview', 'view_full_farmer_data', 'manage_listings', 'negotiate_as_farmer', 'represent_farmer', 'send_messages'],
  4: ['view_farmer_preview', 'view_full_farmer_data', 'request_connection', 'negotiate_as_buyer', 'represent_buyer', 'purchase_access', 'send_messages'],
  5: ['view_farmer_preview', 'view_full_farmer_data', 'request_connection', 'search_farmers', 'negotiate_as_buyer', 'represent_buyer', 'send_messages'],
  6: ['manage_payments', 'verify_users', 'manage_packages', 'view_audit_logs', 'approve_connection'],
  7: ['manage_payments', 'verify_users', 'manage_packages', 'view_audit_logs', 'manage_users', 'view_full_farmer_data', 'approve_connection'],
};

async function main() {
  console.log('🌱 Seeding ANI Platform...');

  for (const role of ROLES) {
    await prisma.role.upsert({ where: { id: role.id }, update: { roleName: role.roleName }, create: role });
  }

  for (let i = 0; i < PERMISSIONS.length; i++) {
    await prisma.permission.upsert({
      where: { id: i + 1 },
      update: { permissionName: PERMISSIONS[i] },
      create: { id: i + 1, permissionName: PERMISSIONS[i] },
    });
  }

  for (const [roleId, perms] of Object.entries(ROLE_PERMS)) {
    for (const permName of perms) {
      const perm = await prisma.permission.findUnique({ where: { permissionName: permName } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: parseInt(roleId), permissionId: perm.id } },
          update: {},
          create: { roleId: parseInt(roleId), permissionId: perm.id },
        });
      }
    }
  }

  const cropCat = await prisma.commodityCategory.upsert({
    where: { name: 'Crop' }, update: {}, create: { name: 'Crop' },
  });
  const livestockCat = await prisma.commodityCategory.upsert({
    where: { name: 'Livestock' }, update: {}, create: { name: 'Livestock' },
  });

  const cropData: Record<string, string[]> = {
    Maize: ['White maize', 'Yellow maize'],
    Rice: ['Local rice', 'Imported rice'],
    Cocoa: ['Fine flavour', 'Bulk grade'],
    Tomato: ['Roma tomato', 'Cherry tomato'],
    Cassava: ['Sweet cassava', 'Industrial cassava'],
  };

  const livestockData: Record<string, string[]> = {
    Cattle: ['Beef cattle', 'Dairy cattle'],
    Goats: ['Meat goats', 'Dairy goats'],
    Sheep: ['Meat sheep', 'Wool sheep'],
    Poultry: ['Broiler', 'Layer'],
  };

  for (const [name, variants] of Object.entries(cropData)) {
    const c = await prisma.commodity.upsert({
      where: { categoryId_name: { categoryId: cropCat.id, name } },
      update: {}, create: { categoryId: cropCat.id, name },
    });
    for (const v of variants) {
      await prisma.commodityVariant.upsert({
        where: { commodityId_variantName: { commodityId: c.id, variantName: v } },
        update: {}, create: { commodityId: c.id, variantName: v },
      });
    }
  }

  for (const [name, variants] of Object.entries(livestockData)) {
    const c = await prisma.commodity.upsert({
      where: { categoryId_name: { categoryId: livestockCat.id, name } },
      update: {}, create: { categoryId: livestockCat.id, name },
    });
    for (const v of variants) {
      await prisma.commodityVariant.upsert({
        where: { commodityId_variantName: { commodityId: c.id, variantName: v } },
        update: {}, create: { commodityId: c.id, variantName: v },
      });
    }
  }

  await prisma.accessPackage.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Basic Buyer Access', price: 50, durationDays: 30 },
  });
  await prisma.accessPackage.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000002', name: 'Premium Buyer Access', price: 120, durationDays: 90 },
  });

  const hash = await bcrypt.hash('Password123!', 12);

  const kwame = await prisma.user.upsert({
    where: { email: 'kwame@farm.gh' },
    update: {},
    create: {
      firstName: 'Kwame', lastName: 'Mensah', email: 'kwame@farm.gh', phone: '+233241234567',
      passwordHash: hash, country: 'Ghana', region: 'Central Region', city: 'Cape Coast',
      roleId: 1, verificationStatus: 'VERIFIED',
    },
  });

  const profile = await prisma.farmerProfile.upsert({
    where: { userId: kwame.id },
    update: {},
    create: { userId: kwame.id, farmName: 'Kwame Farm', farmSize: '10 acres', experienceYears: 15, verificationStatus: 'VERIFIED' },
  });

  const cocoa = await prisma.commodity.findFirst({ where: { name: 'Cocoa' } });
  const tomato = await prisma.commodity.findFirst({ where: { name: 'Tomato' } });

  if (cocoa) {
    await prisma.farmerCommodity.upsert({
      where: { farmerId_commodityId: { farmerId: profile.id, commodityId: cocoa.id } },
      update: {}, create: { farmerId: profile.id, commodityId: cocoa.id, quantity: 20, unit: 'bags' },
    });
    const cocoaListing = await prisma.commodityListing.findFirst({
      where: { farmerId: profile.id, commodityId: cocoa.id, title: 'Premium Cocoa Available' },
    });
    if (!cocoaListing) {
      await prisma.commodityListing.create({
        data: { farmerId: profile.id, commodityId: cocoa.id, title: 'Premium Cocoa Available', description: 'High-quality dried cocoa', quantity: 500, price: 25, unit: 'bags', location: 'Central Region', images: [] },
      });
    }
  }

  if (tomato) {
    await prisma.farmerCommodity.upsert({
      where: { farmerId_commodityId: { farmerId: profile.id, commodityId: tomato.id } },
      update: {}, create: { farmerId: profile.id, commodityId: tomato.id, quantity: 500, unit: 'kg' },
    });
    const tomatoListing = await prisma.commodityListing.findFirst({
      where: { farmerId: profile.id, commodityId: tomato.id, title: 'Fresh Tomatoes Available' },
    });
    if (!tomatoListing) {
      await prisma.commodityListing.create({
        data: { farmerId: profile.id, commodityId: tomato.id, title: 'Fresh Tomatoes Available', description: 'Farm-fresh weekly harvest', quantity: 500, price: 3, unit: 'kg', location: 'Central Region' },
      });
    }
  }

  const ama = await prisma.user.upsert({
    where: { email: 'ama@buyer.gh' },
    update: {},
    create: {
      firstName: 'Ama', lastName: 'Owusu', email: 'ama@buyer.gh', phone: '+233209876543',
      passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra',
      roleId: 4, verificationStatus: 'VERIFIED',
    },
  });
  await prisma.buyerProfile.upsert({ where: { userId: ama.id }, update: {}, create: { userId: ama.id, company: 'Ama Foods Ltd' } });

  const yaw = await prisma.user.upsert({
    where: { email: 'yaw@handler.gh' },
    update: {},
    create: { firstName: 'Yaw', lastName: 'Boateng', email: 'yaw@handler.gh', phone: '+233551112233', passwordHash: hash, country: 'Ghana', region: 'Central Region', city: 'Cape Coast', roleId: 3, verificationStatus: 'VERIFIED' },
  });
  await prisma.agentProfile.upsert({ where: { userId: yaw.id }, update: {}, create: { userId: yaw.id, agentType: 'FARMER_REPRESENTATIVE' } });

  const kofi = await prisma.user.upsert({
    where: { email: 'kofi@handler.gh' },
    update: {},
    create: { firstName: 'Kofi', lastName: 'Asante', email: 'kofi@handler.gh', phone: '+233554445566', passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra', roleId: 5, verificationStatus: 'VERIFIED' },
  });
  await prisma.agentProfile.upsert({ where: { userId: kofi.id }, update: {}, create: { userId: kofi.id, agentType: 'BUYER_REPRESENTATIVE' } });

  await prisma.user.upsert({
    where: { email: 'accountant@ani.gh' },
    update: {},
    create: { firstName: 'ANI', lastName: 'Accountant', email: 'accountant@ani.gh', phone: '+233500000001', passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra', roleId: 6, verificationStatus: 'VERIFIED' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ani.gh' },
    update: {},
    create: { firstName: 'Platform', lastName: 'Admin', email: 'admin@ani.gh', phone: '+233500000002', passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra', roleId: 7, verificationStatus: 'VERIFIED' },
  });

  await prisma.agentAssignment.upsert({
    where: { agentId_ownerId: { agentId: yaw.id, ownerId: kwame.id } },
    update: {}, create: { agentId: yaw.id, ownerId: kwame.id, relationshipType: 'FARMER_REPRESENTATIVE' },
  });
  await prisma.agentAssignment.upsert({
    where: { agentId_ownerId: { agentId: kofi.id, ownerId: ama.id } },
    update: {}, create: { agentId: kofi.id, ownerId: ama.id, relationshipType: 'BUYER_REPRESENTATIVE' },
  });

  console.log('✅ Seed complete. Password for all demo accounts: Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message || e);
    if (e.code === 'P1001') {
      console.error('\nPostgreSQL is not running. Start it first:');
      console.error('  docker compose up -d');
      console.error('Then run: npm run db:setup');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
