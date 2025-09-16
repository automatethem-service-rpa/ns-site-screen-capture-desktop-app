// band-post-work.js
import { sleep, todayStr } from '../../lib/capture-screen-util.js';

export class BandUploadWork {
  constructor({ url, imageDir, messageTemplate }) {
    this.url = url;
    this.imageDir = imageDir;
    this.messageTemplate = messageTemplate;
    this.running = false;
  }

  addLog(message) {
    console.log(message);
  }

  async writeText(tab, message) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [message],
      function: (message) => {
        console.log("aaa");
//        message = "test";
//        console.log(message);
        /*
        const editors = document.querySelectorAll("div.contentEditor.cke_editable");
        console.log(editors.length);
        if (editors.length > 0) {
          const editor = editors[editors.length - 1];
          console.log("bbb");
          editor.focus();
          console.log("ccc");
          document.execCommand("insertText", false, message);
          console.log("ddd");
        }
          */
         ///*
        const editors = document.querySelectorAll("div.contentEditor.cke_editable");
        console.log(editors.length);
        
        if (editors.length > 0) {
          const editor = editors[editors.length - 1];
          console.log("bbb");
        
          editor.focus();
          console.log("ccc");
        
          // 새로운 방식: InputEvent 사용
          const selection = window.getSelection();
          //if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(message));
          //} else {
          //  // fallback: 그냥 맨 끝에 붙이기
          //  editor.appendChild(document.createTextNode(message));
          //}
        
          // 에디터에 입력 이벤트 발생시켜서 인식하게 하기
          editor.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
        
          console.log("ddd");
        }
          //*/
      }
    });
  }

  /*
  https://github.com/automatethem-web-selenium-py/band-post-screen-capture-image-rpa-app-reflex/blob/main/app/handler.py
  
        #

        for i, car_name in enumerate(car_name_files):
            if not self.running:
                return
            logging.debug(car_name) #싼타페
            self.write_text(car_name)
            self.wait_for(0.4)
            files = car_name_files[car_name]
            #files = []
            #files.append("D:\크랜베리_제작\작업 봇\output/car_auction_site_screen_capture/20220404\현대\싼타페_현대글로비스오토벨_1.png")
            #files.append("D:\크랜베리_제작\작업 봇\output/car_auction_site_screen_capture/20220404\현대\싼타페_현대글로비스오토벨_2.png")
            self.attach_image(files)
            self.wait_for(0.8)
            self.write_text(Keys.DOWN)
            self.log(f"{maker_name} {car_name} 이미지를 올렸습니다.")
            
        #

        button_element = self.wait_until(expected_conditions.presence_of_element_located((By.CSS_SELECTOR, "button.-confirm")))
        button_elements = self.driver.find_elements(By.CSS_SELECTOR, "button.-confirm")
        self.wait_for(0.5)
        if len(button_elements) > 0:
            selenium_supporter.utils.click_javascript(self.driver, button_elements[-1])

        self.log(f"{maker_name} 글을 올렸습니다.")

    def attach_image(self, files):
        input_element = self.wait_until(expected_conditions.presence_of_element_located((By.CSS_SELECTOR, "li.toolbarListItem input")))
        input_element = self.driver.find_element(By.CSS_SELECTOR, "li.toolbarListItem input")
        #https://sbiografia.tistory.com/12
        #https://hogni.tistory.com/106
        #https://studyforus.com/tipnknowhow/583961
        #files_s = "c:/맥스크루즈_현대글로비스오토벨_1.png"
        #files_s = files_s + "\nc:/베뉴_현대글로비스오토벨_1.png"
        #files_s = files_s + "\nD:/크랜베리_제작/작업 봇/output/car_auction_site_screen_capture/20220404/현대/싼타페_현대글로비스오토벨_1.png"
        files_s = ""
        for i, file in enumerate(files):
            if i == 0:
                files_s = files_s + file
            else:
                files_s = files_s + "\n" + file
        logging.debug(files_s)
        input_element.send_keys(files_s)
        #https://mathiasbynens.be/notes/css-escapes
        button_element = self.wait_until(expected_conditions.presence_of_element_located((By.CSS_SELECTOR, "button._\submitBtn")))
        button_element = self.driver.find_element(By.CSS_SELECTOR, "button._\submitBtn")
        selenium_supporter.utils.click_javascript(self.driver, button_element)

  */

  /**
   * 이미지 업로드 & 글쓰기 완료
   * (⚠️ 크롬 확장에서는 보안상 직접 파일 업로드 불가 → background/native messaging 필요)
   */
  ///*
  async attachImage(tab, files) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [files],
      function: async (files) {
        const fileInput = document.querySelector("li.toolbarListItem input[type=file]");
        if (fileInput) {
          console.log("업로드할 파일:", files);
          // 보안제한 때문에 직접 sendKeys 불가
          // → background script에서 chrome.fileSystem / Native Messaging 사용 필요
        }

        const btns = document.querySelectorAll("button._submitBtn");
        if (btns.length > 0) {
          btns[btns.length - 1].click();
        }
      }
    });
  }
    //*/

  /**
   * 특정 maker의 글쓰기
   */
  async post(tab, makerName, files) {
    this.addLog(`${makerName} 글 업로드 시작`);

    // 글쓰기 버튼 클릭
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const btn = document.querySelector("button.cPostWriteEventWrapper._btnOpenWriteLayer");
  //      if (btn) 
  //        btn.click();
      }
    });

    
    await sleep(2000);

    const now = new Date();
    const weekDays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const message = this.messageTemplate
      .replace("{maker_name}", makerName)
      .replace("{year}", now.getFullYear())
      .replace("{month}", now.getMonth() + 1)
      .replace("{day}", now.getDate())
      .replace("{week_day}", weekDays[now.getDay()]);

    await this.writeText(tab, message);
    await this.attachImage(tab, files);

