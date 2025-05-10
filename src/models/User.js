import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

export default (sequelize) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Note, { foreignKey: 'userId' });
      this.hasMany(models.NoteVersion, { foreignKey: 'createdBy' });
      
      // Add associations for note sharing as owner
      this.hasMany(models.NoteShare, { 
        foreignKey: 'ownerId',
        as: 'sharedNotes'
      });
      
      // Add associations for note sharing as recipient
      this.hasMany(models.NoteShare, {
        foreignKey: 'sharedWithId',
        as: 'receivedShares'
      });
      
      // Notes shared with this user
      this.belongsToMany(models.Note, {
        through: models.NoteShare,
        foreignKey: 'sharedWithId',
        otherKey: 'noteId',
        as: 'notesSharedWithMe'
      });
    }

    // Method to check if password matches
    async validatePassword(password) {
      return bcrypt.compare(password, this.password);
    }
  }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 100]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      // Hash password before saving
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  return User;
};
