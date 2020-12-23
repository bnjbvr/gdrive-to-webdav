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
