/** @type {import('sequelize-cli').Migration} */
const migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Notes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // Add indexes for improved search performance
    await queryInterface.addIndex('Notes', ['title', 'content'], {
      name: 'note_content_index',
      type: 'FULLTEXT'
    });

    // Add index for quickly finding a user's notes
    await queryInterface.addIndex('Notes', ['userId', 'isDeleted'], {
      name: 'notes_by_user'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Notes', 'note_content_index');
    await queryInterface.removeIndex('Notes', 'notes_by_user');
    await queryInterface.dropTable('Notes');
  }
};

export default migration;

// For CommonJS compatibility (used by sequelize-cli)
if (typeof module !== 'undefined') {
  module.exports = migration;
}