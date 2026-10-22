import { useMemo, useState } from 'react';
import { Plus, QrCode, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTableDialog } from '@/components/tables/AddTableDialog';
import { TableQrDialog } from '@/components/tables/TableQrDialog';
import { DeleteTableDialog } from '@/components/tables/DeleteTableDialog';
import { TableCard } from '@/components/tables/TableCard';
import { TableActionsSheet } from '@/components/tables/TableActionsSheet';
import { SessionBillPanel } from '@/components/tables/SessionBillPanel';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useTables } from '@/hooks/useTables';
import { useTableSession } from '@/hooks/useTableSession';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useNow } from '@/hooks/useNow';
import { getPublicBaseUrl } from '@/lib/publicUrl';
import { downloadSvgAsPng } from '@/lib/qr';
import { getErrorMessage } from '@/lib/error';
import { isTableInUse } from '@/lib/tables';
import type { RestaurantTable } from '@/types/table';

const MENU_BASE_URL = getPublicBaseUrl();

type Filter = 'ALL' | 'AVAILABLE' | 'OCCUPIED';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'AVAILABLE', label: 'Available' },
  { key: 'OCCUPIED', label: 'Occupied' },
];

export default function Tables() {
  const { tables, loading, loadData, addTable, removeTable, regenerateTableQr } = useTables();
  const { sessionData, loadSession, closeSession } = useTableSession();
  const now = useNow();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  // Add table
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // QR dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // "..." menu and delete
  const [actionsTable, setActionsTable] = useState<RestaurantTable | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Bill drawer
  const [billOpen, setBillOpen] = useState(false);
  const [billTable, setBillTable] = useState<RestaurantTable | null>(null);

  // Asks first, then closes the session. Errors show inside the dialog.
  const closeConfirm = useConfirmAction<RestaurantTable>({
    action: (table) => closeSession(table.id),
    onSuccess: () => {
      setBillOpen(false);
      void loadData();
    },
    fallbackError: 'Failed to close session',
  });

  const occupiedCount = tables.filter(isTableInUse).length;
  const availableCount = tables.length - occupiedCount;

  const visibleTables = useMemo(() => {
    const query = searchQuery.trim();
    return tables.filter((table) => {
      const inUse = isTableInUse(table);
      if (filter === 'AVAILABLE' && inUse) return false;
      if (filter === 'OCCUPIED' && !inUse) return false;
      return !query || String(table.tableNumber).includes(query);
    });
  }, [tables, filter, searchQuery]);

  async function handleAddTable() {
    if (!newTableNumber) {
      alert('Table number is required');
      return;
    }

    const tableNumber = Number(newTableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      alert('Table number must be a whole number greater than 0');
      return;
    }

    try {
      setSaving(true);
      await addTable(tableNumber);
      setNewTableNumber('');
      setAddDialogOpen(false);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to create table'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await removeTable(id);
      setDeleteTargetId(null);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete table'));
    }
  }

  function openQrDialog(table: RestaurantTable) {
    setSelectedTable(table);
    setQrDialogOpen(true);
  }

  async function handleRegenerateQr(id: number) {
    const confirmed = confirm('Regenerate QR code? The old QR code will stop working.');
    if (!confirmed) return;

    try {
      const updated = await regenerateTableQr(id);
      setSelectedTable(updated);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to regenerate QR code'));
    }
  }

  // Used by the QR dialog's Download button
  async function downloadQrCode(tableNumber: number) {
    const svg = document.getElementById(`qr-${tableNumber}`);
    if (!(svg instanceof SVGSVGElement)) return;

    try {
      await downloadSvgAsPng(svg, `table-${tableNumber}-qr.png`);
    } catch (err) {
      console.error('QR download failed:', err);
      alert('Could not download the QR code');
    }
  }

  async function openBill(table: RestaurantTable) {
    setBillTable(table);
    try {
      await loadSession(table.id);
      setBillOpen(true);
    } catch (err) {
      alert(getErrorMessage(err, 'Could not load the bill'));
    }
  }

  function startDelete(table: RestaurantTable) {
    setActionsTable(null);
    setDeleteTargetId(table.id);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-11 w-full max-w-md rounded-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Tables</h1>
          <p className="mt-1 text-muted-foreground">
            {occupiedCount} occupied · {availableCount} available
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 gap-2 rounded-2xl px-4 font-semibold"
            onClick={() => window.open('/admin/takeaway-qr', '_blank')}
          >
            <QrCode className="h-4 w-4" />
            Takeaway QR
          </Button>
          <Button
            type="button"
            className="h-12 gap-2 rounded-2xl px-5 font-semibold"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`h-11 rounded-full border px-5 text-[15px] font-semibold transition-colors ${
              filter === f.key
                ? 'border-foreground bg-foreground text-background'
                : 'bg-card hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="relative w-full sm:ml-auto sm:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="h-11 rounded-full pl-11"
          />
        </div>
      </div>

      {/* Cards */}
      {visibleTables.length === 0 ? (
        <div className="rounded-3xl border border-dashed py-14 text-center text-muted-foreground">
          {tables.length === 0 ? 'No tables yet. Press Add Table to create one.' : 'No tables match.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              now={now}
              onViewBill={openBill}
              onViewQr={openQrDialog}
              onMore={setActionsTable}
            />
          ))}
        </div>
      )}

      {/* Dialogs and panels */}
      <AddTableDialog
        open={addDialogOpen}
        tableNumber={newTableNumber}
        saving={saving}
        onOpenChange={setAddDialogOpen}
        onTableNumberChange={setNewTableNumber}
        onSave={handleAddTable}
      />

      <TableQrDialog
        open={qrDialogOpen}
        table={selectedTable}
        baseUrl={MENU_BASE_URL}
        onOpenChange={setQrDialogOpen}
        onDownload={downloadQrCode}
        onRegenerate={handleRegenerateQr}
      />

      <TableActionsSheet
        table={actionsTable}
        onClose={() => setActionsTable(null)}
        onDelete={startDelete}
      />

      <SessionBillPanel
        open={billOpen}
        table={billTable}
        sessionData={sessionData}
        onClose={() => setBillOpen(false)}
        onCloseSession={() => {
          if (billTable) closeConfirm.request(billTable);
        }}
        onRefresh={() => {
          if (billTable) void loadSession(billTable.id);
          void loadData();
        }}
      />

      <DeleteTableDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTargetId !== null) void handleDelete(deleteTargetId);
        }}
      />

      <ConfirmDialog
        open={closeConfirm.target !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirm.close();
        }}
        title="Close this table session?"
        description={
          closeConfirm.target
            ? `Table ${closeConfirm.target.tableNumber} will become available again. Its orders and bill stay in your history.`
            : ''
        }
        confirmLabel="Close session"
        destructive
        loading={closeConfirm.loading}
        error={closeConfirm.error}
        onConfirm={closeConfirm.confirm}
      />
    </div>
  );
}