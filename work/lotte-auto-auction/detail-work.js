import {
  sleep,
  todayStr,
  capturePartialScreen,
  captureFullScreen,
  captureScrollScreen,
} from '../../lib/capture-screen-util.js';

export class LotteAutoAuction {
  constructor({ url, auctionDate, auctionRoom }) {
    this.url = url;
    this.auctionDate = auctionDate;
    this.auctionRoom = auctionRoom;
    this.running = false;
  }

  /** 제조사별 폴더 경로 */
  getManufacturerDir(manufacturerName) {
    const sanitized = manufacturerName.replace(/\s/g, '_');
    return `./captures/${sanitized}`;
  }

  /** 로그인 처리 */
  async login(driver, credentials) {
    try {
      await driver.get(this.url);
      // 로그인 절차
      await driver.findElement({ id: 'username' }).sendKeys(credentials.id);
      await driver.findElement({ id: 'password' }).sendKeys(credentials.pw);
      await driver.findElement({ id: 'loginBtn' }).click();
      await sleep(2000); // 페이지 로딩 대기
    } catch (err) {
      console.error('로그인 실패:', err);
    }
  }

  /** 로그아웃 처리 */
  async logout(driver) {
    try {
      await driver.findElement({ id: 'logoutBtn' }).click();
      await sleep(1000);
    } catch (err) {
      console.warn('이미 로그아웃 상태거나 로그아웃 버튼 없음');
    }
  }

  /** 차량 데이터 수집 */
  async fetchAuctionData(driver) {
    try {
      const rows = await driver.findElements({ css: '.auction-row' });
      const data = [];
      for (const row of rows) {
        const manufacturer = await row.findElement({ css: '.manufacturer' }).getText();
        const model = await row.findElement({ css: '.model' }).getText();
        const price = await row.findElement({ css: '.price' }).getText();
        data.push({ manufacturer, model, price });
      }
      return data;
    } catch (err) {
      console.error('데이터 수집 실패:', err);
      return [];
    }
  }

  /** 이미지 캡처 - 전체 화면 */
  async captureFull(driver, savePath) {
    await captureFullScreen(driver, savePath);
  }

  /** 이미지 캡처 - 스크롤 화면 */
  async captureScroll(driver, savePath) {
    await captureScrollScreen(driver, savePath);
  }

  /** 이미지 캡처 - 지정 영역 */
  async capturePartial(driver, savePath, elementSelector) {
    const element = await driver.findElement({ css: elementSelector });
    await capturePartialScreen(driver, element, savePath);
  }

  /** 사양 조회 및 Encar 연동 */
  async fetchSpecsAndEncar(driver, auctionData) {
    for (const item of auctionData) {
      try {
        // 예시: 사양 조회
        await driver.get(`https://specs.example.com/${item.model}`);
        const specs = await driver.findElement({ css: '.specs' }).getText();
        item.specs = specs;

        // Encar 연동 예시
        await driver.get(`https://encar.example.com/search?model=${item.model}`);
        const encarInfo = await driver.findElement({ css: '.encar-info' }).getText();
        item.encar = encarInfo;

      } catch (err) {
        console.warn(`사양/Encar 조회 실패: ${item.model}`, err);
      }
    }
    return auctionData;
  }

  /** 메인 실행 */
  async run(driver, credentials) {
    if (this.running) return;
    this.running = true;

    await this.login(driver, credentials);
    const auctionData = await this.fetchAuctionData(driver);

    // 제조사별 폴더에 이미지 캡처
    for (const item of auctionData) {
      const dir = this.getManufacturerDir(item.manufacturer);
      const filename = `${todayStr()}_${item.model}.png`;
      await this.captureFull(driver, `${dir}/${filename}`);
    }

    const enrichedData = await this.fetchSpecsAndEncar(driver, auctionData);
    await this.logout(driver);

    this.running = false;
    return enrichedData;
  }
}
