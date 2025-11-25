import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  AllowNull,
  Unique,
  Default,
  PrimaryKey,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['createdAt'] },
    { fields: ['isActive'] },
    { fields: ['role'] },
    { fields: ['phone'] },
  ],
})
export class Users extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column({
    type: DataType.STRING(255),
  })
  email: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
  })
  password: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(255),
  })
  name: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  phone: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  whatsappNumber: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(100),
  })
  avatar: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  bio: string;

  @Default('user')
  @Column({
    type: DataType.STRING(50),
  })
  role: string;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
  })
  isActive: boolean;

  @Default(null)
  @Column({
    type: DataType.DATE,
  })
  lastLogin: Date;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
  })
  failedLoginAttempts: number;

  @Default(null)
  @Column({
    type: DataType.DATE,
  })
  lockedUntil: Date;
}
