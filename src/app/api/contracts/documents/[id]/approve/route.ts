import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const doc = await prisma.contractDocument.findUnique({ where: { id } });
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        await prisma.contractDocument.update({
            where: { id },
            data: {
                approvalStatus: 'APPROVED',
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error approving contract document:', error);
        return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 });
    }
}
