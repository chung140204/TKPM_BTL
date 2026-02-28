import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const person = await prisma.person.findUnique({
        where: { id },
        include: {
            interactions: {
                orderBy: { createdAt: 'desc' },
            },
            contracts: {
                include: {
                    room: { include: { building: true } }
                },
                orderBy: { startDate: 'desc' },
            }
        }
    });

    if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json(person);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const person = await prisma.person.update({
        where: { id },
        data: {
            ...(body.leadStatus && { leadStatus: body.leadStatus }),
            ...(body.name && { name: body.name }),
            ...(body.email !== undefined && { email: body.email }),
            ...(body.phone !== undefined && { phone: body.phone }),
            ...(body.notes !== undefined && { notes: body.notes }),
        },
    });
    return NextResponse.json(person);
}
