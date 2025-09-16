import { sleep, todayStr, captureScrollScreen } from '../../lib/capture-screen-util.js';

export class KCarAuctionWork {
  constructor({ url, loginInfo, domesticMakers = [], foreignMakers = [], etcMakers = [] }) {
    this.url = url;
    this.loginInfo = loginInfo;
    this.domesticMakers = domesticMakers;
    this.foreignMakers = foreignMakers;
    this.etcMakers = etcMakers;
    this.running = false;
  }

  addLog(message) {
    console.log(message);
  }

  getSavePath(manufacturerName, carName, page) {
    const date = todayStr();
    const dir = `outputs/${date}/kcar-auction/${manufacturerName}`;
    const filename = `${dir}/${carName}-${page}.png`;
    return filename;
  }

  async login(tab) {
    if (!this.loginInfo?.enable) return true;

    const { id, password } = this.loginInfo;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [id, password],
      function: (id, password) => {
        const idInput = document.querySelector('input#input_id');
        const pwInput = document.querySelector('input#input_pw');
        const loginBtn = document.querySelector('p.login_btn > a');

        if (idInput && pwInput && loginBtn) {
          idInput.value = id;
          pwInput.value = password;
          loginBtn.click();
        }
      }
    });

    await sleep(3000);

    // 로그인 확인
    const [{ result: loggedIn }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: () => !!document.querySelector('a[href="/kcar/user/logout.do"]')
    });

    if (loggedIn) this.addLog("로그인 성공");
    else this.addLog("로그인 실패");

    return loggedIn;
  }

  async selectMaker(tab, makerCss) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [makerCss],
      function: (makerCss) => {
        const el = document.querySelector(makerCss);
        if (el) el.click();
      }
    });
    await sleep(2000);
  }

  async selectCar(tab, carCss) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [carCss],
      function: (carCss) => {
        const el = document.querySelector(carCss);
        if (el) el.click();
      }
    });
    await sleep(2000);
  }

  async search(tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [],
      function: () => {
        const btn = document.querySelector('span.search_btn > button');
        if (btn) btn.click();
      }
    });
    await sleep(2000);
  }

  async capturePage(tab, manufacturerName, carName, page) {
    const filename = this.getSavePath(manufacturerName, carName, page);
    const dataUrl = await captureScrollScreen(tab);
    await chrome.downloads.download({ url: dataUrl, filename });
    this.addLog(`${manufacturerName} ${carName} ${page} 페이지 캡처 완료`);
  }

  async getMakers(tab, selector = "div#manufac_list > div ul > li > a") {
    const [{ result: makers }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [selector],
      function: (selector) => {
        const elements = document.querySelectorAll(selector);
        const list = [];
        elements.forEach(el => {
          const id = el.id;
          const name = el.innerText || el.textContent;
          if (id && name) list.push({ id, name });
        });
        return list;
      }
    });
    return makers;
  }

  async getCars(tab, selector = "div#mCSB_2_container > div.list_box > div > ul#model_ul > li > a") {
    const [{ result: cars }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [selector],
      function: (selector) => {
        const elements = document.querySelectorAll(selector);
        const list = [];
        elements.forEach(el => {
          const id = el.id;
          const name = el.innerText || el.textContent;
          if (id && name) list.push({ id, name });
        });
        return list;
      }
    });
    return cars;
  }

  async start() {
    this.running = true;
    this.addLog("작업 시작");

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    await chrome.tabs.update(tab.id, { url: this.url });
    await sleep(3000);

    if (!(await this.login(tab))) {
      this.running = false;
      return;
    }

    const makers = await this.getMakers(tab);

    for (const maker of makers) {
      if (!this.running) break;

      await this.selectMaker(tab, `#${maker.id}`);

      const cars = await this.getCars(tab);

      for (const car of cars) {
        if (!this.running) break;

        await this.selectCar(tab, `#${car.id}`);
        await this.search(tab);

        let page = 1;
        while (true) {
          if (!this.running) break;
          await this.capturePage(tab, maker.name, car.name, page);

          const [{ result: nextPageExists }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [page],
            function: (page) => {
              const nextBtn = document.querySelector('a#next_page'); // 페이지 구조에 맞게 수정
              if (nextBtn && !nextBtn.disabled) {
                nextBtn.click();
                return true;
              }
              return false;
            }
          });

          if (!nextPageExists) break;
          page++;
          await sleep(2000);
        }
      }
    }

    this.addLog("작업 완료");
    this.running = false;
  }

  stop() {
    this.running = false;
  }
}
