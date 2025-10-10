const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
const input = path.join(logsDir, 'exceptions.log');
const output = path.join(logsDir, 'exceptions_clean.log');

if (!fs.existsSync(input)) {
  console.error(`Input log not found: ${input}`);
  process.exit(2);
}

const data = fs.readFileSync(input, 'utf8');
// Remove ANSI escape sequences (color codes etc.)
const stripped = data.replace(/\x1b\[[0-9;]*m/g, '');

fs.writeFileSync(output, stripped, 'utf8');
console.log(`Wrote cleaned log to ${output}`);

