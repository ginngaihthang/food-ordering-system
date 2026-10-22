import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { getPublicBaseUrl, getUrlWarning } from '@/lib/publicUrl';
import { downloadSvgAsPng } from '@/lib/qr';

const STEPS = ['Scan the code', 'Choose your food', 'Place your order and collect your pickup number'];

export default function TakeawayQr() {
  const { settings } = useSettings();
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // The menu without a table is the takeaway menu
  const menuUrl = `${getPublicBaseUrl()}/menu`;
  const warning = getUrlWarning(menuUrl);

  async function handleDownload() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    setDownloading(true);
    try {
      await downloadSvgAsPng(svg, 'takeaway-qr.png');
    } catch (err) {
      console.error('QR download failed:', err);
      alert('Could not download the QR code');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mx-auto max-w-md space-y-4">
        {/* Controls (not printed) */}
        <div className="space-y-3 print:hidden">
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print poster
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              disabled={downloading}
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing...' : 'Download PNG'}
            </Button>
          </div>

          {warning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {!settings.acceptTakeaway && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Takeaway ordering is switched off in Settings, so customers who scan this will see
              the closed message.
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Print this and put it at the counter. This code opens the takeaway menu. It is
            different from a table QR code, which opens the menu for one table.
          </p>
        </div>

        {/* The poster */}
        <div className="rounded-3xl bg-white p-8 text-center shadow-lg print:rounded-none print:shadow-none">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {settings.restaurantName}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight">Order takeaway</h1>
          <p className="mt-1 text-lg text-muted-foreground">Scan with your phone camera</p>

          <div ref={qrRef} className="mx-auto mt-6 inline-block rounded-2xl border bg-white p-4">
            <QRCodeSVG value={menuUrl} size={280} level="M" />
          </div>

          <p className="mt-3 break-all text-xs text-muted-foreground">{menuUrl}</p>

          <ol className="mx-auto mt-6 max-w-xs space-y-2 text-left">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-sm text-muted-foreground">No app or account needed</p>
        </div>
      </div>
    </div>
  );
}