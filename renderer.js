document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('textInput')
  const startButton = document.getElementById('startButton')
  const stopButton = document.getElementById('stopButton')
  const result = document.getElementById('result')

  startButton.addEventListener('click', async () => {
    const myArg = input.value
    const myResponse = await window.api.start(myArg)
    result.innerText = myResponse
  });
  
  stopButton.addEventListener('click', async () => {
    const myArg = input.value
    const myResponse = await window.api.stop()
    result.innerText = myResponse
  });
})
