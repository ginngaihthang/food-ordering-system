import { Switch } from '@/components/ui/switch';
import { AutoSaveField } from './AutoSaveField';
import { SettingRow, SettingsCard } from './SettingsCard';
import type { SettingsTabProps } from '@/types/settings';

export function OrdersTab({ settings, save }: SettingsTabProps) {
  return (
    <SettingsCard
      title="Accepting orders"
      description="Turn these off to stop customers placing new orders. Staff can still manage orders already placed."
    >
      <SettingRow
        label="Dine-in orders"
        description="Customers who scan a table QR code can order."
      >
        <div className="flex sm:justify-end">
          <Switch
            aria-label="Accept dine-in orders"
            checked={settings.acceptDineIn}
            onCheckedChange={(checked) => {
              save({ acceptDineIn: checked });
            }}
          />
        </div>
      </SettingRow>

      <SettingRow label="Takeaway orders" description="Customers who open the menu without a table.">
        <div className="flex sm:justify-end">
          <Switch
            aria-label="Accept takeaway orders"
            checked={settings.acceptTakeaway}
            onCheckedChange={(checked) => {
              save({ acceptTakeaway: checked });
            }}
          />
        </div>
      </SettingRow>

      <SettingRow
        label="Message when closed"
        htmlFor="closedMessage"
        description="Shown to customers while ordering is off."
      >
        <AutoSaveField
          id="closedMessage"
          value={settings.closedMessage}
          multiline
          maxLength={200}
          placeholder="Kitchen is closed. Back at 6pm."
          onSave={(v) => save({ closedMessage: v })}
        />
      </SettingRow>
    </SettingsCard>
  );
}