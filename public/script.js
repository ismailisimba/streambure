const servUrl = window.location.hostname.includes("localhost")?"localhost:8080":"streambure-jzam6yvx3q-ez.a.run.app/";
const sockPrefx = window.location.protocol.includes("https")?"wss":"Ws";
const socket = new WebSocket(sockPrefx+'://'+servUrl);
socket.onmessage = (event) => {
    //console.log("wbEv",event.data)
    const data = JSON.parse(event.data);
    if (data.type === 'downloadProgress') {
        handleDownloadProgress(data.progress, data.speed);
    }
};

async function search() {
    const query = document.getElementById('query').value;
    const response = await fetch('/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });
    const torrents = await response.json();
    torrents.shift()
    displayTorrents(torrents);
    // Handle displaying search results to the user
    // ...
}

async function showDownFiles() {
    const query = document.getElementById('query').value;
    const response = await fetch('/list-files', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const torrents = await response.json();
    displayTorrents(torrents);
    // Handle displaying search results to the user
    // ...
}


function displayTorrents(torrents) {
    const tbody = document.getElementById('torrentBody');
    tbody.querySelectorAll("tr").forEach(tr=>tr.remove());
    torrents.forEach(torrent => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${torrent.name}</td>
            <td>${torrent.seeds || null}</td>
            <td>${torrent.leeches || null}</td>
            <td>${torrent.extra || null}</td>
            <td>${torrent.size || null}</td>
            <td>${torrent.action}</td>
        `;
        tbody.appendChild(row);
    });
}

/*document.getElementById('torrentBody').addEventListener('click', function(event) {
    if (event.target.tagName.toLowerCase() === 'button') {
        const torrentHash = event.target.getAttribute('data-hash');
        const name = event.target.getAttribute('data-name');
        window.location.href = `player.html?hash=${encodeURIComponent(torrentHash)}&name=${encodeURIComponent(name)}`;
    }
});*/

document.getElementById('torrentBody').addEventListener('click', async function(event) {
    if (event.target.tagName.toLowerCase() === 'button'&&event.target.innerText==="Search") {
        const torrentHash = event.target.getAttribute('data-hash');
        const name = event.target.getAttribute('data-name');
        window.location.href = `/video/${encodeURIComponent(await getMagnetLink(torrentHash))}/${encodeURIComponent(name)}`;
    }
});


async function getMagnetLink(url) {
    try {
      // Fetch the HTML from the URL
      const response = await fetch("/get-magnet?url="+url);
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      const text = await response.json()
      //console.log("text",text.magnetLink)
      return text.magnetLink;
    } catch (error) {
      console.error('There has been a problem with your fetch operation:', error);
    }
  }


  function handleDownloadProgress(progress, speed) {
    const canvas = document.getElementById('progress-canvas');
    const ctx = canvas.getContext('2d');

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the progress bar
    ctx.fillStyle = '#76c7c0';
    ctx.fillRect(0, 0, progress * canvas.width, canvas.height);

    // Draw the text
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.fillText(`Downloaded: ${progress * 100}% | Speed: ${speed} kB/s`, 10, 20);
}