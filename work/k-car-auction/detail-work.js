// content.js (크롬 확장 content script)
class KCarAuction {
    constructor(config, work, inputsDirectory, outputsDirectory, date, time, entryNumber) {
        this.config = config;
        this.work = work;
        this.inputsDirectory = inputsDirectory;
        this.outputsDirectory = outputsDirectory;
        this.date = date;
        this.time = time;
        this.entryNumber = entryNumber;

        this.makerName = null;
        this.carName = null;
        this.vehicleIdentificationNumber = null;
        this.carYear = null;
        this.carDistance = null;
        this.carGrade = null;
    }

    async start() {
        if (!this.work.entryNumbers || this.work.entryNumbers.length === 0) {
            console.log("출품 번호를 입력하세요.");
            return;
        }

        if (this.work.login?.enable) {
            if (!(await this.isLoginned())) {
                const loginSuccess = await this.login();
                if (!loginSuccess) {
                    console.log("로그인 실패");
                    return;
                }
            }
        }

        for (let entryNumber of this.work.entryNumbers) {
            entryNumber = this.reviseEntryNumber(entryNumber);
            const exist = await this.search(entryNumber);
            if (exist) {
                await this.extractData();
                await this.capture(entryNumber);
                await this.accidentHistory();
                console.log({
                    makerName: this.makerName,
                    carName: this.carName,
                    vehicleIdentificationNumber: this.vehicleIdentificationNumber,
                    carYear: this.carYear,
                    carDistance: this.carDistance,
                    carGrade: this.carGrade
                });
            } else {
                console.log(`출품번호 ${entryNumber} 가 존재하지 않습니다.`);
            }
        }
    }

    reviseEntryNumber(entryNumber) {
        return entryNumber.padStart(4, '0');
    }

    async isLoginned() {
        return !!document.querySelector("a[href='/kcar/user/logout.do']");
    }

    async login() {
        const { id, password } = this.work.login;
        document.querySelector("input#input_id").value = id;
        document.querySelector("input#input_pw").value = password;
        document.querySelector("p.login_btn > a").click();
        await new Promise(r => setTimeout(r, 2000)); // 로그인 처리 대기
        return !!document.querySelector("a[href='/kcar/user/logout.do']");
    }

    async search(entryNumber) {
        const url = this.work.url;
        const response = await fetch(url);
        const data = await response.json();
        const car = data.CAR_LIST.find(c => c.EXBIT_SEQ === entryNumber);
        if (car) {
            const detailUrl = `https://www.kcarauction.com/kcar/auction/weekly_detail/auction_detail_view.do?PAGE_TYPE=wRst&CAR_ID=${car.CAR_ID}&AUC_CD=${car.AUC_CD}`;
            window.location.href = detailUrl;
            await new Promise(r => setTimeout(r, 1000));
            return true;
        }
        return false;
    }

    async extractData() {
        const carInfoP = document.querySelectorAll("div.carinfo > div > p");
        carInfoP.forEach(p => {
            if (p.textContent.startsWith("주행거리")) {
                this.carDistance = p.textContent.replace("주행거리 ", "").replace("km", "");
            } else if (p.textContent.startsWith("최초등록일")) {
                this.carYear = p.textContent.replace("최초등록일 ", "").split(".")[0];
            }
        });

        const trElements = document.querySelectorAll("div.contents > table > tbody > tr");
        trElements.forEach(tr => {
            const tds = tr.querySelectorAll("td");
            tds.forEach((td, idx) => {
                if (td.textContent === "차명") this.carName = tds[idx + 1]?.textContent;
                if (td.textContent === "차대번호") this.vehicleIdentificationNumber = tds[idx + 1]?.textContent;
            });
        });
    }

    async capture(entryNumber) {
        const mainDiv = document.querySelector("div.wrap:last-child");
        const canvas = await html2canvas(mainDiv); // html2canvas 사용 필요
        const imgData = canvas.toDataURL("image/png");

        chrome.runtime.sendMessage({ action: "saveImage", filename: `${entryNumber}_main.png`, data: imgData });
    }

    async accidentHistory() {
        const btn = document.querySelector("button.table_ask");
        btn.click();
        await new Promise(r => setTimeout(r, 1000));

        const trElements = document.querySelectorAll("table.report-table > tbody > tr");
        trElements.forEach(tr => {
            const th = tr.querySelector("th");
            if (th?.textContent === "제조사") {
                this.makerName = tr.querySelector("td")?.textContent;
            }
        });
    }
}
