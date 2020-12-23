const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const webdav = require('./webdav');
const config = require('./config.json');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listFiles(auth) {
    const drive = google.drive({ version: 'v3', auth });
    try {
        // Find the from folder's id.
        let res = await drive.files.list({
            pageSize: 10,
            q: `mimeType='application/vnd.google-apps.folder' and name='${config.gdrive_from_folder}'`,
            fields: 'nextPageToken, files(id, name)',
            corpora: 'user',
        });

        if (res.data.files.length !== 1) {
            throw new Error("from folder not found");
        }
        let fromFolderId = res.data.files[0].id;

        // Find the file ids in the from old.
        res = await drive.files.list({
            q: `parents in '${fromFolderId}' and trashed=false`,
            fields: 'files(id, name)',
            corpora: 'user',
        });

        if (res.data.files.length === 0) {
            process.exit(0);
        }

        console.log('Found the following files:');
        let pathAndNames = await Promise.all(res.data.files.map(file => {
            console.log(file.name, ':', file.id);
            return downloadFile(drive, file.name, file.id);
        }));

        for (let [id, name, path] of pathAndNames) {
            await webdav.createFile(name, path);

            // Move file to the trash.
            await drive.files.update({ fileId: id, requestBody: { trashed: true } });
        }
    } catch (err) {
        console.log('error when listing files:', err);
    }
}

function downloadFile(drive, name, id) {
    return drive.files.get({
        fileId: id,
        alt: 'media',
    }, {
        responseType: 'stream'
    }).then(res => {
        const filePath = `/tmp/gdrive-to-webdav-${name}`;
        return new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(filePath);
            let progress = 0;
            res.data
                .on('end', () => {
                    console.log('Done downloading file.');
                    resolve([id, name, filePath]);
                })
                .on('error', err => {
                    console.error('Error downloading file.');
                    reject(err);
                })
                .on('data', d => {
                    progress += d.length;
                    if (process.stdout.isTTY) {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        process.stdout.write(`downloaded ${progress} bytes`);
                    }
                })
                .pipe(dest);
        });
    })
}
