import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

async function uploadFile(file: File, prefix: string): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        // Upload to Vercel Blob in production
        const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
            access: 'public',
        });
        return blob.url;
    } else {
        // Fallback to local storage for development
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${prefix ? prefix + '-' : ''}${timestamp}-${safeName}`;
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);
        return `/uploads/${filename}`;
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const file = formData.get('file') as File | null;
        const productFile = formData.get('productFile') as File | null;
        const tenantName = (formData.get('tenantName') as string | null)?.trim();
        const tenantEmail = (formData.get('tenantEmail') as string | null)?.trim() || null;
        const roomNumber = (formData.get('roomNumber') as string | null)?.trim();
        const buildingName = (formData.get('buildingName') as string | null)?.trim();
        const monthlyRentRaw = (formData.get('monthlyRent') as string | null)?.trim();
        const typeRaw = (formData.get('type') as string | null)?.trim() || 'RENTAL';
        const startDateRaw = formData.get('startDate') as string | null;
        const endDateRaw = formData.get('endDate') as string | null;
        const VALID_TYPES = ['RENTAL', 'SALE', 'MANAGEMENT', 'LEASE_EXTEND', 'SHORT_TERM'];
        const contractType = VALID_TYPES.includes(typeRaw) ? typeRaw : 'RENTAL';

        // ── Validation ────────────────────────────────────────────────────────
        if (!file || !productFile) {
            return NextResponse.json({ error: 'Both Main Contract and Product Detail files are required' }, { status: 400 });
        }
        if (file.type !== 'application/pdf' || productFile.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Both files must be PDFs' }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024 || productFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size exceeds 10 MB limit' }, { status: 400 });
        }
        if (!tenantName) {
            return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
        }
        if (!roomNumber) {
            return NextResponse.json({ error: 'Room number is required' }, { status: 400 });
        }
        if (!buildingName) {
            return NextResponse.json({ error: 'Building name is required' }, { status: 400 });
        }
        if (!monthlyRentRaw || isNaN(Number(monthlyRentRaw)) || Number(monthlyRentRaw) < 0) {
            return NextResponse.json({ error: 'Monthly rent is required and must be >= 0' }, { status: 400 });
        }

        const productName = (formData.get('productName') as string | null)?.trim() || null;
        const productArea = (formData.get('productArea') as string | null)?.trim() || null;
        const parsedMonthlyRent = parseFloat(monthlyRentRaw);

        // ── Upload files ──────────────────────────────────────────────────────
        const fileUrl = await uploadFile(file, 'contracts');

        // ── 1. Find or create Person ──────────────────────────────────────────
        let person = tenantEmail
            ? await prisma.person.findFirst({ where: { email: tenantEmail } })
            : await prisma.person.findFirst({ where: { name: tenantName } });

        if (!person) {
            person = await prisma.person.create({
                data: {
                    name: tenantName,
                    email: tenantEmail ?? undefined,
                    role: 'TENANT',
                },
            });
        }

        // ── 2. Find or create Building ────────────────────────────────────────
        //    Building requires a propertyId — reuse first property or create one.
        let building = await prisma.building.findFirst({ where: { name: buildingName } });

        if (!building) {
            // Resolve a fallback property (create if the db is empty)
            let property = await prisma.property.findFirst();
            if (!property) {
                property = await prisma.property.create({
                    data: { name: 'Default Property', address: '-' },
                });
            }
            building = await prisma.building.create({
                data: {
                    name: buildingName,
                    propertyId: property.id,
                },
            });
        }

        // ── 3. Find or create Room ────────────────────────────────────────────
        let room = await prisma.room.findFirst({
            where: { number: roomNumber, buildingId: building.id },
        });

        if (!room) {
            room = await prisma.room.create({
                data: {
                    number: roomNumber,
                    buildingId: building.id,
                },
            });
        }

        // ── 4. Create DRAFT Contract ──────────────────────────────────────────
        const contract = await prisma.contract.create({
            data: {
                personId: person.id,
                roomId: room.id,
                type: contractType,
                status: 'DRAFT',
                startDate: startDateRaw ? new Date(startDateRaw) : new Date(),
                endDate: endDateRaw ? new Date(endDateRaw) : new Date(),
                monthlyRent: parsedMonthlyRent,
                deposit: 0,
                productName,
                productArea,
            },
        });

        // ── 5. Create ContractDocument (Main) ────────────────────────────────
        await prisma.contractDocument.create({
            data: {
                contractId: contract.id,
                fileUrl,
                originalName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                // @ts-ignore
                documentType: 'CONTRACT',
                approvalStatus: 'PENDING',
            },
        });

        // ── 6. Handle Mandatory Product Detail File ──────────────────────────
        if (productFile && productFile.size > 0) {
            const productFileUrl = await uploadFile(productFile, 'products');

            await prisma.contractDocument.create({
                data: {
                    contractId: contract.id,
                    fileUrl: productFileUrl,
                    originalName: productFile.name,
                    fileSize: productFile.size,
                    mimeType: productFile.type,
                    // @ts-ignore
                    documentType: 'PRODUCT_DETAIL',
                    approvalStatus: 'PENDING',
                },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error uploading contract document:', error);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }
}
