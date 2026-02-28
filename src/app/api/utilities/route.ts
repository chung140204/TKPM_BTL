import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const meters = await prisma.utilityMeter.findMany({
        include: {
            room: {
                include: { building: true }
            },
            readings: {
                orderBy: { readingDate: 'desc' },
                take: 1,
            },
        },
    });
    return NextResponse.json(meters);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Ensure meter exists or create one
        let meter = await prisma.utilityMeter.findFirst({
            where: { roomId: body.roomId, type: body.type }
        });

        if (!meter) {
            meter = await prisma.utilityMeter.create({
                data: {
                    roomId: body.roomId,
                    type: body.type,
                    number: body.meterNumber || 'GENERIC-001',
                }
            });
        }

        const reading = await prisma.meterReading.create({
            data: {
                meterId: meter.id,
                value: body.value,
                readingDate: new Date(body.readingDate || Date.now()),
                imageUrl: body.imageUrl || null,
                status: 'APPROVED',
            },
        });
        return NextResponse.json(reading, { status: 201 });
    } catch (error) {
        console.error('Failed to record utility reading:', error);
        return NextResponse.json({ error: 'Failed to record utility reading' }, { status: 500 });
    }
}
