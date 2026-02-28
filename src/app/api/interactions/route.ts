import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const channel = searchParams.get('channel');

    const interactions = await prisma.interaction.findMany({
        where: channel ? { channel } : undefined,
        include: {
            person: {
                select: { id: true, name: true, email: true, phone: true },
            },
            room: {
                select: {
                    id: true,
                    number: true,
                    building: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return NextResponse.json(interactions);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const interaction = await prisma.interaction.create({
        data: {
            personId: body.personId,
            roomId: body.roomId || null,
            contractId: body.contractId || null,
            channel: body.channel || 'PHONE',
            direction: body.direction || 'INBOUND',
            subject: body.subject,
            content: body.content,
            tags: body.tags || '',
        },
        include: {
            person: { select: { id: true, name: true } },
            room: {
                select: {
                    id: true,
                    number: true,
                    building: { select: { name: true } },
                },
            },
        },
    });
    return NextResponse.json(interaction, { status: 201 });
}
