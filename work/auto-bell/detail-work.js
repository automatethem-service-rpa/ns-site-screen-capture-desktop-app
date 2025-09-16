import { sleep, todayStr, capturePartialScreen, captureFullScreen, captureScrollScreen } from '../../lib/capture-screen-util.js';

export class AutobellDetailWork {
  constructor({ url, auctionDate, entryNumbers, kiaId, kiaPassword, ssangyoungId, ssangyoungPassword }) {
    this.url = url;
    this.auctionDate = auctionDate;
    this.entryNumbers = this.parseEntryNumbers(entryNumbers);
    this.kiaId = kiaId;
    this.kiaPassword = kiaPassword;
    this.ssangyoungId = ssangyoungId;
    this.ssangyoungPassword = ssangyoungPassword;
    this.running = false;
    this.makerName = ''; //제조사
    this.carName = ''; //차이름
    this.vehicleIdentificationNumber = ''; //차대번호
    this.carYear = ''; //연식
    this.carDistance = ''; //주행거리
  }

  parseEntryNumbers(entryNumbers) {
    const entries = [];
    entryNumbers = entryNumbers.trim().replace(/[,\.\s]+/g, ",");
    if (entryNumbers.includes(",")) {
      entryNumbers.split(",").forEach(entryNumber => {
        entries.push(String(parseInt(entryNumber)));
      });
    } 
    else if (entryNumbers.trim() !== "") {
      entries.push(String(parseInt(entryNumbers)));
    }
    return entries;
  }

  reviseEntryNumber(entryNumber) {
    //console.log(entryNumber); //1
    const revisedEntryNumber = entryNumber.padStart(4, '0');
    //console.log(revisedEntryNumber); //1001
    return revisedEntryNumber;
  }

  async detailWindow(newTab, entryNumber) {
    const [entryNumbersDir, entryNumbersDirForInternal] = this.getEntryNumbersDir(entryNumber);
    //console.log(entryNumbersDir); //./outputs/20240808/autobell-detail/1001
    //console.log(entryNumbersDirForInternal); //./outputs/20240808/autobell-detail/1001/내부용

    await this.extractData(newTab);
    
    if (!this.running) {
      return;
    }

    await this.extractAndSavePicture(newTab, entryNumbersDir);

    if (!this.running) {
      return;
    }

    await this.captureScreenshots(newTab, entryNumbersDir, entryNumbersDirForInternal);

    if (!this.running) {
      return;
    }

    await chrome.tabs.reload(newTab.id);
    
    await sleep(2000);

    if (this.makerName === '제네시스' || this.makerName === '현대') {
      await this.captureSpecificationHyundae(newTab, entryNumbersDir);
    } 
    else if (this.makerName === '기아') {
      await this.captureSpecificationKia(newTab, entryNumbersDir);
    } 
    else if (this.makerName === 'KG모빌리티(쌍용)') {
      await this.captureSpecificationSsangyoung(newTab, entryNumbersDir);
    }
  }

  async extractData(tab) {
    const [{result: result}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        //const h2 = document.querySelector('h2.car-name');
        const h2 = await waitForElement('h2.car-name');              
        const s = h2 ? h2.textContent : '';
      
        const makerNames = s.matchAll(/\[(.+?)\]/g);
        const makerNameMatch = makerNames.next();
        const makerName = makerNameMatch.value ? makerNameMatch.value[1] : '';
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: 'Maker Name: ' + makerName});
      
