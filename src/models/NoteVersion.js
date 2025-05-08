import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class NoteVersion extends Model {
    static associate(models) {
      this.belongsTo(models.Note, { foreignKey: 'noteId' });
      this.belongsTo(models.User, { foreignKey: 'createdBy' });
    }
  }

  NoteVersion.init({
    noteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Notes',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    revertedFrom: {
      type: DataTypes.INTEGER,
      allowNull: true,
      description: 'If this version was created by reverting, stores the version number it was reverted from'
    }
  }, {
    sequelize,
    modelName: 'NoteVersion',
    indexes: [
      // Add indexes for efficient retrieval
      {
        name: 'version_history_by_note',
        fields: ['noteId', 'version']
      }
    ]
  });

  return NoteVersion;
};
