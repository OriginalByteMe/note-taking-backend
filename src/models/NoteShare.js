import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class NoteShare extends Model {
    static associate(models) {
      this.belongsTo(models.Note, { foreignKey: 'noteId' });
      this.belongsTo(models.User, { as: 'owner', foreignKey: 'ownerId' });
      this.belongsTo(models.User, { as: 'sharedWith', foreignKey: 'sharedWithId' });
    }
  }

  NoteShare.init({
    noteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Notes',
        key: 'id'
      }
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sharedWithId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    permission: {
      type: DataTypes.ENUM('read', 'write'),
      allowNull: false,
      defaultValue: 'read'
    }
  }, {
    sequelize,
    modelName: 'NoteShare',
    indexes: [
      {
        unique: true,
        fields: ['noteId', 'sharedWithId'],
        name: 'unique_note_share'
      }
    ]
  });

  return NoteShare;
};
