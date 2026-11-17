'use strict';

// Vercel's Node runtime bundles api/index.js and the files it requires. The handler
// itself is compiled to dist/ by `npm run build`, so export it unchanged.
module.exports = require('../dist/serverless').default;
