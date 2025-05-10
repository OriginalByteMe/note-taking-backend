import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Note extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId' });
      this.hasMany(models.NoteVersion, { foreignKey: 'noteId' });
      
      // Add associations for note sharing
      this.hasMany(models.NoteShare, { foreignKey: 'noteId' });
      
      // Users who have access to this note through shares
      this.belongsToMany(models.User, { 
        through: models.NoteShare,
        foreignKey: 'noteId',
        otherKey: 'sharedWithId',
        as: 'sharedWith'
      });
    }
  }

  Note.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Note',
    indexes: [
      // Add an index for improved search performance
      {
        name: 'note_content_index',
        type: 'FULLTEXT',
        fields: ['title', 'content']
      },
      // Add index for quickly finding a user's notes
      {
        name: 'notes_by_user',
        fields: ['userId', 'isDeleted']
      }
    ]
  });

  return Note;
};
