import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface TableSessionAttributes {
  id: number;
  tableId: number;
  startedAt: Date;
  closedAt: Date | null;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
  paidAt: Date | null;
  cashReceived: number | null;
}

type TableSessionCreationAttributes = Optional<
  TableSessionAttributes,
  'id' | 'startedAt' | 'closedAt' | 'paymentStatus' | 'paymentMethod' | 'paidAt' | 'cashReceived'
>;

export class TableSession
  extends Model<TableSessionAttributes, TableSessionCreationAttributes>
  implements TableSessionAttributes
{
  declare id: number;
  declare tableId: number;
  declare startedAt: Date;
  declare closedAt: Date | null;
  declare paymentStatus: 'UNPAID' | 'PAID';
  declare paymentMethod: 'CASH' | 'ONLINE' | null;
  declare paidAt: Date | null;
  declare cashReceived: number | null; // arrives as a string from PostgreSQL, so wrap it in Number()
}

TableSession.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tableId: { type: DataTypes.INTEGER, allowNull: false },
    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    paymentStatus: { type: DataTypes.ENUM('UNPAID', 'PAID'), defaultValue: 'UNPAID' },
    paymentMethod: { type: DataTypes.ENUM('CASH', 'ONLINE'), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    cashReceived: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  },
  { sequelize, tableName: 'table_sessions', timestamps: false, underscored: true }
);