        const carNames = s.matchAll(/\] (.+)/g);
        const carNameMatch = carNames.next();
        const carName = carNameMatch.value ? carNameMatch.value[1] : '';
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: 'Car Name: ' + carName});
      
        const dds = document.querySelectorAll('div.info-box > dl > dd');
        var vehicleIdentificationNumber = '';
        var carYear = '';
        var carDistance = '';
      
        dds.forEach(async function(dd, i) {
          if (i == 10) { //차대번호
            const ddText = dd.querySelector('span').textContent;
            vehicleIdentificationNumber = ddText;
            await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: 'Vehicle Identification Number: ' + vehicleIdentificationNumber});
          } 
          else if (i == 12) { //최초등록일
            const ddText = dd.textContent;
            const carYears = ddText.matchAll(/(\d+)년/g);
            const carYearMatch = carYears.next();
            carYear = carYearMatch.value ? carYearMatch.value[1] : '';
            await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: 'Car Year: ' + carYear});
          } 
          else if (i == 13) { //주행거리
            const ddText = dd.textContent;
            const carDistances = ddText.matchAll(/([\d,]+)km/g);
            const carDistanceMatch = carDistances.next();
            carDistance = carDistanceMatch.value ? carDistanceMatch.value[1] : '';
            await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: 'Car Distance: ' + carDistance});
          }
        });
      
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: '제조사: ' + makerName});
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: '차이름: ' + carName});
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: '차대번호: ' + vehicleIdentificationNumber});
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: '연식: ' + carYear});
        await chrome.runtime.sendMessage({action: 'autobellDetailWork.addLog', message: '주행거리: ' + carDistance});
  
        return {
          makerName: makerName,
          carName: carName,
          vehicleIdentificationNumber: vehicleIdentificationNumber,
          carYear: carYear,
          carDistance: carDistance
        };
      }
    });

    this.makerName = result.makerName;
    this.carName = result.carName;
    this.vehicleIdentificationNumber = result.vehicleIdentificationNumber;
    this.carYear = result.carYear;
    this.carDistance = result.carDistance;
  }

  async extractAndSavePicture(tab, entryNumbersDir) {
    const [{result: imageUrls}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: () => {
        const urls = [];
        const imgs = document.querySelectorAll('div.swiper-slide.swiper-slide-duplicate > button > img');
        imgs.forEach(img => {
          //console.log(img.src); //https://img-auction.autobell.co.kr/OBmZCjL58I?src=https%3A%2F%2Fauction.autobell.co.kr%2FFileUpDown%2F5100%2Fcarimg%2F2406%2FD240602836%2FD240602836_02_33.jpg%3F20240620101504&type=m&w=800&h=500&quality=90&ttype=jpg
          const url = new URL(img.src).searchParams.get('src');
          //console.log(url); //https://auction.autobell.co.kr/FileUpDown/5100/carimg/2406/D240602836/D240602836_02_33.jpg?20240620101504
          if (!urls.includes(url))
            urls.push(url);
        });
        return urls;
      }
    });

    for (const url of imageUrls) {
      const srcParts = url.split('/');
      const fileNameWithTimestamp = srcParts[srcParts.length - 1];
      var fileName = fileNameWithTimestamp.split('?')[0];
      fileName = fileName.replace('.jpg', '.png');
      await chrome.downloads.download({ url: url, filename: `${entryNumbersDir}/${fileName}` });
      this.addLog(`${entryNumbersDir}/${fileName} 에 저장`);
    }
  }

  async captureScreenshots(tab, entryNumbersDir, entryNumbersDirForInternal) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const mainSpectInfo = document.querySelector('div.spec-info');
        const mainNewCarInfo = document.querySelector('div.new-car-info');
        mainSpectInfo?.remove();
        mainNewCarInfo?.remove();
      }
    });

    const mainFilename = `${entryNumbersDir}/1_메인.png`;
    const mainDataUrl = await capturePartialScreen(tab, 'div.content-box');
    await chrome.downloads.download({ url: mainDataUrl, filename: mainFilename });
    this.addLog(`${mainFilename} 에 저장`);

    const mainInternalFilename = `${entryNumbersDirForInternal}/1_메인.png`;
    await chrome.downloads.download({ url: mainDataUrl, filename: mainInternalFilename });
    this.addLog(`${mainInternalFilename} 에 저장`);

    await chrome.tabs.reload(tab.id);
    
    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const div = await waitForElement('div.spec-box.spec01');    
          
        const specBoxSpec02 = document.querySelector('div.spec-box.spec02');
        const specBoxSpec03 = document.querySelector('div.spec-box.spec03');
        const specBoxSpec04 = document.querySelector('div.spec-box.spec04');
        specBoxSpec02?.remove();
        specBoxSpec03?.remove();
        specBoxSpec04?.remove();
      }
    });

    const detailInfoFilename = `${entryNumbersDir}/2_상세정보.png`;
    const detailInfoDataUrl = await capturePartialScreen(tab, 'div.spec-box.spec01');
    await chrome.downloads.download({ url: detailInfoDataUrl, filename: detailInfoFilename });
    this.addLog(`${detailInfoFilename} 에 저장`);

    const detailInfoInternalFilename = `${entryNumbersDirForInternal}/2_상세정보.png`;
    await chrome.downloads.download({ url: detailInfoDataUrl, filename: detailInfoInternalFilename });
    this.addLog(`${detailInfoInternalFilename} 에 저장`);

    await chrome.tabs.reload(tab.id);
    
    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const div = await waitForElement('div.status-box');    
      }
    });
      
    const checkStatusFilename = `${entryNumbersDir}/3_상태점검표.png`;
    const checkStatusDataUrl = await capturePartialScreen(tab, 'div.status-box');
    await chrome.downloads.download({ url: checkStatusDataUrl, filename: checkStatusFilename });
    this.addLog(`${checkStatusFilename} 에 저장`);

    await chrome.tabs.reload(tab.id);
    
    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const div = await waitForElement('div.head-box');
          
        const selectors = [
          'div.head-box',
          'div.view-wrap',
          'div.spec-desc',
          'div.new-car-info',
          'div.spec-box.spec01',
          'ul.spec-list',
          'div.spec-box.spec03',
          'div.spec-box.spec04',
          'footer',
          'div.bid-detail'
        ];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => element.remove());
        });
      }
    });

    const checkStatusInternalFilename = `${entryNumbersDirForInternal}/3_상태점검표_내부용.png`;
    const checkStatusInternalDataUrl = await capturePartialScreen(tab, 'div.status-box');
    await chrome.downloads.download({ url: checkStatusInternalDataUrl, filename: checkStatusInternalFilename });
    this.addLog(`${checkStatusInternalFilename} 에 저장`);

    await chrome.tabs.reload(tab.id);
    
    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        //const button = document.querySelector('button#btn_acc_check');
        const button = await waitForElement('button#btn_acc_check');
        button.click();
  
        const wrap = document.querySelector('div#wrap');
        wrap.remove();
  
        const accCheckPop = document.querySelector('div#acc_check_pop');
        accCheckPop.style.position = 'static';
        accCheckPop.style.background = 'white';
        accCheckPop.style.display = 'block';
  
        const popupContainer = document.querySelector('div#acc_check_pop > div.popup-container.ui-draggable.ui-draggable-handle');
        popupContainer.className = '';
  
        const popupScroll = document.querySelector('div.popup-scroll');
        popupScroll.className = '';
  
        const popupClose = document.querySelector('button.popup-close');
        popupClose.remove();
      }
    });

    const accidentHistoryFilename = `${entryNumbersDir}/5_사고이력조회.png`;
    const accidentHistoryDataUrl = await captureScrollScreen(tab);
    await chrome.downloads.download({ url: accidentHistoryDataUrl, filename: accidentHistoryFilename });
    this.addLog(`${accidentHistoryFilename} 에 저장`);
  }

  async captureSpecificationHyundae__(tab, entryNumbersDir) {
    const url = "https://www.genesis.com/kr/ko/shopping/genesis-car-specifications-check.html";
    await chrome.tabs.update(tab.id, { url });

    await sleep(3000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.vehicleIdentificationNumber],
      function: async (vin) => {
        const input = await waitForElement('input#vin');    
        input.value = vin;

        const buttons = document.querySelectorAll('button.cta-button.type-line');
        buttons[buttons.length - 1].click();
      }
    });

    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const div = await waitForElement('div#jq_srch_view');    
      }
    });      
      
    const filename = `${entryNumbersDir}/4_사양조회.png`;
    const dataUrl = await capturePartialScreen(tab, 'div#jq_srch_view');
    await chrome.downloads.download({ url: dataUrl, filename: filename });
    this.addLog(`${filename} 에 저장`);
  }

  async captureSpecificationHyundae(tab, entryNumbersDir) {
    const url = "https://www.hyundai.com/kr/ko/service-membership/check-specifications";
    await chrome.tabs.update(tab.id, { url });

    await sleep(5000);

    const [{result: buttonExists}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const buttons = document.querySelectorAll('button.alert_confirm_btn');
        if (buttons.length > 0) {
          buttons[buttons.length - 1].click();
        }

        return buttons.length > 0;
      }
    });

    if (buttonExists) {
      await sleep(8000);

      const hyundaeId = "ckdwls7829@naver.com";
      const hyundaePassword = "qkransckd12#";
  
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [hyundaeId, hyundaePassword],
        function: async (hyundaeId, hyundaePassword) => {
          const inputEmail = document.querySelector('input[name="EMAIL"]');
          if (inputEmail) {
            //inputEmail.value = hyundaeId;
            sendKeys(inputEmail, hyundaeId);
  
            const inputPassword = document.querySelector('input[name="PASSWORD"]');
            //inputPassword.value = hyundaePassword;
            sendKeys(inputPassword, hyundaePassword);
  
            await sleep(1000);
  
            //loginButton
            const button = document.querySelector('button[name="loginButton"]');
            button.click();
            await sleep(8000);
          } 
        }
      });
  
      await sleep(2000);
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.vehicleIdentificationNumber],
      function: async (vin) => {
        const carCode = document.querySelector('#carCode');
        if (carCode) {
          carCode.value = vin;
          //loginButton
          const button = document.querySelector('#getSpec');
          button.click();
        } 
      }
    });

    await sleep(2000);
    
    const filename = `${entryNumbersDir}/4_사양조회.png`;
    const dataUrl = await capturePartialScreen(tab, 'div#searchResult');
    await chrome.downloads.download({ url: dataUrl, filename: filename });
    this.addLog(`${filename} 에 저장`);



