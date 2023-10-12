const express = require('express');
const axios = require('axios');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const cheerio = require('cheerio')
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const { Storage } = require('@google-cloud/storage');
const { Readable } = require('stream');
const createDOMPurify = require('dompurify');
const PORT = process.env.PORT || 8080;
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);
const torrentSearch = require('./torrentSearch');
//const WebTorrent = require('webtorrent');
const tS = new torrentSearch();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
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

async function fileExistsInBucket_f(fileName) {
    console.log("hereeee?")
    const [exists] = await bucket.file(fileName).exists();
    return exists;
  }
  
  /*app.get('/stream/:infoHash/:fileName', (req, res) => {
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
  });*/

  /*app.get('/stream/:infoHash/:fileName', async (req, res) => {
      const { infoHash, fileName: rawFileName } = req.params;
      const fileName = cleanString(rawFileName) + '.mkv';
      const localFilePath = `./tmp/${fileName}`;
      let fileExistsLocally = fs.existsSync(localFilePath);
      let fileExistsInBucket = !fileExistsLocally ? await fileExistsInBucket_f(fileName) : false;
      let totalChunks = 0;
      let startTime = Date.now();
  
      if (fileExistsLocally || fileExistsInBucket) {
          // If the file exists locally, skip the bucket reading logic
          if (!fileExistsLocally) {
              const file = bucket.file(fileName);
              const writeStream = fs.createWriteStream(localFilePath);
              const readStream = file.createReadStream();
              const [metadata] = await bucket.file(fileName).getMetadata();
              const size = metadata.size;
  
              readStream
                  .on('data', chunk => {
                      totalChunks += chunk.length;
                      const progress = totalChunks / size;
                      const currentTime = Date.now();
                      const elapsedTime = (currentTime - startTime) / 1000;  // Time elapsed in seconds
                      const speed = (totalChunks / elapsedTime) / 1024;
                      wss.clients.forEach(client => {
                          if (client.readyState === WebSocket.OPEN) {
                              client.send(JSON.stringify({ type: 'downloadProgress', progress, speed }));
                          }
                      });
                  })
                  .pipe(writeStream)
                  .on('finish', () => {
                      const stream = fs.createReadStream(localFilePath);
                      stream.pipe(res);
                  });
          } else {
              // If the file exists locally, directly create a read stream and pipe to response
              const stream = fs.createReadStream(localFilePath);
              stream.pipe(res);
          }
      } else {
          // Redirect to download endpoint if file doesn't exist in the bucket
          res.redirect(`/download/${encodeURIComponent(infoHash)}/${encodeURIComponent(rawFileName)}`);
      }
  });*/

  app.get('/stream/:infoHash/:fileName', async (req, res) => {
    const { infoHash, fileName: rawFileName } = req.params;
    const fileName = cleanString(rawFileName) + '.mkv';
    console.log("fileNameissue1",fileName)
    const range = req.headers.range;
    const fileExistsInBucket = await fileExistsInBucket_f(fileName);

    if(fileExistsInBucket){
        const file = bucket.file(fileName);
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
            const chunksize = (end-start)+1;
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mkv',
                'Transfer-Encoding': 'chunked'
            };
            res.writeHead(206, head);
            file.createReadStream({ start, end }).pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mkv',
            };
            res.writeHead(200, head);
            file.createReadStream().pipe(res);
        }
    }else{
        res.redirect(`/download/${encodeURIComponent(infoHash)}/${encodeURIComponent(rawFileName)}`);

    }
});

app.get('/downloadfile/:fileName', (req, res) => {
    const { fileName: rawFileName } = req.params;
    const fileName = cleanString(rawFileName) + '.mkv';
    console.log("fileNameissue2",fileName)
    const file = bucket.file(fileName);
    
    res.writeHead(200, {
        'Content-Disposition': `attachment; filename=${fileName}`,
        'Content-Type': 'video/mkv',
    });
    
    file.createReadStream().pipe(res);
});

  

app.get('/download/:infoHash/:fileName', async (req, res) => {
    const { infoHash, fileName: rawFileName } = req.params;
    const client = await import('webtorrent').then(WebTorrent => new WebTorrent.default());
    const torrentId = infoHash;
    let totalChunks = 0;
    let startTime = Date.now();
    client.add(torrentId, torrent => {
        const file = torrent.files.find(file => file.name.includes(cleanString(rawFileName).slice(0, 9)));
        
        if (!file) {
            throw new Error('File not found');
        }

        const torrentFileName = `${cleanString(rawFileName)}.mkv`;
        const chunks = [];
        const stream = file.createReadStream();
        const fileSize = file.length;
        console.log("fileLength", fileSize);
        
        stream.on('data', chunk => {
            chunks.push(chunk);
             totalChunks += chunk.length;
            // Send download progress update to all connected WebSocket clients
            const progress = totalChunks / fileSize;  // Assume totalChunks is known
            //const speed = calculateDownloadSpeed();  // Assume this function exists
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000;  // Time elapsed in seconds
            const speed = (totalChunks / elapsedTime) / 1024; 
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'downloadProgress', progress, speed }));
                }
            });
        });
        
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const gcsFile = bucket.file(torrentFileName);
            gcsFile.save(buffer, err => {
                if (err) throw err;
                res.redirect(`/stream/${encodeURIComponent(infoHash)}/${encodeURIComponent(rawFileName)}`);
            });
        });
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


app.get('/video/:infoHash/:fileName', async (req, res, next) => {
    const { infoHash, fileName: rawFileName } = req.params;
    const fileName = cleanString(rawFileName);  // assuming cleanString is a function to sanitize the fileName
    const fileExists = await fileExistsInBucket(fileName);  // assuming fileExistsInBucket is a function to check if the file exists in the bucket

    if (fileExists) {
        const file = bucket.file(fileName);
        const config = {
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 24  // 24 hours
        };

        file.getSignedUrl(config, (err, url) => {
            if (err) {
                next(err);
                return;
            }

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Video Player</title>
                    <link href="./vjs.zencdn.net_7.8.4_video-js.css" rel="stylesheet" />
                </head>
                <body>
                    <video id="video-element" class="video-js" controls preload="auto" width="640" height="264" data-setup='{}'>
                        <source src="${url}" type="video/mp4">
                        <p class="vjs-no-js">
                            To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5 video
                        </p>
                    </video>
                    <script src="./vjs.zencdn.net_7.8.4_video.js"></script>
                </body>
                </html>
            `;

            res.send(html);
        });
    } else {
        // Redirect to the download endpoint if the file doesn't exist in the bucket
        res.redirect(`/download/${encodeURIComponent(infoHash)}/${encodeURIComponent(rawFileName)}`);
    }
});




/*app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});*/

wss.on('connection', ws => {
    ws.on('message', message => {
        console.log('received: %s', message);
    });

    ws.send(JSON.stringify({"some":"thing"}));
});


server.listen(PORT, () => {
    console.log('Server is running on port '+PORT);
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

