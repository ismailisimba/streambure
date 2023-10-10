# Torrent Streamer

A lightweight application to stream torrents directly to a Google Cloud Storage bucket and serve them to clients. Built with Node.js, Express, and WebTorrent.

## Features

- Stream torrents directly to Google Cloud Storage.
- Serve streamed torrents to clients.
- Filter torrents by file type or custom name.
- Handle various file types including `.mkv`.
- Stream files directly from local filesystem to clients.

## Getting Started

Clone the repository and install dependencies using npm.

```bash
git clone <repository-url>
cd <repository-directory>
npm install
```
Start the server using the following command:

```bash
GOOGLE_APPLICATION_CREDENTIALS="***" node server.js
```
Now the server will be running at http://localhost:3000.

Usage
Make a POST request to /stream with a JSON body containing the torrent ID and the file name (optional). The server will start downloading the torrent and stream it to a Google Cloud Storage bucket. The file will then be served to the client.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"torrentId": "<torrent-id>", "fileName": "<file-name>"}' http://localhost:3000/stream
```
Code Snippets
Adding and downloading a torrent by torrent ID:
```javascript
client.add(torrentId, torrent => {
    const file = torrent.files.find(file => file.name.includes(fileName));
    // ...
});
```
Saving the file to Google Cloud Storage and streaming to the client:
```javascript
const file = bucket.file(fileName);
const localFilePath = `./tmp/${fileName}`;
file.createReadStream()
    .pipe(fs.createWriteStream(localFilePath))
    .on('finish', () => {
        const stream = fs.createReadStream(localFilePath);
        stream.pipe(res);
    });
```
Removing special characters and spaces at the end of a string (helper function):
```javascript
function cleanString(str) {
    return str.replace(/[\s\W_]+$/, '');
}
```
Acknowledgements
This project was developed with the assistance of OpenAI's GPT-4 based language model.

Please replace `<repository-url>`, `<repository-directory>`, `<torrent-id>`, and `<file-name>` with your actual repository URL, directory name, torrent ID, and file name respectively.



