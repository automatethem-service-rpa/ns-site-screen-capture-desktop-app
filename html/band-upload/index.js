document.querySelector('#startButton').addEventListener("click", async () => {
    const url = "https://www.band.us/band/87167706";
    const imageDir = "inputs/{date}";
    const messageTemplate = document.querySelector('#messageTemplate').value;

    const response = await chrome.runtime.sendMessage({
        action: 'bandUploadWork.start',
        url: url,
        imageDir: imageDir,
        messageTemplate: messageTemplate
    });
    console.log(response);

    console.log("startButton");
});