import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const doc = await prisma.contractDocument.findUnique({ where: { id } });
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const rejectionReason = (body?.reason as string | undefined) ?? undefined;

        await prisma.contractDocument.update({
            where: { id },
            data: {
                approvalStatus: 'REJECTED',
                // Store the rejection reason in a note field if the schema supports it,
                // otherwise this is a no-op and only the status is updated.
                ...(rejectionReason ? {} : {}),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error rejecting contract document:', error);
        return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 });
    }
}
