import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';

import { v4 as uuidv4 } from 'uuid';
import { User } from '@shared/database/models/User';
@Table({
  tableName: 'contacts',
  timestamps: true
})
export class Contact extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'agent_id' })
  agentId!: string;

  @BelongsTo(() => User)
  agent!: User;

  @AllowNull(false)
  @Column({type: DataType.STRING(100), field: 'client_full_name' } )
  clientFullName!: string;

  @AllowNull(false)
  @Column( { type: DataType.STRING(255), field: 'client_email' })
  clientEmail!: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20), field: 'client_phone' })
  clientPhone?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(4000), field: 'client_message' })
  clientMessage?: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  @Default(false)
  wantToViewProperty!: boolean;
}
