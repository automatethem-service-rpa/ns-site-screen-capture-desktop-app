import { sleep, todayStr, capturePartialScreen, captureFullScreen, captureScrollScreen } from '../../lib/capture-screen-util.js';

export class AutobellListWork {
  constructor({ url, auctionDate, auctionRoom }) {
    this.url = url;
    this.auctionDate = auctionDate;
    this.auctionRoom = auctionRoom;
    this.running = false;
  }

  getManufacturerDir(manufacturerName) {
    const outputsDir = `outputs`;
    const date = todayStr();
    const dateDir = `${outputsDir}/${date}`;
    const workDir = `${dateDir}/autobell-list`;
    const manufacturerDir = `${workDir}/${manufacturerName}`;
    return manufacturerDir;
  }
  
  addLog(message) {
    console.log(message);
  }

  async selectModel(tab, modelCss) {
    const [{result: result}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [modelCss],
      function: async (modelCss) => {      
        // 부모 노드 가져오기
        const parentParentParentElement = document.querySelector(modelCss).parentNode.parentNode.parentNode;
        // 부모 노드의 스타일을 계산하여 가져오기
        const computedStyle = window.getComputedStyle(parentParentParentElement);
        // 부모 노드의 display 속성이 none인지 확인하기
        const isHidden = computedStyle.display === 'none';
        console.log(modelCss);
        console.log(computedStyle.display);
        console.log(isHidden);
        if (isHidden) {
            return false;
        }          
          
        //const span2Cnt = document.querySelector('span#model_cnt_96').innerText;
        const span2Cnt = document.querySelector(modelCss.replace('_nm_', '_cnt_')).innerText;
        if (span2Cnt != '0' && span2Cnt != '') {
          //그랜저
          //document.querySelector('span#model_nm_96').click();
          document.querySelector(modelCss).click();
          return true;
        } 
        else {
          return false;
        }
      }
    });
    return result;
  }

  async start() {
    this.running = true;
    this.addLog('작업을 시작합니다.');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    //---------------

    await chrome.tabs.update(tab.id, { url: this.url });

    await sleep(2000);
    
    const [{result: manufacturers}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: () => {
        const modelBoxes = document.querySelectorAll('div#cont_ko > div.model-group > div.model-box');
        const manufacturers = [];
        for (const modelBox of modelBoxes) {
          //console.log(modelBox.style.display);
          if (modelBox.style.display != "none") {
            const span = modelBox.querySelector('div > label > span');
            //console.log(span.id);
            //console.log(span.textContent);
            manufacturers.push({ manufacturerName: span.textContent ,manufacturerCss: `#${span.id}` });
          }
        }
        return manufacturers;
      }
    });
    console.log(manufacturers);

    for (const manufacturer of manufacturers) {
      if (!this.running) {
        break;
      } 

      const manufacturerName = manufacturer.manufacturerName;
      const manufacturerCss = manufacturer.manufacturerCss;
      //console.log(manufacturerName); //현대
      //console.log(manufacturerCss); //span#corp_nm_5

      await chrome.tabs.update(tab.id, { url: this.url });

      await sleep(2000);

      //날짜 선택
      //select 요소의 옵션 중 눈에 보이는 텍스트가 auctionDate와 같은 옵션을 선택합니다.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [this.auctionDate, this.auctionRoom],
        function: async (auctionDate, auctionRoom) => {
          //const select = document.querySelector('select#searchAuctno');
          const select = await waitForElement('select#searchAuctno');    
          if (select) {
            const options = select.options;
            for (var i = 0; i < options.length; i++) {
              //.log(options[i].text);
              //.log(auctionDate);
              if (options[i].text === auctionDate) {
                select.selectedIndex = i;
                // change 이벤트 트리거
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
                break;
              }
            }
          }
        }
      });

      await sleep(2000);

      //거점 선택
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [this.auctionDate, this.auctionRoom],
        function: async (auctionDate, auctionRoom) => {
          const auctionRoomInput = document.querySelector(`input[name="auctroomcd"][value="${auctionRoom}"]`);
          //auctionRoomInput.checked = true;
          //auctionRoomInput.dispatchEvent(new Event('change'););
          auctionRoomInput.click();
        }
      });

      await sleep(2000);

      //제조사 선택
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [manufacturerCss],
        function: async (manufacturerCss) => {
          //현대
          //document.querySelector('span#corp_nm_5').click();
          document.querySelector(manufacturerCss).click();
        }
      });              

      await sleep(3000);

      //모델 리스트 뽑기
      const [{result: models}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [],
        function: () => {
          const modelBoxes = document.querySelectorAll('div.model-box.inner-box');
          const models = [];
          for (const modelBox of modelBoxes) {
            //console.log(modelBox.style.display);
            if (modelBox.style.display != "none") {
              const span = modelBox.querySelector('div > label > span');
              //console.log(span.id);
              //console.log(span.textContent);
              models.push({ modelName: span.textContent ,modelCss: `#${span.id}` });
            }
          }
          return models;
        }
      });
      console.log(models);

      for (const model of models) {
        const modelName = model.modelName;
        const modelCss = model.modelCss;
        //console.log(model); //그랜저
        //console.log(modelCss); //span#model_nm_96

        if (!this.running) {
          break;
        }        
          
        await chrome.tabs.update(tab.id, { url: this.url });

        await sleep(2000);

        //날짜 선택
        //select 요소의 옵션 중 눈에 보이는 텍스트가 auctionDate와 같은 옵션을 선택합니다.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [this.auctionDate, this.auctionRoom],
          function: async (auctionDate, auctionRoom) => {
            //const select = document.querySelector('select#searchAuctno');
            const select = await waitForElement('select#searchAuctno');    
            if (select) {
              const options = select.options;
              for (var i = 0; i < options.length; i++) {
                //.log(options[i].text);
                //.log(auctionDate);
                if (options[i].text === auctionDate) {
                  select.selectedIndex = i;
                  // change 이벤트 트리거
                  const event = new Event('change', { bubbles: true });
                  select.dispatchEvent(event);
                  break;
                }
              }
            }
          }
        });

        await sleep(2000);

        //거점 선택
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [this.auctionDate, this.auctionRoom],
          function: async (auctionDate, auctionRoom) => {
            const auctionRoomInput = document.querySelector(`input[name="auctroomcd"][value="${auctionRoom}"]`);
            //auctionRoomInput.checked = true;
            //auctionRoomInput.dispatchEvent(new Event('change'););
            auctionRoomInput.click();
          }
        });

        await sleep(2000);

        //제조사 선택
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [manufacturerCss],
          function: async (manufacturerCss) => {
            //현대
            //document.querySelector('span#corp_nm_5').click();
            document.querySelector(manufacturerCss).click();
          }
        });              

        await sleep(3000);

        //모델 선택
        const selelctModelSuccess = await this.selectModel(tab, modelCss);
        //console.log(selelctModelSuccess);
        if (!selelctModelSuccess) {
          continue;
        }       

        await sleep(2000);

        var page = 1;
        while (true) {
          this.addLog(`${manufacturerName} ${modelName} ${page} 페이지 검색`);

          // 요소를 제거합니다.
          const selectors = [
            'div.head-cont',
            'div.select-area.large',
            'div.filter-area',
            'div.left-section',
            'button#btn_favo_cond_save',
            'div.quick-section',
            'footer'
          ];
          for (const selector of selectors) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              args: [selector],
              function: (sel) => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(element => {
                    //element.remove();
                    element.style.display = 'none';
                });
              }
            });
          }

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [],
            function: () => {
              const body = document.querySelector('body');
              body.style.overflowX = 'hidden';

              const containerDiv = document.querySelector('div#container');
              containerDiv.style.padding = '0px';

              const listContDiv = document.querySelector('div.list-cont');
              listContDiv.style.marginTop = '0px';
            }
          });
          
          const manufacturerDir = this.getManufacturerDir(manufacturerName);
          const filename = `${manufacturerDir}/${modelName}-${page}.png`;
          const dataUrl = await captureScrollScreen(tab);
          await chrome.downloads.download({ url: dataUrl, filename: filename });
          
          const [{result: foundPage}] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [page],
            function: (page) => {
              const aPages = document.querySelectorAll('div.numbers > button');
              var foundPage = false;
              for (const aPage of aPages) {
                if (parseInt(aPage.innerText) === page + 1) {
                  aPage.click();
                  foundPage = true;
                }
              }
              if (!foundPage) {
                const aNext = document.querySelector('button.paging-next');
                if (aNext && !aNext.disabled) {
                  aNext.click();
                  foundPage = true;
                }
              }
              return foundPage;
            }
          });

          if (!foundPage) {
            break;
          }

          if (!this.running) {
            break;
          }

          await sleep(2000);
          
          page++;                
        }

        if (!this.running) {
          break;
        }

        await sleep(2000);
      }    
    }
    
    //---------------

    await chrome.tabs.update(tab.id, { url: this.url });

    await sleep(2000);
    
    /*
    const [{result: manufacturers}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: () => {
        const modelBoxes = document.querySelectorAll('div#cont_ko > div.model-group > div.model-box');
        const manufacturers = [];
        for (const modelBox of modelBoxes) {
          //console.log(modelBox.style.display);
          if (modelBox.style.display != "none") {
            const span = modelBox.querySelector('div > label > span');
            //console.log(span.id);
            //console.log(span.textContent);
            manufacturers.push({ manufacturerName: span.textContent ,manufacturerCss: `#${span.id}` });
          }
        }
        return manufacturers;
      }
    });
    console.log(manufacturers);
    */
    const [{result: foreignmanufacturers}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const button = document.querySelector('#foreign');
        button.click();

        await sleep(1000);

        const modelBoxes = document.querySelectorAll('div#cont_foreign > div.model-group > div.model-box');
        const foreignmanufacturers = [];
        for (const modelBox of modelBoxes) {
          //console.log(modelBox.style.display);
          if (modelBox.style.display != "none") {
            const span = modelBox.querySelector('div > label > span');
            //console.log(span.id);
            //console.log(span.textContent);
            foreignmanufacturers.push({ manufacturerName: span.textContent ,manufacturerCss: `#{span.id}` });
          }
        }
        return foreignmanufacturers;
      }
    });
    console.log(foreignmanufacturers);

    for (const manufacturer of manufacturers) {
      if (!this.running) {
        break;
      } 

      const manufacturerName = manufacturer.manufacturerName;
      const manufacturerCss = manufacturer.manufacturerCss;
      //console.log(manufacturerName); //현대
      //console.log(manufacturerCss); //span#corp_nm_5

      await chrome.tabs.update(tab.id, { url: this.url });

      await sleep(2000);

      //날짜 선택
      //select 요소의 옵션 중 눈에 보이는 텍스트가 auctionDate와 같은 옵션을 선택합니다.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [this.auctionDate, this.auctionRoom],
        function: async (auctionDate, auctionRoom) => {
          //const select = document.querySelector('select#searchAuctno');
          const select = await waitForElement('select#searchAuctno');    
          if (select) {
            const options = select.options;
            for (var i = 0; i < options.length; i++) {
              //.log(options[i].text);
              //.log(auctionDate);
              if (options[i].text === auctionDate) {
                select.selectedIndex = i;
                // change 이벤트 트리거
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
                break;
              }
            }
          }
        }
      });

      await sleep(2000);

      //거점 선택
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [this.auctionDate, this.auctionRoom],
        function: async (auctionDate, auctionRoom) => {
          const auctionRoomInput = document.querySelector(`input[name="auctroomcd"][value="${auctionRoom}"]`);
          //auctionRoomInput.checked = true;
          //auctionRoomInput.dispatchEvent(new Event('change'););
          auctionRoomInput.click();
        }
      });

      await sleep(2000);

      /*
      //제조사 선택
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [manufacturerCss],
        function: async (manufacturerCss) => {
          //현대
          //document.querySelector('span#corp_nm_5').click();
          document.querySelector(manufacturerCss).click();
        }
      });      
      */        
      //제조사 선택
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [manufacturerCss],
        function: async (manufacturerCss) => {
          const button = document.querySelector('#foreign');
          button.click();
  
          await sleep(1000);
  
          //현대
          //document.querySelector('span#corp_nm_5').click();
          document.querySelector(manufacturerCss).click();
        }
      });   
      
      await sleep(3000);

      //모델 리스트 뽑기
      const [{result: models}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [],
        function: () => {
          const modelBoxes = document.querySelectorAll('div.model-box.inner-box');
          const models = [];
          for (const modelBox of modelBoxes) {
            //console.log(modelBox.style.display);
            if (modelBox.style.display != "none") {
              const span = modelBox.querySelector('div > label > span');
              //console.log(span.id);
              //console.log(span.textContent);
              models.push({ modelName: span.textContent ,modelCss: `#${span.id}` });
            }
          }
          return models;
        }
      });
      console.log(models);

      for (const model of models) {
        const modelName = model.modelName;
        const modelCss = model.modelCss;
        //console.log(model); //그랜저
        //console.log(modelCss); //span#model_nm_96

        if (!this.running) {
          break;
        }        
          
        await chrome.tabs.update(tab.id, { url: this.url });

        await sleep(2000);

        //날짜 선택
        //select 요소의 옵션 중 눈에 보이는 텍스트가 auctionDate와 같은 옵션을 선택합니다.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [this.auctionDate, this.auctionRoom],
          function: async (auctionDate, auctionRoom) => {
            //const select = document.querySelector('select#searchAuctno');
            const select = await waitForElement('select#searchAuctno');    
            if (select) {
              const options = select.options;
              for (var i = 0; i < options.length; i++) {
                //.log(options[i].text);
                //.log(auctionDate);
                if (options[i].text === auctionDate) {
                  select.selectedIndex = i;
                  // change 이벤트 트리거
                  const event = new Event('change', { bubbles: true });
                  select.dispatchEvent(event);
                  break;
                }
              }
            }
          }
        });

        await sleep(2000);

        //거점 선택
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [this.auctionDate, this.auctionRoom],
          function: async (auctionDate, auctionRoom) => {
            const auctionRoomInput = document.querySelector(`input[name="auctroomcd"][value="${auctionRoom}"]`);
            //auctionRoomInput.checked = true;
            //auctionRoomInput.dispatchEvent(new Event('change'););
            auctionRoomInput.click();
          }
        });

        await sleep(2000);

        /*
        //제조사 선택
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [manufacturerCss],
          function: async (manufacturerCss) => {
            //현대
            //document.querySelector('span#corp_nm_5').click();
            document.querySelector(manufacturerCss).click();
          }
        });
        */
        //제조사 선택
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [manufacturerCss],
          function: async (manufacturerCss) => {
            const button = document.querySelector('#foreign');
            button.click();
    
            await sleep(1000);
    
            //현대
            //document.querySelector('span#corp_nm_5').click();
            document.querySelector(manufacturerCss).click();
          }
        });                      

        await sleep(3000);

        //모델 선택
        const selelctModelSuccess = await this.selectModel(tab, modelCss);
        //console.log(selelctModelSuccess);
        if (!selelctModelSuccess) {
          continue;
        }       

        await sleep(2000);

        var page = 1;
        while (true) {
          this.addLog(`${manufacturerName} ${modelName} ${page} 페이지 검색`);

          // 요소를 제거합니다.
          const selectors = [
            'div.head-cont',
            'div.select-area.large',
            'div.filter-area',
            'div.left-section',
            'button#btn_favo_cond_save',
            'div.quick-section',
            'footer'
          ];
          for (const selector of selectors) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              args: [selector],
              function: (sel) => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(element => {
                    //element.remove();
                    element.style.display = 'none';
                });
              }
            });
          }

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [],
            function: () => {
              const body = document.querySelector('body');
              body.style.overflowX = 'hidden';

              const containerDiv = document.querySelector('div#container');
              containerDiv.style.padding = '0px';

              const listContDiv = document.querySelector('div.list-cont');
              listContDiv.style.marginTop = '0px';
            }
          });
          
          const manufacturerDir = this.getManufacturerDir(manufacturerName);
          const filename = `${manufacturerDir}/${modelName}-${page}.png`;
          const dataUrl = await captureScrollScreen(tab);
          await chrome.downloads.download({ url: dataUrl, filename: filename });
          
          const [{result: foundPage}] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [page],
            function: (page) => {
              const aPages = document.querySelectorAll('div.numbers > button');
              var foundPage = false;
              for (const aPage of aPages) {
                if (parseInt(aPage.innerText) === page + 1) {
                  aPage.click();
                  foundPage = true;
                }
              }
              if (!foundPage) {
                const aNext = document.querySelector('button.paging-next');
                if (aNext && !aNext.disabled) {
                  aNext.click();
                  foundPage = true;
                }
              }
              return foundPage;
            }
          });

          if (!foundPage) {
            break;
          }

          if (!this.running) {
            break;
          }

          await sleep(2000);
          
          page++;                
        }

        if (!this.running) {
          break;
        }

        await sleep(2000);
      }    
    }

    //----------------------

    this.addLog('작업을 중지합니다.');
  }

  stop() {
    this.running = false;
    console.log("stop");
  }
}

var autobellListWork = null;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(message);
  //console.log(sender); //{id: 'gcdhhmflajlggbbomekbgplpmfmgpngl', url: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl/popup.html', origin: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl'}
  if (message.action === 'autobellListWork.start') {
    if (autobellListWork == null) {
      (async function() {
        chrome.action.setBadgeText({ text: "활성" });
        chrome.action.setBadgeBackgroundColor({ color: "yellow" });
        autobellListWork = new AutobellListWork({ url: message.url, auctionDate: message.auctionDate, auctionRoom: message.auctionRoom });
        await autobellListWork.start();
        chrome.action.setBadgeText({});
        sendResponse('autobellListWork.start response');
      })();
      return true;
    }
  } 
  else if (message.action === 'autobellListWork.stop') {
    if (autobellListWork != null) {
      autobellListWork.stop();
    }
    autobellListWork = null;
    sendResponse('autobellListWork.stop response');
  }
  else if (message.action === 'autobellListWork.addLog') {
    autobellDetailWork.addLog(message.message);
    sendResponse('autobellDetailWork.addLog response');
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'stop') {
    if (autobellListWork != null) {
      autobellListWork.stop();
    }
    autobellListWork = null;
  }
});
