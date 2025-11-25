import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Users } from '../users/users.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'schools',
  timestamps: true,
  indexes: [
    { fields: ['adminId'] },
    { fields: ['createdAt'] },
    { fields: ['isActive'] },
    { fields: ['name'] },
  ],
})
export class Schools extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  })
  declare id: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
  })
  name: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  description: string;

  @AllowNull(false)
  @ForeignKey(() => Users)
  @Column({
    type: DataType.UUID,
  })
  adminId: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(255),
  })
  logo: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(255),
  })
  banner: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(100),
  })
  address: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(20),
  })
  phone: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(255),
  })
  email: string;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
  })
  totalClasses: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
  })
  totalStudents: number;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
  })
  isActive: boolean;

  // Relationships
  @BelongsTo(() => Users)
  admin: Users;
}
