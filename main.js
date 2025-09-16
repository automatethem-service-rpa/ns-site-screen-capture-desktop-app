const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const Work = require('./work/kakotalk-send-message/work');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  let work = null; 

  ipcMain.handle('start', async (event, myArg) => {
    if (!work) {
      work = new Work(myArg); 
    }
    const response = await work.start();
    return response;
  })
  
  ipcMain.handle('stop', async (event, text) => {
    if (work) {
      const response = await work.stop();
      work = null;
      return response;
    }
  })

  ipcMain.handle('openExternal', async (event, url) => {
    if (work) {
      shell.openExternal(url); // 외부 링크 열기
      return null;
    }
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
