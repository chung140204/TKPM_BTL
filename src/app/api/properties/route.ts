import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const properties = await prisma.property.findMany({
        include: {
            buildings: {
                include: {
                    rooms: {
                        select: { id: true, status: true },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(properties);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const property = await prisma.property.create({
        data: {
            name: body.name,
            address: body.address,
            type: body.type || 'RESIDENTIAL',
            tenantId: body.tenantId || 'default',
        },
    });
    return NextResponse.json(property, { status: 201 });
}
