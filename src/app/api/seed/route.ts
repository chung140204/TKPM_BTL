import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        // --- Create Properties ---
        const prop1 = await prisma.property.create({
            data: {
                name: 'Smile Residence Sukhumvit',
                address: '123 Sukhumvit Soi 39, Bangkok 10110',
                type: 'RESIDENTIAL',
            },
        });

        const prop2 = await prisma.property.create({
            data: {
                name: 'Smile Tower Silom',
                address: '456 Silom Road, Bangkok 10500',
                type: 'MIXED',
            },
        });

        // --- Create Buildings ---
        const bldA = await prisma.building.create({
            data: { propertyId: prop1.id, name: 'Building A', floors: 8 },
        });

        const bldB = await prisma.building.create({
            data: { propertyId: prop1.id, name: 'Building B', floors: 6 },
        });

        const tower1 = await prisma.building.create({
            data: { propertyId: prop2.id, name: 'Tower 1', floors: 15 },
        });

        // --- Create Rooms ---
        const roomData = [
            // Building A
            { buildingId: bldA.id, number: '101', type: 'STUDIO', status: 'OCCUPIED', price: 12000, area: 28 },
            { buildingId: bldA.id, number: '102', type: 'STUDIO', status: 'OCCUPIED', price: 12000, area: 28 },
            { buildingId: bldA.id, number: '103', type: 'ONE_BED', status: 'VACANT', price: 18000, area: 35 },
            { buildingId: bldA.id, number: '201', type: 'ONE_BED', status: 'OCCUPIED', price: 18000, area: 35 },
            { buildingId: bldA.id, number: '202', type: 'TWO_BED', status: 'MAINTENANCE', price: 25000, area: 52 },
            { buildingId: bldA.id, number: '203', type: 'ONE_BED', status: 'RESERVED', price: 18000, area: 35 },
            { buildingId: bldA.id, number: '301', type: 'PENTHOUSE', status: 'VACANT', price: 45000, area: 90 },
            { buildingId: bldA.id, number: '302', type: 'TWO_BED', status: 'OCCUPIED', price: 26000, area: 55 },
            // Building B
            { buildingId: bldB.id, number: '101', type: 'STUDIO', status: 'OCCUPIED', price: 10000, area: 25 },
            { buildingId: bldB.id, number: '102', type: 'STUDIO', status: 'VACANT', price: 10000, area: 25 },
            { buildingId: bldB.id, number: '103', type: 'STUDIO', status: 'OCCUPIED', price: 11000, area: 26 },
            { buildingId: bldB.id, number: '201', type: 'ONE_BED', status: 'VACANT', price: 15000, area: 32 },
            { buildingId: bldB.id, number: '202', type: 'ONE_BED', status: 'OCCUPIED', price: 15000, area: 32 },
            // Tower 1
            { buildingId: tower1.id, number: '501', type: 'ONE_BED', status: 'OCCUPIED', price: 22000, area: 40 },
            { buildingId: tower1.id, number: '502', type: 'TWO_BED', status: 'VACANT', price: 35000, area: 65 },
            { buildingId: tower1.id, number: '503', type: 'COMMERCIAL', status: 'OCCUPIED', price: 50000, area: 80 },
            { buildingId: tower1.id, number: '1001', type: 'PENTHOUSE', status: 'RESERVED', price: 85000, area: 150 },
            { buildingId: tower1.id, number: '1002', type: 'THREE_BED', status: 'VACANT', price: 55000, area: 110 },
        ];

        const rooms = [];
        for (const rd of roomData) {
            rooms.push(await prisma.room.create({ data: rd }));
        }

        // --- Create Persons ---
        const persons = [
            // Leads
            { name: 'Somchai Jaidee', email: 'somchai@email.com', phone: '+66811234567', role: 'LEAD', leadStatus: 'NEW', notes: 'Interested in studio near BTS' },
            { name: 'Napat Srisuk', email: 'napat@email.com', phone: '+66822345678', role: 'LEAD', leadStatus: 'CONTACTED', notes: 'Looking for 1-bed for family' },
            { name: 'Lisa Chen', email: 'lisa.chen@email.com', phone: '+86139567890', role: 'LEAD', leadStatus: 'VIEWING_SCHEDULED', notes: 'Chinese investor, wants 2 units' },
            { name: 'Tanaka Yuki', email: 'tanaka@email.co.jp', phone: '+81901234567', role: 'LEAD', leadStatus: 'NEGOTIATING', notes: 'Japanese expat, needs by March' },
            { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+14155678901', role: 'LEAD', leadStatus: 'NEW', notes: 'Digital nomad, 6-month stay' },
            { name: 'Prayuth Wannapong', email: 'prayuth@email.com', phone: '+66833456789', role: 'LEAD', leadStatus: 'CONVERTED', notes: 'Signed contract for Room 101' },
            { name: 'Maria Santos', email: 'maria@email.com', phone: '+63917123456', role: 'LEAD', leadStatus: 'LOST', notes: 'Budget too low' },
            // Tenants
            { name: 'Kanya Thongchai', email: 'kanya@email.com', phone: '+66844567890', role: 'TENANT', leadStatus: null, notes: 'Room 101A tenant since 2024' },
            { name: 'Michael Brown', email: 'michael.b@email.com', phone: '+44789012345', role: 'TENANT', leadStatus: null, notes: 'Room 302A, UK expatriate' },
            // Owner / Staff
            { name: 'Khun Somsak', email: 'somsak@smilehome.com', phone: '+66801111111', role: 'OWNER', leadStatus: null, notes: 'Property owner' },
            { name: 'Arisa Techakanon', email: 'arisa@smilehome.com', phone: '+66802222222', role: 'STAFF', leadStatus: null, notes: 'Property manager' },
        ];

        const createdPersons = [];
        for (const pd of persons) {
            createdPersons.push(await prisma.person.create({ data: pd }));
        }

        // --- Create Interactions ---
        const interactionsData = [
            {
                personId: createdPersons[0].id,
                roomId: rooms[2].id, // Room 103A
                channel: 'PHONE',
                direction: 'INBOUND',
                subject: 'Inquiry about Studio room availability',
                content: 'Somchai called to ask about available studio rooms near BTS. Interested in monthly rent and move-in date. Prefers Building A.',
                tags: 'inquiry,studio,pricing',
            },
            {
                personId: createdPersons[1].id,
                roomId: rooms[3].id,
                channel: 'EMAIL',
                direction: 'OUTBOUND',
                subject: 'Follow-up: Room viewing appointment',
                content: 'Sent follow-up email to Napat about scheduling a room viewing for Room 201A. Attached floor plan and pricing sheet.',
                tags: 'follow-up,viewing',
            },
            {
                personId: createdPersons[2].id,
                channel: 'CHAT',
                direction: 'INBOUND',
                subject: 'Investment inquiry - bulk purchase',
                content: 'Lisa Chen reached out via LINE about purchasing 2 units as investment property. Wants projected rental yield and management fee details.',
                tags: 'investor,bulk-purchase,high-priority',
            },
            {
                personId: createdPersons[3].id,
                roomId: rooms[6].id, // Penthouse
                channel: 'WALK_IN',
                direction: 'INBOUND',
                subject: 'Penthouse viewing completed',
                content: 'Tanaka visited the penthouse unit 301A. Very interested, discussing pricing. Needs to move by end of March for work relocation.',
                tags: 'viewing,penthouse,negotiation',
            },
            {
                personId: createdPersons[4].id,
                channel: 'EMAIL',
                direction: 'INBOUND',
                subject: 'Long-term stay inquiry from digital nomad',
                content: 'Sarah inquired about 6-month rental options with flexible terms. Prefers furnished studio with high-speed internet. Budget: 15,000-20,000 THB/month.',
                tags: 'long-term,digital-nomad,flexible',
            },
            {
                personId: createdPersons[7].id,
                roomId: rooms[0].id,
                channel: 'LINE',
                direction: 'INBOUND',
                subject: 'AC maintenance request',
                content: 'Kanya reported that the air conditioner in Room 101A is making unusual noise and not cooling properly. Needs technician visit.',
                tags: 'maintenance,ac,urgent',
            },
            {
                personId: createdPersons[8].id,
                roomId: rooms[7].id,
                channel: 'PHONE',
                direction: 'INBOUND',
                subject: 'Lease renewal discussion',
                content: 'Michael called about his upcoming lease expiration. Interested in renewing for another 12 months. Negotiating 5% rent increase.',
                tags: 'renewal,contract,negotiation',
            },
            {
                personId: createdPersons[10].id,
                channel: 'SMS',
                direction: 'INTERNAL',
                subject: 'Team update: Monthly occupancy report',
                content: 'Arisa shared the monthly occupancy report. Current overall occupancy rate at 67%. New marketing campaign for vacant units planned for next week.',
                tags: 'internal,report,occupancy',
            },
        ];

        for (const id of interactionsData) {
            await prisma.interaction.create({ data: id });
        }

        // --- Create Contracts ---
        const contract = await prisma.contract.create({
            data: {
                personId: createdPersons[7].id, // Kanya
                roomId: rooms[0].id, // Room 101
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31'),
                monthlyRent: 12000,
                status: 'ACTIVE',
            }
        });

        // --- Create Invoices ---
        const invoices = [
            {
                contractId: contract.id,
                invoiceNumber: 'INV-2024-001',
                amount: 12000,
                status: 'PAID',
                dueDate: new Date('2024-01-05'),
                issuedDate: new Date('2024-01-01'),
            },
            {
                contractId: contract.id,
                invoiceNumber: 'INV-2024-002',
                amount: 12000,
                status: 'PAID',
                dueDate: new Date('2024-02-05'),
                issuedDate: new Date('2024-02-01'),
            },
            {
                contractId: contract.id,
                invoiceNumber: 'INV-2024-003',
                amount: 500,
                status: 'PAID',
                dueDate: new Date('2024-02-10'),
                issuedDate: new Date('2024-02-01'),
            }
        ];

        for (const inv of invoices) {
            await prisma.invoice.create({ data: inv });
        }

        return NextResponse.json({
            message: 'Demo data seeded successfully!',
            counts: {
                properties: 2,
                buildings: 3,
                rooms: roomData.length,
                persons: persons.length,
                interactions: interactionsData.length,
            },
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { error: 'Failed to seed data. Data may already exist — try resetting the database first.' },
            { status: 500 }
        );
    }
}
