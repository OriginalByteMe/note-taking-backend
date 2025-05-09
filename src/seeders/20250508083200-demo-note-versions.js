/** @type {import('sequelize-cli').Migration} */
const seed = {
  async up(queryInterface, Sequelize) {
    // Create base timestamp
    const baseTime = new Date();
    
    return queryInterface.bulkInsert('NoteVersions', [
      // Versions for Note 1 (Welcome Note)
      {
        noteId: 1,
        title: 'Welcome Note',
        content: 'Welcome to the note-taking application! This is your first note.',
        version: 1,
        createdBy: 1, // testuser
        revertedFrom: null,
        createdAt: baseTime,
        updatedAt: baseTime
      },
      
      // Versions for Note 2 (Meeting Notes)
      {
        noteId: 2,
        title: 'Meeting Notes',
        content: 'Initial meeting to discuss project scope.',
        version: 1,
        createdBy: 1, // testuser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 1000),
        updatedAt: new Date(baseTime.getTime() + 1000)
      },
      {
        noteId: 2,
        title: 'Meeting Notes',
        content: 'Discussed project timeline and assigned tasks to team members. Follow-up meeting scheduled for next week.',
        version: 2,
        createdBy: 1, // testuser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 2000),
        updatedAt: new Date(baseTime.getTime() + 2000)
      },
      
      // Versions for Note 3 (Shopping List)
      {
        noteId: 3,
        title: 'Shopping List',
        content: '1. Groceries\n2. Household items\n3. Office supplies',
        version: 1,
        createdBy: 2, // demouser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 3000),
        updatedAt: new Date(baseTime.getTime() + 3000)
      },
      
      // Versions for Note 4 (Ideas for Project)
      {
        noteId: 4,
        title: 'Ideas',
        content: 'Initial brainstorming.',
        version: 1,
        createdBy: 2, // demouser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 4000),
        updatedAt: new Date(baseTime.getTime() + 4000)
      },
      {
        noteId: 4,
        title: 'Ideas for Project',
        content: 'Brainstorming ideas:\n- Feature 1\n- Feature 2',
        version: 2,
        createdBy: 2, // demouser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 5000),
        updatedAt: new Date(baseTime.getTime() + 5000)
      },
      {
        noteId: 4,
        title: 'Ideas for Project',
        content: 'Brainstorming ideas for the new project:\n- Feature 1\n- Feature 2\n- Improvements to existing system',
        version: 3,
        createdBy: 2, // demouser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 6000),
        updatedAt: new Date(baseTime.getTime() + 6000)
      },
      
      // Versions for Note 5 (Deleted Note Example)
      {
        noteId: 5,
        title: 'Deleted Note Example',
        content: 'This note has been soft deleted.',
        version: 1,
        createdBy: 1, // testuser
        revertedFrom: null,
        createdAt: new Date(baseTime.getTime() + 7000),
        updatedAt: new Date(baseTime.getTime() + 7000)
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('NoteVersions', null, {});
  }
};

export default seed;

// For CommonJS compatibility (used by sequelize-cli)
if (typeof module !== 'undefined') {
  module.exports = seed;
}
