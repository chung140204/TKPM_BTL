import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { status: 'PAID' },
            select: {
                amount: true,
                issuedDate: true,
            }
        });

        // Group by month
        const revenueByMonth: Record<string, number> = {};
        let totalRevenue = 0;

        invoices.forEach((inv: { amount: number; issuedDate: Date }) => {
            const date = new Date(inv.issuedDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + inv.amount;
            totalRevenue += inv.amount;
        });

        // Convert to sorted array for charts
        const chartData = Object.entries(revenueByMonth)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Get occupancy stats too
        const totalRooms = await prisma.room.count();
        const occupiedRooms = await prisma.room.count({ where: { status: 'OCCUPIED' } });
        const totalInvoices = await prisma.invoice.count();

        return NextResponse.json({
            totalRevenue,
            totalInvoices,
            monthlyRevenue: chartData,
            occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
        });
    } catch (error) {
        console.error('Financial report generation failed:', error);
        return NextResponse.json({ error: 'Failed to generate financial report' }, { status: 500 });
    }
}
