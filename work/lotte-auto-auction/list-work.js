import { sleep, todayStr, captureScrollScreen } from '../../lib/capture-screen-util.js';

export class LotteAutoAuctionWork {
  constructor({ url, loginInfo, waitSeconds = 1.5 }) {
    this.url = url;
    this.loginInfo = loginInfo; // { id, password, enable }
    this.waitSeconds = waitSeconds;
    this.running = false;
  }

  addLog(message) {
    console.log(message);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async login(tab) {
    if (!this.loginInfo.enable) return true;

    const [{ result: loginSuccess }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [this.loginInfo],
      function: (loginInfo) => {
        const idInput = document.querySelector('input#membId');
        const pwInput = document.querySelector('input#membPwd');
        const loginBtn = document.querySelector('button.btn-login');
        if (idInput && pwInput && loginBtn) {
          idInput.value = loginInfo.id;
          pwInput.value = loginInfo.password;
          loginBtn.click();
          return true;
        }
        return false;
      }
    });

    return loginSuccess;
  }

  async getManufacturers(tab, foreign = false) {
    const selector = foreign ? '#cont_foreign' : '#cont_ko';
    const [{ result: manufacturers }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [selector],
      function: (selector) => {
        const container = document.querySelector(selector);
        const boxes = container.querySelectorAll('div.model-box');
        const result = [];
        for (const box of boxes) {
          if (box.style.display !== 'none') {
            const span = box.querySelector('div > label > span');
            if (span) result.push({ manufacturerName: span.textContent, manufacturerCss: `#${span.id}` });
          }
        }
        return result;
      }
    });
    return manufacturers;
  }

  async selectOption(tab, selectCss, optionText) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [selectCss, optionText],
      function: (selectCss, optionText) => {
        const select = document.querySelector(selectCss);
        if (select) {
          Array.from(select.options).forEach((opt, idx) => {
            if (opt.text === optionText) {
              select.selectedIndex = idx;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }
      }
    });
  }

  async selectCheckbox(tab, checkboxName, value) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [checkboxName, value],
      function: (checkboxName, value) {
        const input = document.querySelector(`input[name="${checkboxName}"][value="${value}"]`);
        if (input) input.click();
      }
    });
  }

  async clickElement(tab, css) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [css],
      function: (css) {
        const el = document.querySelector(css);
        if (el) el.click();
      }
    });
  }

  async start() {
    this.running = true;
    this.addLog('작업을 시작합니다.');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    await chrome.tabs.update(tab.id, { url: this.url });
    await this.wait(2000);

    const loginSuccess = await this.login(tab);
    if (!loginSuccess) {
      this.addLog('로그인 실패');
      this.running = false;
      return;
    }

    const manufacturers = await this.getManufacturers(tab, false);
    const foreignManufacturers = await this.getManufacturers(tab, true);

    for (const manufacturer of [...manufacturers, ...foreignManufacturers]) {
      if (!this.running) break;

      await chrome.tabs.update(tab.id, { url: this.url });
      await this.wait(2000);

      // 날짜 선택
      await this.selectOption(tab, 'select#searchAuctno', '2025-09-01');

      await this.wait(2000);

      // 거점 선택
      await this.selectCheckbox(tab, 'auctroomcd', 'A01');

      await this.wait(2000);

      // 제조사 선택
      await this.clickElement(tab, manufacturer.manufacturerCss);

      await this.wait(3000);

      // 모델 반복
      const [{ result: models }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [],
        function: () => {
          const boxes = document.querySelectorAll('div.model-box.inner-box');
          const result = [];
          for (const box of boxes) {
            if (box.style.display !== 'none') {
              const span = box.querySelector('div > label > span');
              result.push({ modelName: span.textContent, modelCss: `#${span.id}` });
            }
          }
          return result;
        }
      });

      for (const model of models) {
        if (!this.running) break;

        await this.clickElement(tab, model.modelCss);
        await this.wait(2000);

        let page = 1;
        while (true) {
          this.addLog(`${manufacturer.manufacturerName} ${model.modelName} ${page} 페이지 검색`);

          const dataUrl = await captureScrollScreen(tab);
          const filename = `outputs/${todayStr()}/lotte-auto/${manufacturer.manufacturerName}/${model.modelName}-${page}.png`;
          await chrome.downloads.download({ url: dataUrl, filename });

          const [{ result: nextPageExists }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [page],
            function: (page) => {
              const btnNext = document.querySelector('button.paging-next');
              if (btnNext && !btnNext.disabled) {
                btnNext.click();
                return true;
              }
              return false;
            }
          });

          if (!nextPageExists || !this.running) break;
          page++;
          await this.wait(2000);
        }
      }
    }
  }

  stop() {
    this.running = false;
  }
}