/*
    await sleep(3000);


    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.vehicleIdentificationNumber],
      function: async (vin) => {
        const buttons = document.querySelectorAll('button.alert_confirm_btn');
        buttons[buttons.length - 1].click();

        await sleep(3000);

        const email = await waitForElement('input[name="EMAIL"]');    
        email.value = vin;

        const password = await waitForElement('input[name="PASSWORD"]');    
        password.value = vin;

        const button = document.querySelector('button[name="loginButton"]');
        button.click();

    });
*/
    /*
    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
        const div = await waitForElement('div#jq_srch_view');    
      }
    });      
      
    const filename = `${entryNumbersDir}/4_사양조회.png`;
    const dataUrl = await capturePartialScreen(tab, 'div#jq_srch_view');
    await chrome.downloads.download({ url: dataUrl, filename: filename });
    this.addLog(`${filename} 에 저장`);
    */
  }





  async captureSpecificationKia(tab, entryNumbersDir) {
    const url = "https://members.kia.com/kr/view/qenj/car_spec/qenj_car_spec_select.do";
    await chrome.tabs.update(tab.id, { url });

    await sleep(3000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.kiaId, this.kiaPassword],
      function: async (kiaId, kiaPassword) => {
        const inputEmail = document.querySelector("input[title='이메일을 입력해주세요']");
        if (inputEmail) {
          //inputEmail.value = kiaId;
          sendKeys(inputEmail, kiaId);

          const inputPassword = document.querySelector("input[title='비밀번호를 입력해주세요']");
          //inputPassword.value = kiaPassword;
          sendKeys(inputPassword, kiaPassword);
        
          await sleep(1000);

          //loginButton
          document.querySelector("button[name='loginButton']").click();
          await sleep(8000);
        } 
      }
    });

    await sleep(3000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.vehicleIdentificationNumber],
      function: async (vin) => {
        //document.querySelector("input#vin").value = vin;
        const inputVin = await waitForElement('input#vin');    
        //inputVin.value = vin;
        sendKeys(inputVin, vin); 
        document.querySelector("button#btnSearch").click();   
      }
    });      
      
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: async () => {
          const select = await waitForElement('tbody#casSpecBody');     
      }
    });      
      
    const filename = `${entryNumbersDir}/4_사양조회.png`;
    const dataUrl = await capturePartialScreen(tab, 'tbody#casSpecBody');
    await chrome.downloads.download({ url: dataUrl, filename: filename });
    this.addLog(`${filename} 에 저장`);
  }

  async captureSpecificationSsangyoungModel(carName) {
    /*
    let select_value;
    switch (this.car_name) {
        case "코란도":
            select_value = "H";
            break;
        case "렉스턴 스포츠/렉스턴 스포츠 칸":
            select_value = "U";
            break;
        // Add more cases as needed
        default:
            select_value = "1";
    }
    */
    //API for car name classification
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer AUTOMATETHEM',
    };
    const jsonData = {
        'inputs': carName,
        'parameters': {}
    };
    const response = await fetch('https://common-fastapi-web-app.onrender.com/api/fastapi/api/model/ns-ssangyoung-car-name-text-classification-transformers-model', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(jsonData),
    });
    const j = await response.json();
    console.log(j);
    //const selectValue = j[0]['label'];
    const selectValue = j[0].label;

    return selectValue;
  }

  async captureSpecificationSsangyoung(tab, entryNumbersDir) {
    //const url = "http://www.smotor.com/kr/cs/car_search/index.html";
    const url = "https://www.kg-mobility.com/sr/update-download/vehicle-info";
    await chrome.tabs.update(tab.id, { url });

    await sleep(3000);

    const valueAttribute = await this.captureSpecificationSsangyoungModel(this.carName);
    console.log(valueAttribute);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [valueAttribute, this.vehicleIdentificationNumber],
      function: async (valueAttribute, vehicleIdentificationNumber) => {
        document.querySelector("div[class='selected-option placeholder']").click();

        await sleep(500);

        const options = document.querySelectorAll("div.options > div.option");
        console.log(options);
        
        for (const option of options) {
            console.log("|"+option.textContent.trim()+"|");
            //if (option.textContent.trim() == "체어맨W") {
            if (option.textContent.trim() == valueAttribute) {
                console.log("click");
                option.click();
                break;
            }
        }
/*
토레스EVX
토레스
코란도
렉스턴 스포츠/렉스턴 스포츠 칸
G4렉스턴/올뉴렉스턴
티볼리/티볼리에어	
렉스턴
로디우스/투리스모
액티언
카이런
액티언스포츠/코란도스포츠
코란도C
체어맨W
체어맨H/체어맨				
무쏘/무쏘스포츠
이스타나
*/

        const input = document.querySelector("input[type='tel']");
        input.value = vehicleIdentificationNumber.slice(-6);
        // input 이벤트 트리거
        input.dispatchEvent(new Event('input', { bubbles: true })); 

        await sleep(500);

        document.querySelector("button.selector-class-name").click();
      }
    });

    await sleep(2000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [valueAttribute, this.vehicleIdentificationNumber],
      function: async (valueAttribute, vehicleIdentificationNumber) => {
        const table = await waitForElement('div.default-section > div ');        
      }
    });      
      
    const filename = `${entryNumbersDir}/4_사양조회.png`;
    const dataUrl = await capturePartialScreen(tab, 'div.default-section > div ');
    await chrome.downloads.download({ url: dataUrl, filename: filename });
    this.addLog(`${filename} 에 저장`);
  }

  getEntryNumbersDir(entryNumber) {
    const outputsDir = `outputs`;
    const date = todayStr();
    const dateDir = `${outputsDir}/${date}`;
    const workDir = `${dateDir}/autobell-detail`;
    const entryNumbersDir = `${workDir}/${entryNumber}`;
    const entryNumbersDirForInternal = `${entryNumbersDir}/내부용`;

    return [entryNumbersDir, entryNumbersDirForInternal];
  }

  addLog(message) {
    console.log(message);
  }

  async start() {
    this.running = true;
    this.addLog('작업을 시작합니다.');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    for (var entryNumber of this.entryNumbers) {
      try {
        entryNumber = this.reviseEntryNumber(entryNumber);

        //this.url = 'https://auction.autobell.co.kr/auction/exhibitList.do?acc=20&atn=&flag=Y'; //테스트용
        await chrome.tabs.update(tab.id, { url: this.url });

        await sleep(2000);

        //select 요소의 옵션 중 눈에 보이는 텍스트가 auctionDate와 같은 옵션을 선택합니다.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [this.auctionDate],
          function: (auctionDate) => {
            const select = document.querySelector('select#searchAuctno');
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

        if (!this.running) {
          break;
        }
        
        await sleep(3000);
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [entryNumber],
          function: async (entryNumber) => {
            //document.querySelector('input#searchInput').value = entryNumber;
            const input = await waitForElement('input#searchInput');
            input.value = entryNumber;
            document.querySelector('button#btn_search').click();
          }
        });

        if (!this.running) {
          break;
        }
        
        await sleep(3000);

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [],
          function: async () => {
            //document.querySelector('div.list-section > div.item > a').click();
            const aTag = await waitForElement('div.list-section > div.item > a');    
            aTag.click(); 
          }
        });

        if (!this.running) {
          break;
        }
        
        await sleep(2000);

        const newTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const newTab = newTabs[0];        

        try {
          await this.detailWindow(newTab, entryNumber);
        } 
        catch (error) {
          this.addLog(error.message);
        }

        //await chrome.tabs.remove(newTab.id) 
        //await chrome.tabs.update(tab.id, { active: true });

        if (!this.running) {
          break;
        }
      } 
      catch (error) {
        this.addLog(error.message);
      }
    }

    this.addLog('작업을 중지합니다.');
  }
  
  stop() {
    this.running = false;
  }
}

