import {
  Column,
  Model,
  Table,
  PrimaryKey,
  DataType,
  Default,
  Index,
  AllowNull,
  Unique,
} from 'sequelize-typescript';

@Table({ tableName: 'Users', timestamps: true, paranoid: true })
export class Users extends Model<Users> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Unique
  @Index
  @Column(DataType.STRING(100))
  declare userName: string;

  @AllowNull(false)
  @Unique
  @Index
  @Column(DataType.STRING(100))
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare password: string;

  @AllowNull(false)
  @Default('user')
  @Column(DataType.ENUM('admin', 'user'))
  declare role: string;

  @AllowNull(true)
  @Unique
  @Index
  @Column(DataType.TEXT)
  declare refreshTokenHash: string;

  @AllowNull(false)
  @Default(true)
  @Index
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;
}
