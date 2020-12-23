const { createClient } = require('webdav');
const config = require('./config.json');
const fs = require('fs');

let client = createClient(config.webdav_url, {
    username: config.webdav_username,
    password: config.webdav_password,
});

function createFile(filename, fsPath) {
    return new Promise((ok, ugh) => {
        let writeStream = client.createWriteStream(`${config.webdav_root_path}/${filename}`);
        writeStream.on('end', () => {
            console.log('finished writing', filename);
            ok();
        })
            .on('error', err => {
                ugh(err);
            });

        fs.createReadStream(fsPath)
            .pipe(writeStream);
    })
}

module.exports = { createFile };
