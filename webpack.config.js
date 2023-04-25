"use strict"

const path = require('path');
// const race = process.env.race || '';
// const initial = race ? race.charAt(0).toUpperCase() : '';
// const botName = process.env.botName || ''
// const filename = botName ? `${botName}.js` : `Lucid${initial}JS.js`;

module.exports = {
  target: "node",
  entry: {
    app: ["./index.js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "PepeTrueno.js",
  },
  node: {
    __dirname: false,
  },
};