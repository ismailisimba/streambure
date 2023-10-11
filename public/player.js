const servUrl = window.location.hostname.includes("localhost")?"localhost:3000":"streambure-jzam6yvx3q-ez.a.run.app/";
const sockPrefx = window.location.href.includes("https")?"wss":"Ws";
const socket = new WebSocket(sockPrefx+'://'+servUrl);
const player = videojs('video-element');

socket.onmessage = (event) => {
    //console.log("wbEv",event.data)
    const data = JSON.parse(event.data);
    if (data.type === 'downloadProgress') {
        handleDownloadProgress(data.progress, data.speed);
    }
};





// Function to get a parameter value by name from the URL
function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getUrlParameter(parameterName) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
  
    if (urlParams.has(parameterName)) {
      const parameterValue = urlParams.get(parameterName);
      const decodedValue = decodeURIComponent(parameterValue);
      return decodedValue;
    }
  
    return null;
  }

// Function to update the video source and start streaming
async function startStreaming() {
    const torrentHash = getParameterByName('hash');
    const torrentName = getUrlParameter("name")
    console.log("name",torrentName);
    const magnet = await getMagnetLink(torrentHash);
    if (magnet) {

        // Build the source URL
        const sourceUrl = "/stream/" + encodeURIComponent(magnet) + "/" + torrentName;
        
        // Update the player's source
        player.src({ src: sourceUrl, type: 'video/mp4' });
        
        // Play the video
        player.play();
    } else {
        console.error('No torrent hash provided in the URL');
    }
}

// Event listener to call startStreaming once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    startStreaming();
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


document.getElementById('rewind').addEventListener('click', () => {
    let newTime = player.currentTime() - 10;
    if(newTime < 0) newTime = 0;
    player.currentTime(newTime);
});

document.getElementById('fast-forward').addEventListener('click', () => {
    let newTime = player.currentTime() + 10;
    if(newTime > player.duration()) newTime = player.duration();
    player.currentTime(newTime);
});

document.getElementById('skip').addEventListener('click', () => {
    player.currentTime(player.currentTime() + 10);
    console.log("hhjii",player.duration())
    console.log("skipped")
});