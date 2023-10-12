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


function displayTorrents(torrents) {
    const tbody = document.getElementById('torrentBody');
    torrents.forEach(torrent => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${torrent.name}</td>
            <td>${torrent.seeds}</td>
            <td>${torrent.leeches}</td>
            <td>${torrent.extra}</td>
            <td>${torrent.size}</td>
            <td><button data-hash="${torrent.torrentHash}" data-name="${torrent.name}">Play</button></td>
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

document.getElementById('torrentBody').addEventListener('click', function(event) {
    if (event.target.tagName.toLowerCase() === 'button') {
        const torrentHash = event.target.getAttribute('data-hash');
        const name = event.target.getAttribute('data-name');
        window.location.href = `/video/${encodeURIComponent(torrentHash)}/${encodeURIComponent(name)}`;
    }
});
