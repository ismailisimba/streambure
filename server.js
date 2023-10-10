const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio')
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const { Storage } = require('@google-cloud/storage');
const { Readable } = require('stream');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);
const torrentSearch = require('./torrentSearch');
//const WebTorrent = require('webtorrent');
const tS = new torrentSearch();
console.log("ts",tS)

const app = express();
const storage = new Storage();
const bucket = storage.bucket('torrentz');

app.use(bodyParser.json());
app.use('/', serveStatic(__dirname + '/public'));

// ... (remaining route handlers will go here)
app.post('/search', async (req, res) => {
    let query = req.body.query;
    console.log("queryh",query)
    query = DOMPurify.sanitize(query);
    //const torrents = await tS(query);
    const torrents =  await tS.search(query, cat="all");
    res.json(torrents);
});

async function fileExistsInBucket(fileName) {
    const [exists] = await bucket.file(fileName).exists();
    return exists;
  }
  
  app.get('/stream/:infoHash/:fileName', (req, res) => {
      const infoHash = req.params.infoHash;
      // Replace this line with your logic to derive a file name from infoHash
      const rawFileName = cleanString(req.params.fileName);
      console.log("RawF",rawFileName)
      const fileName = `${rawFileName}.mkv`;  
  
      fileExistsInBucket(fileName).then(async(exists) => {
          if (exists) {
              // Logic for streaming from Google Bucket to Node.js filesystem and then to client
              const file = bucket.file(fileName);
              const localFilePath = `./tmp/${fileName}`;
              file.createReadStream()
                  .pipe(fs.createWriteStream(localFilePath))
                  .on('finish', () => {
                      // Stream file from local filesystem to client
                      const stream = fs.createReadStream(localFilePath);
                      stream.pipe(res);
                  });
          } else {
              const client = await import('webtorrent').then(WebTorrent => {
                const client = new WebTorrent.default();
                return client;
              });
              
              const torrentId = `${infoHash}`;
              client.add(torrentId, torrent => {
                  const file = torrent.files.find(file => file.name.includes(cleanString(rawFileName).slice(0,9)));

                  if (!file) {
                    throw new Error('File not found');
                }
            
                const chunks = [];
                const stream = file.createReadStream();
            
                stream.on('data', chunk => {
                    chunks.push(chunk);
                });
            
                stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
            
                    // Save buffer to Google Bucket and stream to client
                    const gcsFile = bucket.file(fileName);
                    gcsFile.save(buffer, err => {
                        if (err) throw err;
                        const bufferStream = new Readable();
                        bufferStream.push(buffer);
                        bufferStream.push(null);  // Indicates end of data
                        bufferStream.pipe(res);
                    });
                });


              });
          }
      });
  });

  
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/search.html');
});

app.get('/player', (req, res) => {
    res.sendFile(__dirname + '/public/player.html');
});

app.get('/get-magnet', async (req, res) => {
    const torrentUrl = req.query.url;
    
    if (!torrentUrl) {
        return res.status(400).send('URL is required');
    }

    try {
        const response = await axios.get(torrentUrl);
        const html = response.data;
        const $ = cheerio.load(html);
        const magnetLink = $('a[href^="magnet:?xt="]').attr('href');
        
        if (magnetLink) {
            res.json({ magnetLink });
        } else {
            res.status(404).send('Magnet link not found');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});



app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});


function cleanString(str) {
    // Replace trailing special characters and spaces
    let cleanedStr = str.replace(/[\W_]*$/g, '');

    // If there are spaces or special characters left at the end, call the function recursively
    if (/[\W_]\s*$/.test(cleanedStr) || /\s*[\W_]$/.test(cleanedStr)) {
        cleanedStr = cleanString(cleanedStr);
    }

    return cleanedStr;
}

