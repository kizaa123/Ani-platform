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
  { id: 8, roleName: 'Researcher' },
];

const PERMISSIONS = [
  'create_listing', 'manage_commodities', 'view_farmer_preview', 'view_full_farmer_data',
  'request_connection', 'approve_connection', 'manage_payments', 'verify_users',
  'manage_listings', 'negotiate_as_farmer', 'represent_farmer', 'search_farmers',
  'negotiate_as_buyer', 'represent_buyer', 'manage_packages', 'view_audit_logs',
  'manage_users', 'send_messages', 'purchase_access',
  'create_publication', 'manage_publications', 'view_publications', 'purchase_publication',
];

const ROLE_PERMS: Record<number, string[]> = {
  1: ['create_listing', 'manage_commodities', 'view_farmer_preview', 'send_messages', 'view_publications'],
  2: ['create_listing', 'manage_commodities', 'view_farmer_preview', 'send_messages', 'view_publications'],
  3: ['view_farmer_preview', 'view_full_farmer_data', 'manage_listings', 'negotiate_as_farmer', 'represent_farmer', 'send_messages', 'view_publications'],
  4: ['view_farmer_preview', 'view_full_farmer_data', 'request_connection', 'negotiate_as_buyer', 'represent_buyer', 'purchase_access', 'send_messages', 'view_publications', 'purchase_publication'],
  5: ['view_farmer_preview', 'view_full_farmer_data', 'request_connection', 'search_farmers', 'negotiate_as_buyer', 'represent_buyer', 'send_messages', 'view_publications'],
  6: ['manage_payments', 'verify_users', 'manage_packages', 'view_audit_logs', 'approve_connection', 'view_publications'],
  7: ['manage_payments', 'verify_users', 'manage_packages', 'view_audit_logs', 'manage_users', 'view_full_farmer_data', 'approve_connection', 'view_publications'],
  8: ['create_publication', 'manage_publications', 'view_publications', 'send_messages'],
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

  const cropCategories: Record<string, Record<string, string[]>> = {
    Cereals: {
      Maize: ['White maize', 'Yellow maize'],
      Rice: ['Local rice', 'Imported rice', 'Jasmine rice', 'Ofada rice'],
      Millet: ['Pearl millet', 'Finger millet'],
      Sorghum: ['Red sorghum', 'White sorghum'],
      Fonio: ['White fonio', 'Black fonio'],
      Wheat: ['Bread wheat', 'Durum wheat'],
    },
    'Roots & Tubers': {
      Cassava: ['Sweet cassava', 'Industrial cassava'],
      Yam: ['White yam', 'Water yam', 'Yellow yam', 'Puna yam'],
      Cocoyam: ['Taro cocoyam', 'Colocasia cocoyam'],
      Plantain: ['French plantain', 'False horn plantain', 'Apem plantain'],
      'Sweet Potato': ['Orange flesh', 'White flesh'],
      'Irish Potato': ['Red skin', 'White skin'],
      Taro: ['Eddoe taro', 'Dasheen taro'],
    },
    Vegetables: {
      Tomato: ['Roma tomato', 'Cherry tomato', 'Beef tomato'],
      Pepper: ['Bell pepper', 'Scotch bonnet', "Bird's eye chili", 'Habanero', 'Green bell', 'Red bell'],
      Onion: ['Red onion', 'White onion', 'Spring onion'],
      'Garden Eggs': ['White garden egg', 'Green garden egg', 'Purple garden egg'],
      Okra: ['Green okra', 'Red okra'],
      Cabbage: ['Green cabbage', 'Red cabbage'],
      Lettuce: ['Iceberg lettuce', 'Romaine lettuce'],
      Cucumber: ['Slicing cucumber', 'Pickling cucumber'],
      Carrot: ['Nantes carrot', 'Chantenay carrot'],
      Eggplant: ['Long purple', 'Round white'],
      Spinach: ['English spinach', 'Amaranth leaves'],
      Kontomire: ['Cocoyam leaves', 'Sweet potato leaves'],
      'Green Beans': ['French beans', 'Runner beans'],
    },
    Fruits: {
      Mango: ['Keitt mango', 'Kent mango', 'Local mango', 'Alphonso mango'],
      Pineapple: ['Smooth cayenne', 'Sugar loaf', 'MD2 golden'],
      Papaya: ['Solo papaya', 'Red lady papaya'],
      Orange: ['Valencia orange', 'Local sweet orange', 'Navel orange'],
      Banana: ['Cavendish banana', 'Red banana', 'Apple banana'],
      Watermelon: ['Crimson sweet', 'Sugar baby'],
      Coconut: ['Green coconut', 'Dry coconut'],
      Avocado: ['Hass avocado', 'Local avocado', 'Fuerte avocado'],
      Cashew: ['Raw cashew nut', 'Roasted cashew nut'],
      Guava: ['Pink guava', 'White guava'],
      'Passion Fruit': ['Purple passion fruit', 'Yellow passion fruit'],
      Lemon: ['Eureka lemon', 'Local lemon'],
      Lime: ['Key lime', 'Persian lime'],
      Grapefruit: ['Pink grapefruit', 'White grapefruit'],
    },
    'Tree Crops': {
      Cocoa: ['Fine flavour', 'Bulk grade', 'Organic cocoa'],
      Coffee: ['Arabica', 'Robusta', 'Excelsa'],
      'Oil Palm': ['Tenera', 'Dura', 'Pisifera'],
      Shea: ['Shea nuts', 'Shea butter grade'],
      Rubber: ['Latex grade', 'Cup lump'],
    },
    Legumes: {
      Groundnut: ['Runner groundnut', 'Virginia groundnut', 'Spanish groundnut'],
      Cowpea: ['Red cowpea', 'White cowpea', 'Brown cowpea', 'Black-eyed pea'],
      Soybean: ['Yellow soybean', 'Black soybean'],
      'Bambara Beans': ['Red bambara', 'White bambara'],
      'Pigeon Pea': ['Short duration', 'Long duration'],
      Beans: ['Kidney beans', 'Black beans', 'Navy beans'],
    },
    'Spices & Herbs': {
      Ginger: ['Yellow ginger', 'Black ginger'],
      Turmeric: ['Fresh turmeric', 'Dried turmeric'],
      Moringa: ['Moringa leaves', 'Moringa seeds'],
      'African Nutmeg': ['Whole nutmeg', 'Ground nutmeg'],
      Garlic: ['Hardneck garlic', 'Softneck garlic'],
      'Hot Pepper': ['Cayenne pepper', 'Shito pepper'],
    },
    'Other Crops': {
      Sugarcane: ['Chewing cane', 'Industrial cane'],
      Cotton: ['Upland cotton', 'Long staple cotton'],
      Kenaf: ['Fibre kenaf', 'Seed kenaf'],
      Tobacco: ['Virginia tobacco', 'Burley tobacco'],
      Sesame: ['White sesame', 'Brown sesame'],
    },
  };

  const livestockData: Record<string, string[]> = {
    Cattle: ['Beef cattle', 'Dairy cattle', 'Dual-purpose cattle'],
    Goats: ['West African Dwarf', 'Sahelian goat', 'Boer cross'],
    Sheep: ['West African Dwarf sheep', 'Djallonke sheep', 'Sahelian sheep'],
    Poultry: ['Broiler', 'Layer', 'Local fowl', 'Guinea fowl'],
    Pigs: ['Large White', 'Landrace', 'Local pig'],
    Rabbits: ['New Zealand White', 'California rabbit'],
    Grasscutter: ['Domesticated grasscutter'],
    Snails: ['Giant African snail', 'Achatina snail'],
    Bees: ['Honey bees', 'Stingless bees'],
    Fish: ['Tilapia', 'Catfish', 'Heterotis'],
  };

  async function seedCategoryCommodities(
    categoryName: string,
    commodities: Record<string, string[]>
  ) {
    const category = await prisma.commodityCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
    for (const [name, variants] of Object.entries(commodities)) {
      const c = await prisma.commodity.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { categoryId: category.id, name },
      });
      for (const v of variants) {
        await prisma.commodityVariant.upsert({
          where: { commodityId_variantName: { commodityId: c.id, variantName: v } },
          update: {},
          create: { commodityId: c.id, variantName: v },
        });
      }
    }
  }

  for (const [categoryName, commodities] of Object.entries(cropCategories)) {
    await seedCategoryCommodities(categoryName, commodities);
  }

  await seedCategoryCommodities('Livestock', livestockData);

  // Legacy flat "Crop" category — keeps existing farmer links valid on re-seed
  const legacyCrop = await prisma.commodityCategory.upsert({
    where: { name: 'Crop' },
    update: {},
    create: { name: 'Crop' },
  });
  const legacyCommodities: Record<string, string[]> = {
    Maize: ['White maize', 'Yellow maize'],
    Rice: ['Local rice', 'Imported rice'],
    Cocoa: ['Fine flavour', 'Bulk grade'],
    Tomato: ['Roma tomato', 'Cherry tomato'],
    Cassava: ['Sweet cassava', 'Industrial cassava'],
  };
  for (const [name, variants] of Object.entries(legacyCommodities)) {
    const c = await prisma.commodity.upsert({
      where: { categoryId_name: { categoryId: legacyCrop.id, name } },
      update: {},
      create: { categoryId: legacyCrop.id, name },
    });
    for (const v of variants) {
      await prisma.commodityVariant.upsert({
        where: { commodityId_variantName: { commodityId: c.id, variantName: v } },
        update: {},
        create: { commodityId: c.id, variantName: v },
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

  /** Re-running seed resets demo credentials and roles (idempotent). */
  const demoUserUpdate = (roleId: number) => ({
    passwordHash: hash,
    roleId,
    verificationStatus: 'VERIFIED' as const,
  });

  const kwame = await prisma.user.upsert({
    where: { email: 'kwame@farm.gh' },
    update: demoUserUpdate(1),
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
    update: demoUserUpdate(4),
    create: {
      firstName: 'Ama', lastName: 'Owusu', email: 'ama@buyer.gh', phone: '+233209876543',
      passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra',
      roleId: 4, verificationStatus: 'VERIFIED',
    },
  });
  await prisma.buyerProfile.upsert({ where: { userId: ama.id }, update: {}, create: { userId: ama.id, company: 'Ama Foods Ltd' } });

  const yaw = await prisma.user.upsert({
    where: { email: 'yaw@handler.gh' },
    update: demoUserUpdate(3),
    create: { firstName: 'Yaw', lastName: 'Boateng', email: 'yaw@handler.gh', phone: '+233551112233', passwordHash: hash, country: 'Ghana', region: 'Central Region', city: 'Cape Coast', roleId: 3, verificationStatus: 'VERIFIED' },
  });
  await prisma.agentProfile.upsert({ where: { userId: yaw.id }, update: {}, create: { userId: yaw.id, agentType: 'FARMER_REPRESENTATIVE' } });

  const kofi = await prisma.user.upsert({
    where: { email: 'kofi@handler.gh' },
    update: demoUserUpdate(5),
    create: { firstName: 'Kofi', lastName: 'Asante', email: 'kofi@handler.gh', phone: '+233554445566', passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra', roleId: 5, verificationStatus: 'VERIFIED' },
  });
  await prisma.agentProfile.upsert({ where: { userId: kofi.id }, update: {}, create: { userId: kofi.id, agentType: 'BUYER_REPRESENTATIVE' } });

  await prisma.user.upsert({
    where: { email: 'accountant@ani.gh' },
    update: demoUserUpdate(6),
    create: { firstName: 'ANI', lastName: 'Accountant', email: 'accountant@ani.gh', phone: '+233500000001', passwordHash: hash, country: 'Ghana', region: 'Greater Accra', city: 'Accra', roleId: 6, verificationStatus: 'VERIFIED' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ani.gh' },
    update: demoUserUpdate(7),
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

  const akua = await prisma.user.upsert({
    where: { email: 'akua@research.gh' },
    update: demoUserUpdate(8),
    create: {
      firstName: 'Akua', lastName: 'Mensah', email: 'akua@research.gh', phone: '+233201112233',
      passwordHash: hash, country: 'Ghana', region: 'Ashanti Region', city: 'Kumasi',
      roleId: 8, verificationStatus: 'VERIFIED',
    },
  });
  const researcherProfile = await prisma.researcherProfile.upsert({
    where: { userId: akua.id },
    update: {},
    create: { userId: akua.id, institution: 'University of Ghana', expertise: 'Agricultural Economics' },
  });

  const existingPub = await prisma.researchPublication.findFirst({
    where: { researcherId: researcherProfile.id },
  });
  if (!existingPub) {
    await prisma.researchPublication.createMany({
      data: [
        {
          researcherId: researcherProfile.id,
          title: 'Climate-Smart Maize Production in Ghana',
          description: 'A comprehensive guide to sustainable maize farming practices adapted for Ghanaian agro-ecological zones.',
          fileUrl: '/uploads/publications/sample-maize-guide.pdf',
          isFree: true,
          viewCount: 42,
        },
        {
          researcherId: researcherProfile.id,
          title: 'Livestock Feed Optimization Study 2025',
          description: 'Research findings on cost-effective feed formulations for smallholder poultry and cattle farmers.',
          fileUrl: '/uploads/publications/sample-livestock-study.pdf',
          price: 25,
          isFree: false,
          viewCount: 18,
        },
      ],
    });
  }

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
