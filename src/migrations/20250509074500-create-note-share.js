export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('NoteShares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      noteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Notes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sharedWithId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      permission: {
        type: Sequelize.ENUM('read', 'write'),
        allowNull: false,
        defaultValue: 'read'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add a composite unique constraint to prevent duplicate shares
    await queryInterface.addIndex('NoteShares', ['noteId', 'sharedWithId'], {
      unique: true,
      name: 'unique_note_share'
    });

    // Add an index for quickly finding all shares for a given user
    await queryInterface.addIndex('NoteShares', ['sharedWithId'], {
      name: 'shared_with_user_index'
    });

    // Add an index for quickly finding all shares by an owner
    await queryInterface.addIndex('NoteShares', ['ownerId'], {
      name: 'owner_shares_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('NoteShares');
  }
};
