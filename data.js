const fs = require('fs');

// Read data from file
function readData(filename, callback) {
    const dataModule = require(`./${filename}.js`);
    callback(dataModule);
}

// Write data to file
function writeData(filename, data, callback) {
    const content = `module.exports = ${JSON.stringify(data, null, 2)};`;
    fs.writeFile(`${filename}.js`, content, (err) => {
        if (err) {
            console.error(err);
            callback(err);
        } else {
            callback(null);
        }
    });
}

module.exports = { readData, writeData };
