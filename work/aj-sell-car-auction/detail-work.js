// content-script.js

class SellCarAuction {
  constructor({ work, date, time, entryNumbers }) {
    this.work = work;
    this.date = date;
    this.time = time;
    this.entryNumbers = entryNumbers;
    this.running = false;

    this.makerName = null;
    this.carName = null;
    this.vehicleIdentificationNumber = null;
    this.carYear = null;
    this.carDistance = null;
    this.carGrade = null;
  }

  async start() {
    this.running = true;

    if (!this.entryNumbers || this.entryNumbers.length === 0) {
      this.log("출품 번호를 입력하세요.");
      return;
    }

    if (this.work.login?.enable) {
      await this.ensureLoggedIn();
    }

    for (let i = 0; i < this.entryNumbers.length; i++) {
      if (!this.running) break;

      const entryNumber = this.reviseEntryNumber(this.entryNumbers[i]);
      await this.openAuctionPage();
      await this.clickDetailedSearchTab();
      const exists = await this.search(entryNumber);

      if (exists) {
        await this.extractData();
        await this.captureMain();
        await this.captureSpecification();
        this.logCarInfo();
      } else {
        this.log(`출품번호 ${entryNumber} 가 존재하지 않습니다.`);
      }
    }
  }

  log(message) {
    const dt = new Date();
    console.log(`[${dt.toLocaleString()}] ${message}`);
  }

  reviseEntryNumber(entryNumber) {
    return entryNumber.padStart(4, "0");
  }

  async openAuctionPage() {
    window.location.href = this.work.url;
    await this.waitForElement("body");
  }

  async ensureLoggedIn() {
    if (!await this.isLoggedIn()) {
      await this.logoutIfNeeded();
      await this.login();
    } else {
      this.log("로그인 되어 있습니다.");
    }
  }

  async isLoggedIn() {
    return document.querySelector("li.util_m.util_logo > a") !== null;
  }

  async login() {
    document.querySelector("input#i_sUserId").value = this.work.login.id;
    document.querySelector("input#i_sPswd").value = this.work.login.password;
    document.querySelector("a.button.login_full_btn.red.mt_7").click();
    await this.waitForElement("li.util_m.util_logo > a");
    this.log("로그인 성공");
  }

  async logoutIfNeeded() {
    if (await this.isLoggedIn()) {
      document.querySelector("li.util_m.util_logo > a").click();
      await this.waitForElement("li.util_m.util_logi > a");
    }
  }

  async clickDetailedSearchTab() {
    const li = await this.waitForElement("li#tabActive2");
    li.click();
  }

  async search(entryNumber) {
    this.log(`출품번호 ${entryNumber} 를 검색합니다.`);
    document.querySelector("input#i_sEntryNo").value = entryNumber;
    document.querySelector("a.button.btn_small").click();

    await this.waitForElement("div.product-listing > div.row > div.car_one");

    const divs = document.querySelectorAll("div.product-listing > div.row > div.car_one");
    for (const div of divs) {
      const strong = div.querySelector("strong.i_comm_main_txt2");
      if (strong && strong.textContent.trim() === entryNumber) {
        div.querySelector("a").click();
        return true;
      }
    }
    return false;
  }

  async extractData() {
    const liElements = document.querySelectorAll("div.details-block > ul > li");
    liElements.forEach(li => {
      const label = li.querySelector("span")?.textContent.trim();
      const value = li.querySelector("strong")?.textContent.trim();
      if (label === "연식") {
        const match = value.match(/\(최초등록일 : (\d{4})/);
        if (match) this.carYear = match[1];
      } else if (label === "주행거리") {
        const match = value.match(/([\d,]+)Km/);
        if (match) this.carDistance = match[1];
      }
    });

    const trElements = document.querySelectorAll("table.table.tabl_3.text-center.text_middle > tbody > tr");
    trElements.forEach(tr => {
      const tds = tr.querySelectorAll("td");
      if (tds[0]?.textContent.trim() === "차대번호") {
        this.vehicleIdentificationNumber = tds[1]?.textContent.trim();
      }
    });
  }

  async captureMain() {
    // content-script에서 DOM 요소 스크린샷 캡처
    const container = document.querySelector("section.con_top.gray-bg_fin > div.container");
    if (container) {
      chrome.runtime.sendMessage({ action: "captureElement", selector: "section.con_top.gray-bg_fin > div.container" });
    }
  }

  async captureSpecification() {
    if (this.makerName === "현대" || this.makerName === "제네시스") {
      await this.captureSpecificationHyundai();
    } else if (this.makerName === "기아") {
      await this.captureSpecificationKia();
    } else if (this.makerName === "쌍용") {
      await this.captureSpecificationSsangyong();
    }
  }

  async captureSpecificationHyundai() {
    window.open("https://www.genesis.com/kr/ko/shopping/genesis-car-specifications-check.html");
    // VIN 입력 후 조회
  }

  async captureSpecificationKia() {
    window.open("https://members.kia.com/kr/view/qenj/car_spec/qenj_car_spec_select.do");
    // VIN 입력 후 조회
  }

  async captureSpecificationSsangyong() {
    window.open("http://www.smotor.com/kr/cs/car_search/index.html");
    // VIN 입력 후 조회
  }

  logCarInfo() {
    this.log(`제조사: ${this.makerName}`);
    this.log(`차이름: ${this.carName}`);
    this.log(`차대번호: ${this.vehicleIdentificationNumber}`);
    this.log(`연식: ${this.carYear}`);
    this.log(`주행거리: ${this.carDistance}`);
    this.log(`차량등급: ${this.carGrade}`);
  }

  async waitForElement(selector, timeout = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Element ${selector} not found`);
  }
}
