import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type TableStatusEnum = 'AVAILABLE' | 'OCCUPIED';

interface TableAttributes {
  id: number;
  tableNumber: number;
  qrToken: string;
  status: TableStatusEnum;
}

type TableCreationAttributes = Optional<TableAttributes, 'id' | 'status'>;

export class RestaurantTable
  extends Model<TableAttributes, TableCreationAttributes>
  implements TableAttributes
{
  declare id: number;
  declare tableNumber: number;
  declare qrToken: string;
  declare status: TableStatusEnum;
}

RestaurantTable.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tableNumber: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    qrToken: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'OCCUPIED'),
      defaultValue: 'AVAILABLE',
    },
  },
  { sequelize, tableName: 'tables', timestamps: true, underscored: true }
);