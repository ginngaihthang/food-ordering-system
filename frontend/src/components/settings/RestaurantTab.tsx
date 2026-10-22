import { AutoSaveField } from './AutoSaveField';
import { SettingRow, SettingsCard } from './SettingsCard';
import type { SettingsTabProps } from '@/types/settings';

export function RestaurantTab({ settings, save }: SettingsTabProps) {
  return (
    <SettingsCard
      title="Restaurant details"
      description="Shown on printed receipts and to your customers."
    >
      <SettingRow label="Restaurant name" htmlFor="restaurantName">
        <AutoSaveField
          id="restaurantName"
          value={settings.restaurantName}
          required
          maxLength={80}
          onSave={(v) => save({ restaurantName: v })}
        />
      </SettingRow>

      <SettingRow label="Address" htmlFor="address" description="Printed at the top of receipts.">
        <AutoSaveField
          id="address"
          value={settings.address}
          multiline
          maxLength={200}
          placeholder="123 Restaurant Street"
          onSave={(v) => save({ address: v })}
        />
      </SettingRow>

      <SettingRow label="Phone" htmlFor="phone">
        <AutoSaveField
          id="phone"
          value={settings.phone}
          maxLength={30}
          placeholder="+65 1234 5678"
          onSave={(v) => save({ phone: v })}
        />
      </SettingRow>

      <SettingRow
        label="Currency symbol"
        htmlFor="currencySymbol"
        description="Used when amounts are shown, e.g. $, RM or S$."
      >
        <AutoSaveField
          id="currencySymbol"
          value={settings.currencySymbol}
          required
          maxLength={5}
          onSave={(v) => save({ currencySymbol: v })}
        />
      </SettingRow>

      <SettingRow
        label="Receipt message"
        htmlFor="receiptFooter"
        description="Printed at the bottom of receipts."
      >
        <AutoSaveField
          id="receiptFooter"
          value={settings.receiptFooter}
          maxLength={200}
          placeholder="Thank you!"
          onSave={(v) => save({ receiptFooter: v })}
        />
      </SettingRow>
    </SettingsCard>
  );
}