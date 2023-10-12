const canvas = document.getElementById('progress-canvas');
const canvasW = window.getComputedStyle(document.querySelectorAll("body")[0]).getPropertyValue("width");
canvas.setAttribute("width",canvasW)



socket.onmessage = (event) => {
    //console.log("wbEv",event.data)
    const data = JSON.parse(event.data);
    if (data.type === 'downloadProgress') {
        handleDownloadProgress(data.progress, data.speed);
    }
};












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