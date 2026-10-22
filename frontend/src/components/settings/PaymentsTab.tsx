import { Switch } from '@/components/ui/switch';
import { AutoSaveField } from './AutoSaveField';
import { SettingRow, SettingsCard } from './SettingsCard';
import type { SettingsTabProps } from '@/types/settings';

export function PaymentsTab({ settings, save }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title="Payments"
        description="Staff mark each dine-in bill as paid with Cash or Online at the counter."
      >
        <SettingRow
          label="Payment instructions"
          htmlFor="paymentInstructions"
          description="Shown on the customer's order page."
        >
          <AutoSaveField
            id="paymentInstructions"
            value={settings.paymentInstructions}
            multiline
            maxLength={300}
            placeholder="Pay at the counter. PayNow accepted."
            onSave={(v) => save({ paymentInstructions: v })}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard
        title="Takeaway payment"
        description="Customers pay on Stripe's page (PayNow or card) before the kitchen sees a takeaway order. Dine-in stays pay-at-the-counter."
      >
        <SettingRow
          label="Require online payment for takeaway"
          description="When on, a takeaway order only appears in Live Orders after the payment is confirmed. It needs the Stripe keys on the server."
        >
          <div className="flex sm:justify-end">
            <Switch
              aria-label="Require online payment for takeaway"
              checked={settings.takeawayPrepay}
              onCheckedChange={(checked) => {
                save({ takeawayPrepay: checked });
              }}
            />
          </div>
        </SettingRow>
      </SettingsCard>

      <SettingsCard
        title="Tax"
        description="Your menu prices already include tax, so customers always pay the price they see. These settings only add a tax line to receipts."
      >
        <SettingRow label="Tax name" htmlFor="taxLabel" description="For example GST, VAT or SST.">
          <AutoSaveField
            id="taxLabel"
            value={settings.taxLabel}
            required
            maxLength={20}
            onSave={(v) => save({ taxLabel: v })}
          />
        </SettingRow>

        <SettingRow
          label="Tax rate (%)"
          htmlFor="taxRate"
          description="Between 0 and 50. Use 0 to hide tax on receipts. Changing it only affects new orders."
        >
          <AutoSaveField
            id="taxRate"
            value={String(settings.taxRate)}
            maxLength={5}
            placeholder="0"
            onSave={async (v) => {
              const rate = Number(v);
              if (!Number.isFinite(rate) || rate < 0 || rate > 50) return false; // puts the old value back
              return save({ taxRate: rate });
            }}
          />
        </SettingRow>

        <SettingRow
          label="Registration number"
          htmlFor="taxNumber"
          description="Printed at the top of receipts when filled in, for example your GST number."
        >
          <AutoSaveField
            id="taxNumber"
            value={settings.taxNumber}
            maxLength={50}
            placeholder="Optional"
            onSave={(v) => save({ taxNumber: v })}
          />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}