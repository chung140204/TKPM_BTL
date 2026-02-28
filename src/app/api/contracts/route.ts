import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const contracts = await prisma.contract.findMany({
        include: {
            room: {
                include: { building: true }
            },
            person: true,
            documents: {
                orderBy: { createdAt: 'desc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contracts);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const contract = await prisma.contract.create({
            data: {
                roomId: body.roomId,
                personId: body.personId,
                type: body.type || 'RENTAL',
                status: body.status || 'DRAFT',
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                monthlyRent: body.monthlyRent || 0,
                deposit: body.deposit || 0,
            },
        });
        return NextResponse.json(contract, { status: 201 });
    } catch (error) {
        console.error('Failed to create contract:', error);
        return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
        }

        await prisma.contract.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete contract:', error);
        return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
    }
}
