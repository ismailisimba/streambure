

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
        const video = document.querySelectorAll("video")[0]
        const source = document.createElement('source');

        // Assuming a function getVideoUrl exists that returns the video URL from the torrent hash
        source.src = "/stream/"+encodeURIComponent(magnet)+"/"+torrentName; 
        source.type = 'video/mp4';

        video.appendChild(source);
        video.load();
        video.play();
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