var autobellDetailWork = null;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(message);
  //console.log(sender); //{id: 'gcdhhmflajlggbbomekbgplpmfmgpngl', url: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl/popup.html', origin: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl'}
  //
  if (message.action === 'autobellDetailWork.start') {
    (async function() {
      if (autobellDetailWork == null) {
        chrome.action.setBadgeText({ text: "활성" });
        chrome.action.setBadgeBackgroundColor({ color: "yellow" });
        
        autobellDetailWork = new AutobellDetailWork({ 
          url: message.url, 
          auctionDate: message.auctionDate, 
          entryNumbers: message.entryNumbers, 
          kiaId: message.kiaId, 
          kiaPassword: message.kiaPassword, 
          ssangyoungId: message.ssangyoungId, 
          ssangyoungPassword: message.ssangyoungPassword 
        });
        await autobellDetailWork.start();
        
        chrome.action.setBadgeText({});
        sendResponse('autobellDetailWork.start response');
      }
    })();
    return true;
  } 
  else if (message.action === 'autobellDetailWork.stop') {
    if (autobellDetailWork != null) {
      autobellDetailWork.stop();
    }
    autobellDetailWork = null;
    sendResponse('autobellDetailWork.stop response');
  }
  else if (message.action === 'autobellDetailWork.addLog') {
    autobellDetailWork.addLog(message.message);
    sendResponse('autobellDetailWork.addLog response');
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'stop') {
    if (autobellDetailWork != null) {
      autobellDetailWork.stop();
    }
    autobellDetailWork = null;
  }
});
