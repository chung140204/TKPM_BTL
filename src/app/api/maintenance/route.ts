import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const tickets = await prisma.maintenanceTicket.findMany({
        include: {
            room: {
                include: { building: true }
            },
            reportedBy: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tickets);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const ticket = await prisma.maintenanceTicket.create({
            data: {
                roomId: body.roomId,
                reportedById: body.reportedById,
                title: body.title,
                description: body.description,
                priority: body.priority || 'MEDIUM',
                status: body.status || 'OPEN',
            },
        });
        return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
        console.error('Failed to create maintenance ticket:', error);
        return NextResponse.json({ error: 'Failed to create maintenance ticket' }, { status: 500 });
    }
}
