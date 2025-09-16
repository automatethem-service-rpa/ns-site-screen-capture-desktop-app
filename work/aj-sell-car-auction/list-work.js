import { sleep, todayStr, captureScrollScreen } from '../../lib/capture-screen-util.js';

export class SellCarAuctionWork {
  constructor({ url, loginInfo, domesticMakerNames, etcMakerNames, saveFileTemplate }) {
    this.url = url;
    this.loginInfo = loginInfo;
    this.domesticMakerNames = domesticMakerNames;
    this.etcMakerNames = etcMakerNames;
    this.saveFileTemplate = saveFileTemplate;
    this.running = false;
  }

  addLog(message) {
    console.log(message);
  }

  async waitForElement(tabId, selector, timeout = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        args: [selector],
        function: (sel) => document.querySelector(sel) || null
      });
      if (result) return result;
      await sleep(100);
    }
    throw new Error(`Element not found: ${selector}`);
  }

  async start() {
    this.running = true;
    this.addLog('작업 시작');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    await chrome.tabs.update(tab.id, { url: this.url });
    await sleep(2000);

    // 로그인 처리
    if (this.loginInfo?.enable) {
      await this.login(tab);
    }

    // 제조사 리스트 가져오기
    const [{ result: manufacturers }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const options = document.querySelectorAll('select#i_sMakerCode > option');
        const list = [];
        options.forEach((opt, idx) => {
          if (idx === 0) return;
          list.push({ name: opt.textContent || opt.innerText, value: opt.value });
        });
        return list;
      }
    });

    for (const maker of manufacturers) {
      if (!this.running) break;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [maker.value],
        function: (val) => {
          const select = document.querySelector('select#i_sMakerCode');
          select.value = val;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      await sleep(1000);

      if (!this.domesticMakerNames.includes(maker.name)) {
        await this.searchAndCapture(tab, maker.name, null);
      } else {
        // 차종 리스트 가져오기
        const [{ result: cars }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const options = document.querySelectorAll('select#i_sCarName1Code > option');
            const list = [];
            options.forEach((opt, idx) => {
              if (idx === 0) return;
              const code = opt.value;
              const name = opt.textContent || opt.innerText;
              if (!['HD45','RS05','HD47','KG49'].includes(code)) {
                list.push({ name, value: code });
              }
            });
            return list;
          }
        });

        for (const car of cars) {
          if (!this.running) break;

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [car.value],
            function: (val) => {
              const select = document.querySelector('select#i_sCarName1Code');
              select.value = val;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          await sleep(500);
          await this.searchAndCapture(tab, maker.name, car.name);
        }
      }
    }

    this.addLog('작업 종료');
  }

  async login(tab) {
    const { id, password } = this.loginInfo;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [id, password],
      function: (uid, pwd) => {
        document.querySelector('#i_sUserId').value = uid;
        document.querySelector('#i_sPswd').value = pwd;
        document.querySelector('a.button.login_full_btn.red.mt_7').click();
      }
    });
    await sleep(2000);
    this.addLog('로그인 완료');
  }

  async searchAndCapture(tab, makerName, carName) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        document.querySelector('a.button.btn_small').click();
      }
    });

    await sleep(1000);

    let page = 1;
    while (true) {
      if (!this.running) break;

      // 스크린 캡처
      const dir = `outputs/${todayStr()}/${makerName}`;
      const filename = carName ? `${dir}/${carName}-${page}.png` : `${dir}/page-${page}.png`;
      const dataUrl = await captureScrollScreen(tab);
      await chrome.downloads.download({ url: dataUrl, filename });

      const [{ result: hasNext }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [page],
        function: (pageNum) => {
          const aPages = document.querySelectorAll('ul.pagination > li > a');
          let found = false;
          aPages.forEach(a => {
            if (parseInt(a.innerText) === pageNum + 1) {
              a.click();
              found = true;
            }
          });
          return found;
        }
      });

      if (!hasNext) break;
      page++;
      await sleep(1000);
    }
  }

  stop() {
    this.running = false;
  }
}
