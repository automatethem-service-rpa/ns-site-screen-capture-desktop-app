const { contextBridge, ipcRenderer } = require('electron')

//ipcRenderer를 직접 노출하지 않고 contextBridge를 통해 window.api.ping()으로 감싸서 사용하는 이유는 렌더러 보안 때문입니다. 항상 이렇게 구조를 유지하는 것이 좋습니다.
contextBridge.exposeInMainWorld('api', {
  start: (myArg) => { 
    return ipcRenderer.invoke('start', myArg);
  },

  stop: () => { 
    return ipcRenderer.invoke('stop');
  }
})
