import bcrypt from 'bcrypt';

/** @type {import('sequelize-cli').Migration} */
const seed = {
  async up(queryInterface, Sequelize) {
    // Pre-hash the passwords for seeding 
    // (normally this would be done by model hooks, but those don't run during seeding)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword1 = await bcrypt.hash('password123', salt);
    const hashedPassword2 = await bcrypt.hash('securepassword', salt);

    // Create timestamp for consistent created/updated values
    const now = new Date();
    
    return queryInterface.bulkInsert('Users', [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword1,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        username: 'demouser',
        email: 'demo@example.com',
        password: hashedPassword2,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Users', null, {});
  }
};

export default seed;

// For CommonJS compatibility (used by sequelize-cli)
if (typeof module !== 'undefined') {
  module.exports = seed;
}
