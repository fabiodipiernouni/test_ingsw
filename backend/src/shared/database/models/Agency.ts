import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  ForeignKey,
  BelongsTo,
  HasMany,
  Sequelize
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';

@Table({
  tableName: 'agencies',
  timestamps: true
})
export class Agency extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(255))
  name!: string;

  @AllowNull(true)
  @Column(DataType.STRING(4000))
  description?: string;

  // Address fields (consistent with Property model)
  @AllowNull(true)
  @Column(DataType.STRING(200))
  street?: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  city?: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  province?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(10), field: 'zip_code' })
  zipCode?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  country?: string;

  @AllowNull(true)
  @Column(DataType.STRING(20))
  phone?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  email?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  website?: string;

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  logo?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  licenseNumber?: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  // Foreign key to the creator
  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdBy!: string;

  // Associations
  @HasMany(() => User, { foreignKey: 'agencyId', as: 'employees' })
  employees!: User[];


  /*
    Sembra che la seguente associazione faccia andare sequelize a modificare la tabella users 
    e prova a modificare di nuovo tutti i campi aggiungendo not null quando in realtà già c'era
    e ottengo l'errore ORA-02261: such unique or primary key already exists in the table
    La soluzione è stata prima disabilitare i vincoli e poi aggiungere la foreign key manualmente
  */

  @BelongsTo(() => User, { foreignKey: 'createdBy', as: 'creator', constraints: false })
  creator?: User;


  static async addCreatorForeignKey(sequelize: Sequelize) {
    try {
      // Get all foreign keys for the 'agencies' table
      const constraints = await sequelize.getQueryInterface().getForeignKeyReferencesForTable('agencies');
      const constraintsArray = Array.isArray(constraints) ? constraints : [];
      const exists = constraintsArray.some(
        (c: any) => c.constraintName === 'agencies_createdBy_fkey'
      );

      if (!exists) {
        await sequelize.getQueryInterface().addConstraint('agencies', {
          fields: ['created_by'],
          type: 'foreign key',
          name: 'agencies_createdBy_fkey',
          references: {
            table: 'users',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        });
        console.log('Foreign key aggiunta con successo.');
      } else {
        console.log('Foreign key già esistente, nessuna azione necessaria.');
      }
    } catch (error) {
      console.error('Errore nell\'aggiungere la foreign key:', error);
    }
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    return values;
  }
}