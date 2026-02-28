import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const invoices = await prisma.invoice.findMany({
        include: {
            contract: {
                include: {
                    person: true,
                    room: true
                }
            }
        },
        orderBy: { issuedDate: 'desc' },
    });
    return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const invoice = await prisma.invoice.create({
            data: {
                contractId: body.contractId,
                invoiceNumber: `INV-${Date.now()}`,
                amount: body.amount,
                dueDate: new Date(body.dueDate),
                status: body.status || 'DRAFT',
            },
        });
        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error('Failed to create invoice:', error);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }
}
