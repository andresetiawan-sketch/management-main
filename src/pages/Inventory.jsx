import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryList from '@/components/inventory/InventoryList';
import LoanList from '@/components/inventory/LoanList';
import StockMutationList from '@/components/inventory/StockMutationList.jsx';
import { Package, ClipboardList, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Inventory() {
  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-created_date', 500)
  });
  const criticalItems = items.filter(i => i.stok !== undefined && i.stok !== null && i.stok_minimum !== undefined && i.stok <= i.stok_minimum);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <Package className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Manajemen Inventaris</h1>
          <p className="text-xs text-gray-500">Kelola aset, stok, mutasi, dan peminjaman barang operasional</p>
        </div>
        {criticalItems.length > 0 && (
          <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {criticalItems.length} stok kritis
          </Badge>
        )}
      </div>

      <Tabs defaultValue="barang">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="barang" className="flex items-center gap-2 text-xs">
            <Package className="w-3.5 h-3.5" /> Daftar Barang
          </TabsTrigger>
          <TabsTrigger value="mutasi" className="flex items-center gap-2 text-xs">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Mutasi Stok
          </TabsTrigger>
          <TabsTrigger value="pinjam" className="flex items-center gap-2 text-xs">
            <ClipboardList className="w-3.5 h-3.5" /> Riwayat Peminjaman
          </TabsTrigger>
        </TabsList>
        <TabsContent value="barang" className="mt-4">
          <InventoryList />
        </TabsContent>
        <TabsContent value="mutasi" className="mt-4">
          <StockMutationList />
        </TabsContent>
        <TabsContent value="pinjam" className="mt-4">
          <LoanList />
        </TabsContent>
      </Tabs>
    </div>
  );
}