const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
//const Work = require('./work/kakotalk-send-message/work');

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
  //win.loadFile('html/help/index.html')
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

  ipcMain.handle('navigate', async (event, url) => {
    win.webContents.send('navigate', url);
  })

  ipcMain.handle('openExternal', async (event, url) => {
    //const url = "https://www.naver.com/";
    await shell.openExternal(url);  // 기본 브라우저에서 열기
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
