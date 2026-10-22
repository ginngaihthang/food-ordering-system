import { Loader2, XCircle } from 'lucide-react';

export function PaymentPending() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3 p-8 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
      <h1 className="text-xl font-bold">Confirming your payment</h1>
      <p className="text-sm text-muted-foreground">
        This usually takes a few seconds. Please keep this page open. Your pickup number will
        appear here.
      </p>
    </div>
  );
}

export function PaymentNotCompleted({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-8 text-center">
      <XCircle className="mx-auto h-10 w-10 text-red-500" />
      <h1 className="text-xl font-bold">Payment not completed</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onBack}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        Back to cart
      </button>
    </div>
  );
}