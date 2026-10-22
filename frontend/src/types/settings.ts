export interface Settings {
  restaurantName: string;
  address: string;
  phone: string;
  receiptFooter: string;
  currencySymbol: string;
  acceptDineIn: boolean;
  acceptTakeaway: boolean;
  closedMessage: string;
  paymentInstructions: string;
  taxRate: number;
  taxLabel: string;
  taxNumber: string;
  takeawayPrepay: boolean
}

export const defaultSettings: Settings = {
  restaurantName: 'My Restaurant',
  address: '',
  phone: '',
  receiptFooter: 'Thank you!',
  currencySymbol: '$',
  acceptDineIn: true,
  acceptTakeaway: true,
  closedMessage: '',
  paymentInstructions: 'Pay at the counter',
  taxRate: 0,
  taxLabel: 'Tax',
  taxNumber: '',
  takeawayPrepay: false,
};

// Resolves to true when the change was saved
export type SaveSettings = (patch: Partial<Settings>) => Promise<boolean>;

export interface SettingsTabProps {
  settings: Settings;
  save: SaveSettings;
}