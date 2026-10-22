import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddTableDialogProps {
  open: boolean;
  tableNumber: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onTableNumberChange: (value: string) => void;
  onSave: () => void;
}

export function AddTableDialog({
  open,
  tableNumber,
  saving,
  onOpenChange,
  onTableNumberChange,
  onSave,
}: AddTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="table-number">
            Table Number
          </Label>

          <Input
            id="table-number"
            type="number"
            min="1"
            value={tableNumber}
            onChange={(event) =>
              onTableNumberChange(event.target.value)
            }
            placeholder="e.g. 5"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}