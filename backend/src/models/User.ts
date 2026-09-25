import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role'>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare username: string;
  declare email: string;
  declare password: string;
  declare role: UserRole;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('ADMIN', 'STAFF', 'CUSTOMER'),
      defaultValue: 'ADMIN',
    },
  },
  { sequelize, tableName: 'users', timestamps: true, underscored: true }
);