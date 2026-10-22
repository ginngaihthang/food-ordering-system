import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/shared/SlidePanel';
import { usePermissions } from '@/hooks/usePermissions';
import { getPublicBaseUrl } from '@/lib/publicUrl';
import { downloadSvgAsPng } from '@/lib/qr';
import { isTableInUse } from '@/lib/tables';
import type { RestaurantTable } from '@/types/table';

interface TableActionsSheetProps {
  table: RestaurantTable | null;
  onClose: () => void;
  onDelete: (table: RestaurantTable) => void;
}

interface ActionsBodyProps {
  table: RestaurantTable;
  onClose: () => void;
  onDelete: (table: RestaurantTable) => void;
}

function ActionsBody({ table, onClose, onDelete }: ActionsBodyProps) {
  const { canDelete } = usePermissions();
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const inUse = isTableInUse(table);
  const menuUrl = `${getPublicBaseUrl()}/menu?table=${table.qrToken}`;

  async function handleDownload() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    setDownloading(true);
    setError('');
    try {
      await downloadSvgAsPng(svg, `table-${table.tableNumber}-qr.png`);
      onClose();
    } catch (err) {
      console.error('QR download failed:', err);
      setError('Could not download the QR code');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <h2 className="text-xl font-bold">Table {table.tableNumber}</h2>

      {/* Hidden QR used only to make the download file */}
      <div ref={qrRef} className="hidden" aria-hidden="true">
        <QRCodeSVG value={menuUrl} size={256} level="M" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-14 w-full justify-start gap-3 rounded-2xl px-4 text-base font-semibold"
        disabled={downloading}
        onClick={handleDownload}
      >
        <Download className="h-5 w-5" />
        {downloading ? 'Preparing...' : 'Download QR'}
      </Button>

      {canDelete && (
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full justify-start gap-3 rounded-2xl px-4 text-base font-semibold text-red-600 hover:text-red-700"
          disabled={inUse}
          onClick={() => onDelete(table)}
        >
          <Trash2 className="h-5 w-5" />
          Delete table{inUse ? ' (close session first)' : ''}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-14 w-full rounded-2xl text-base font-semibold"
        onClick={onClose}
      >
        Cancel
      </Button>
    </div>
  );
}

export function TableActionsSheet({ table, onClose, onDelete }: TableActionsSheetProps) {
  return (
    <SlidePanel
      open={table !== null}
      onClose={onClose}
      side="bottom"
      label={table ? `Actions for table ${table.tableNumber}` : 'Table actions'}
    >
      {table && <ActionsBody table={table} onClose={onClose} onDelete={onDelete} />}
    </SlidePanel>
  );
}