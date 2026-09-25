import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface TableSessionAttributes {
  id: number;
  tableId: number;
  startedAt: Date;
  closedAt: Date | null;
}

type TableSessionCreationAttributes = Optional <TableSessionAttributes,'id' | 'startedAt' | 'closedAt'>;

export class TableSession
  extends Model<TableSessionAttributes, TableSessionCreationAttributes>
  implements TableSessionAttributes
{
  declare id: number;
  declare tableId: number;
  declare startedAt: Date;
  declare closedAt: Date | null;
}

TableSession.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tableId: { type: DataTypes.INTEGER, allowNull: false },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    closedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'table_sessions',
    timestamps: false, // has its own started_at/closed_at instead
    underscored: true,
  }
);