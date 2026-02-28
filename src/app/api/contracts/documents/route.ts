import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const documents = await prisma.contractDocument.findMany({
            include: {
                contract: {
                    include: {
                        person: true,
                        room: {
                            include: {
                                building: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return NextResponse.json(documents);
    } catch (error) {
        console.error('Error fetching contract documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}
