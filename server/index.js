require('dotenv').config();

const path = require('path');
const { main } = require('./src/run');

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

