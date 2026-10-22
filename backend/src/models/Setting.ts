import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface SettingValues {
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
  takeawayPrepay: boolean;
}

interface SettingAttributes extends SettingValues {
  id: number;
}

type SettingCreationAttributes = Optional<SettingAttributes, keyof SettingAttributes>;

export class Setting
  extends Model<SettingAttributes, SettingCreationAttributes>
  implements SettingAttributes
{
  declare id: number;
  declare restaurantName: string;
  declare address: string;
  declare phone: string;
  declare receiptFooter: string;
  declare currencySymbol: string;
  declare acceptDineIn: boolean;
  declare acceptTakeaway: boolean;
  declare closedMessage: string;
  declare paymentInstructions: string;
  declare taxRate: number; // PostgreSQL returns DECIMAL as a string, so always wrap it in Number()
  declare taxLabel: string;
  declare taxNumber: string;
  declare takeawayPrepay: boolean;
}

// The table only ever holds one row (id = 1)
Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
    restaurantName: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'My Restaurant' },
    address: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    phone: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    receiptFooter: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'Thank you!' },
    currencySymbol: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '$' },
    acceptDineIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    acceptTakeaway: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    closedMessage: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    paymentInstructions: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: 'Pay at the counter',
    },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    taxLabel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Tax' },
    taxNumber: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
    takeawayPrepay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  
  { sequelize, tableName: 'settings', timestamps: true, underscored: true }
);