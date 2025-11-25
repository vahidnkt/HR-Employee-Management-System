import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Users } from '../users/users.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['token'] },
    { fields: ['expiresAt'] },
  ],
})
export class RefreshTokens extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  })
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => Users)
  @Column({
    type: DataType.UUID,
  })
  userId: string;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  token: string;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
  })
  expiresAt: Date;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
  })
  isRevoked: boolean;

  @Default(null)
  @Column({
    type: DataType.STRING(50),
  })
  revokedReason: string;

  // Relationships
  @BelongsTo(() => Users)
  user: Users;
}
