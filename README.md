google-drive-to-webdav
===

Performs the following actions:

- Reads files from a google drive source,
- then uploads them to a webdav destination,
- them trashes them in the google drive source (they will be deleted by google
  after 30 days)

requirements
===

- This requires a Google API token (thus a Google account too), that you can
  create by https://developers.google.com/drive/api/v3/quickstart/nodejs and
  following the tutorial on step 1 there.
- This requires a `config.json` file; look at the `config.json.example` file to
  get inspiration.

how to use
===

- install dependencies with: `npm install`
- copy `config.json.example` to `config.json`, and modify it as indicated:
    - `gdrive_from_folder`: from which gdrive folder should we read files?
    - `webdav_url`: base WebDAV URL
    - `webdav_root_path`: WebDAV path where files will be copied
    - `webdav_username` / `webdav_password`: WebDAV user name and password :-)
- run with `node index`