//    this.addLog(`${makerName} 이미지 ${files.length}개 업로드 요청됨`);
    
  }

  /**
   * 작업 시작
   */
  async start() {
    this.running = true;
//    this.addLog("작업 시작");

    // 활성 탭 가져오기
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 대상 URL 열기
//    await chrome.tabs.update(tab.id, { url: this.url });
//    await sleep(3000);


//    if (true)
//      return;
    
    // 오늘 날짜 기준 경로 만들기
    const date = todayStr().replace(/\//g, '-');
    const imageDir = this.imageDir.replace("{date}", date);

    //const makerDirs = ["현대", "기아", "제네시스"]; // 실제 구현: background에서 받아오기
    const makerDirs = ["현대"]; // 실제 구현: background에서 받아오기
    for (const maker of makerDirs) {
      if (!this.running) 
        break;

      // Node.js에서는 fs.readdirSync(makerPath).map(...)
      const files = [
        `${imageDir}/${maker}/img1.png`,
        `${imageDir}/${maker}/img2.png`
      ];

      if (files.length > 0) {
        await this.post(tab, maker, files);
        //await sleep(5000);
      }
    }
  }

  /**
   * 작업 중단
   */
  async stop() {
    this.running = false;
    this.addLog("작업 중단");
  }
}

var bandUploadWork = null;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(message);
  //console.log(sender); //{id: 'gcdhhmflajlggbbomekbgplpmfmgpngl', url: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl/popup.html', origin: 'chrome-extension://gcdhhmflajlggbbomekbgplpmfmgpngl'}
  if (message.action === 'bandUploadWork.start') {
    if (bandUploadWork == null) {
      (async function() {
        chrome.action.setBadgeText({ text: "활성" });
        chrome.action.setBadgeBackgroundColor({ color: "yellow" });
        bandUploadWork = new BandUploadWork({ url: message.url, imageDir: message.imageDir, messageTemplate: message.messageTemplate });
        await bandUploadWork.start();
        chrome.action.setBadgeText({});
        sendResponse('bandUploadWork.start response');
      })();
      return true;
    }
  } 
  else if (message.action === 'bandUploadWork.stop') {
    if (autobellListWork != null) {
      bandUploadWork.stop();
    }
    bandUploadWork = null;
    sendResponse('bandUploadWork.stop response');
  }
  else if (message.action === 'bandUploadWork.addLog') {
    bandUploadWork.addLog(message.message);
    sendResponse('bandUploadWork.addLog response');
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'stop') {
    if (bandUploadWork != null) {
      bandUploadWork.stop();
    }
    bandUploadWork = null;
  }
});