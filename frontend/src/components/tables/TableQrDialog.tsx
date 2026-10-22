import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw } from 'lucide-react';


import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RestaurantTable } from '@/types/table';
import { usePermissions } from '@/hooks/usePermissions';

interface TableQrDialogProps {
  open: boolean;
  table: RestaurantTable | null;
  baseUrl: string;
  onOpenChange: (open: boolean) => void;
  onDownload: (tableNumber: number) => void;
  onRegenerate: (id: number) => void;
}

export function TableQrDialog({
  open,
  table,
  baseUrl,
  onOpenChange,
  onDownload,
  onRegenerate,
}: TableQrDialogProps) {

  const { canEdit } = usePermissions();
  if (!table) {
    return null;
  }

  const menuUrl = `${baseUrl}/menu?table=${table.qrToken}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Table {table.tableNumber} QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-md border bg-white p-4">
            <QRCodeSVG
              id={`qr-${table.tableNumber}`}
              value={menuUrl}
              size={200}
            />
          </div>

          <p className="break-all text-center text-sm text-muted-foreground">
            {menuUrl}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                onDownload(table.tableNumber)
              }
            >
              Download PNG
            </Button>

            {canEdit && (
              <Button variant="outline" className="gap-2" onClick={() => onRegenerate(table.id)}>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}