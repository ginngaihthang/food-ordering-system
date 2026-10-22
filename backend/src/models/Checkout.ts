import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface CheckoutItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type CheckoutStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

interface CheckoutAttributes {
  id: number;
  publicToken: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  items: CheckoutItem[];
  totalCents: number;
  currency: string;
  taxRate: number;
  status: CheckoutStatus;
  orderId: number | null;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type CheckoutCreationAttributes = Optional<
  CheckoutAttributes,
  'id' | 'stripeSessionId' | 'stripePaymentIntentId' | 'status' | 'orderId'
>;

export class Checkout
  extends Model<CheckoutAttributes, CheckoutCreationAttributes>
  implements CheckoutAttributes
{
  declare id: number;
  declare publicToken: string;
  declare stripeSessionId: string | null;
  declare stripePaymentIntentId: string | null;
  declare items: CheckoutItem[];
  declare totalCents: number;
  declare currency: string;
  declare taxRate: number; // a string at runtime (PostgreSQL DECIMAL), so wrap it in Number()
  declare status: CheckoutStatus;
  declare orderId: number | null;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Checkout.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    publicToken: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    stripeSessionId: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    stripePaymentIntentId: { type: DataTypes.STRING(255), allowNull: true },
    items: { type: DataTypes.JSONB, allowNull: false },
    totalCents: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING' },
    orderId: { type: DataTypes.INTEGER, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'checkouts', timestamps: true, underscored: true }
);