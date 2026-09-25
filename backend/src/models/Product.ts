import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface ProductAttributes {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

type ProductCreationAttributes = Optional<ProductAttributes, 'id' | 'description' | 'imageUrl' | 'isAvailable'>;

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare id: number;
  declare categoryId: number;
  declare name: string;
  declare description: string | null;
  declare price: number;
  declare imageUrl: string | null;
  declare isAvailable: boolean;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'products', timestamps: true, underscored: true }
);