import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getOrderLabel, isOnlinePaidTakeaway, type CancellableOrder } from '@/lib/orderRules';

interface CancelOrderDialogProps {
  order: CancellableOrder | null;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelOrderDialog({
  order,
  loading,
  error,
  onConfirm,
  onClose,
}: CancelOrderDialogProps) {
  return (
    <ConfirmDialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Cancel this order?"
      description={
        order
          ? isOnlinePaidTakeaway(order)
            ? `${getOrderLabel(order)} will be cancelled and the customer refunded in full. This can't be undone.`
            : `${getOrderLabel(order)} will be cancelled and removed from the bill. This can't be undone.`
          : ''
      }
      confirmLabel="Cancel order"
      cancelLabel="Keep order"
      destructive
      loading={loading}
      error={error}
      onConfirm={onConfirm}
    />
  );
}