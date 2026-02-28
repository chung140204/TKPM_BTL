import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const role = searchParams.get('role');

    const persons = await prisma.person.findMany({
        where: {
            AND: [
                role ? { role } : {},
                query ? {
                    OR: [
                        { name: { contains: query } },
                        { email: { contains: query } },
                    ]
                } : {},
            ]
        },
        include: {
            interactions: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                select: { id: true, subject: true, createdAt: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(persons);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const person = await prisma.person.create({
        data: {
            name: body.name,
            email: body.email || null,
            phone: body.phone || null,
            role: body.role || 'LEAD',
            leadStatus: body.leadStatus || (body.role === 'LEAD' ? 'NEW' : null),
            notes: body.notes || null,
            tenantId: body.tenantId || 'default',
        },
    });
    return NextResponse.json(person, { status: 201 });
}
