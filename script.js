const fs = require('fs');
const { faker } = require('@faker-js/faker');
const numTransactions = 1000000; // 10 million
// Create a writable stream to write data to a SQL file
const outputStream = fs.createWriteStream('seed_data.sql');
// Generate SQL insert statements and write them to the file
for (let i = 1; i <= numTransactions; i++) {
const transaction = {
TransactionID: i,
UserID: faker.string.uuid(),
Amount: faker.finance.amount(),
Timestamp: faker.date.past().toISOString(),
};
console.log("here")
const insertStatement = `INSERT INTO transactions (TransactionID, UserID,Amount, Timestamp) VALUES (${transaction.TransactionID},'${transaction.UserID}', ${transaction.Amount},'${transaction.Timestamp}');\n`;
outputStream.write(insertStatement);
}
// Close the stream
outputStream.end();
// Handle the 'finish' event to know when the writing is complete
outputStream.on('finish', () => {
console.log('SQL dump generation completed.');
});