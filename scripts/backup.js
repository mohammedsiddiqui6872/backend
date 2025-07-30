const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function backupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collections = ['menuitems', 'orders', 'users', 'payments'];
    const backupDir = path.join(__dirname, '../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true });

    for (const collection of collections) {
      const Model = mongoose.connection.collection(collection);
      const data = await Model.find({}).toArray();
      
      await fs.writeFile(
        path.join(backupPath, `${collection}.json`),
        JSON.stringify(data, null, 2)
      );
      
      console.log(`Backed up ${data.length} documents from ${collection}`);
    }

    console.log(`Backup completed: ${backupPath}`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Backup error:', error);
    process.exit(1);
  }
}

backupDatabase();
