/** @type {import('sequelize-cli').Migration} */
const seed = {
  async up(queryInterface, Sequelize) {
    // Create timestamp for consistent created/updated values
    const now = new Date();
    
    return queryInterface.bulkInsert('Notes', [
      {
        title: 'Welcome Note',
        content: 'Welcome to the note-taking application! This is your first note.',
        userId: 1, // testuser
        version: 1,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Meeting Notes',
        content: 'Discussed project timeline and assigned tasks to team members. Follow-up meeting scheduled for next week.',
        userId: 1, // testuser
        version: 2,
        isDeleted: false,
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000) // 1 second later
      },
      {
        title: 'Shopping List',
        content: '1. Groceries\n2. Household items\n3. Office supplies',
        userId: 2, // demouser
        version: 1,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ideas for Project',
        content: 'Brainstorming ideas for the new project:\n- Feature 1\n- Feature 2\n- Improvements to existing system',
        userId: 2, // demouser
        version: 3,
        isDeleted: false,
        createdAt: now,
        updatedAt: new Date(now.getTime() + 2000) // 2 seconds later
      },
      {
        title: 'Deleted Note Example',
        content: 'This note has been soft deleted.',
        userId: 1, // testuser
        version: 1,
        isDeleted: true,
        createdAt: now,
        updatedAt: new Date(now.getTime() + 3000) // 3 seconds later
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Notes', null, {});
  }
};

export default seed;

// For CommonJS compatibility (used by sequelize-cli)
if (typeof module !== 'undefined') {
  module.exports = seed;
}
