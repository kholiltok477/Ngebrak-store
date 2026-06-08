const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'db.sqlite');
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Database deleted successfully');
} else {
  console.log('Database not found');
}
