/** @type {import('sequelize-cli').Migration} */
const migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('NoteVersions', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      revertedFrom: {
        type: Sequelize.INTEGER,
        allowNull: true,
        description: 'If this version was created by reverting, stores the version number it was reverted from'
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

    // Add index for efficient version history retrieval
    await queryInterface.addIndex('NoteVersions', ['noteId', 'version'], {
      name: 'version_history_by_note'
    });
  },
  
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('NoteVersions', 'version_history_by_note');
    await queryInterface.dropTable('NoteVersions');
  }
};

export default migration;

// For CommonJS compatibility (used by sequelize-cli)
if (typeof module !== 'undefined') {
  module.exports = migration;
}
