(async () => {
/*
    // Load the sidebar menu
    const sidebarResponse = await fetch('menu.html');
    const sidebarHTML = await sidebarResponse.text();
    document.getElementById('sidebar').innerHTML = sidebarHTML;    
*/
    
    //

    await selectAutobellDetail();

    //

//    await chrome.storage.sync.set({ 'lastPage': 'autobell-detail.html' });
})();

//오토벨

async function fetchToken() {
    try {
        //const response = await fetch('https://ns-web-site-server-app.vercel.app/api/custom/ns/auto-bell-tokens/1');
        const response = await fetch('https://common-api.freeonlineutility.com/api/ns-auto-bell-tokens/1');        
        const data = await response.json();
        return data.token;
    } 
    catch (error) {
        console.error('Error fetching token:', error);
        return '';
    }
}

async function saveToken(token) {
    try {
        //await fetch('https://ns-web-site-server-app.vercel.app/api/custom/ns/auto-bell-tokens/1', {
        await fetch('https://common-api.freeonlineutility.com/api/ns-auto-bell-tokens/1', {            
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token
            })
        });
        console.log('Token saved successfully.');
    } 
    catch (error) {
        console.error('Error saving token:', error);
    }
}

async function fetchAuctionDates(url, selectElementId) {
    try {
        const response = await fetch(url);
        const text = await response.text();

        // DOMParser를 사용하여 HTML 문자열을 DOM으로 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // 경매 날짜가 포함된 select 요소에서 옵션 추출
        const options = doc.querySelectorAll("select#searchAuctno > option");
        const auctionDates = Array.from(options).map(option => option.textContent.trim());

        // 선택 요소에 옵션 추가
        const selectElement = document.querySelector(selectElementId);
        selectElement.innerHTML = auctionDates.map(date => `<option value="${date}">${date}</option>`).join('');

    } 
    catch (error) {
        console.error('Error fetching auction dates:', error);
    }
}

async function saveField(field, value) {
    const storageObject = {};
    storageObject[field] = value;
    await chrome.storage.sync.set(storageObject);
    console.log(`${field} saved successfully.`);
}

async function selectAutobellDetail() {
    // 서버로부터 토큰을 받아와서 입력 필드에 넣어줌
    const token = await fetchToken();
    document.querySelector('#detailUrl').value = token;

    // chrome.storage에서 기존에 저장된 값들을 불러와서 각 필드에 넣어줌
    const storedValues = await chrome.storage.sync.get([
        'entryNumbers', 'kiaId', 'kiaPassword', 'ssangyoungId', 'ssangyoungPassword'
    ]);
    // 스토리지에 값이 없으면 기본값으로 채우기
    const defaultEntryNumbers = '0001';
    const defaultKiaId = 'yarza@nate.com';
    const defaultKiaPassword = 'nsfeel3@';
    const defaultSsangyoungId = 'yarza82';
    const defaultSsangyoungPassword = 'nsfeel3@';
    document.querySelector('#entryNumbers').value = storedValues.entryNumbers || defaultEntryNumbers;
    document.querySelector('#kiaId').value = storedValues.kiaId || defaultKiaId;
    document.querySelector('#kiaPassword').value = storedValues.kiaPassword || defaultKiaPassword;
    document.querySelector('#ssangyoungId').value = storedValues.ssangyoungId || defaultSsangyoungId;
    document.querySelector('#ssangyoungPassword').value = storedValues.ssangyoungPassword || defaultSsangyoungPassword;

    // 토큰이 자동으로 입력된 후, 해당 토큰으로 경매 날짜 가져오기
    await fetchAuctionDates(token, '#detailAuctionDate');

    document.querySelector('#detailUrl').addEventListener('change', async (event) => {
        const url = event.target.value;
        // 토큰 저장
        await saveToken(url);
        // 새로운 토큰으로 경매 날짜 업데이트
        await fetchAuctionDates(url, '#detailAuctionDate');
    });

    // 사용자가 입력할 때 각 필드를 chrome.storage에 저장
    document.querySelector('#entryNumbers').addEventListener('change', async (event) => {
        await saveField('entryNumbers', event.target.value);
    });

    document.querySelector('#kiaId').addEventListener('change', async (event) => {
        await saveField('kiaId', event.target.value);
    });

    document.querySelector('#kiaPassword').addEventListener('change', async (event) => {
        await saveField('kiaPassword', event.target.value);
    });

    document.querySelector('#ssangyoungId').addEventListener('change', async (event) => {
        await saveField('ssangyoungId', event.target.value);
    });

    document.querySelector('#ssangyoungPassword').addEventListener('change', async (event) => {
        await saveField('ssangyoungPassword', event.target.value);
    });

    const startAutobellDetailWorkButton = document.querySelector('#startAutobellDetailWorkButton');
    startAutobellDetailWorkButton.addEventListener("click", async () => {
        const url = document.querySelector('#detailUrl').value;
        const auctionDate = document.querySelector('#detailAuctionDate').value;
        const entryNumbers = document.querySelector('#entryNumbers').value;
        const kiaId = document.querySelector('#kiaId').value;
        const kiaPassword = document.querySelector('#kiaPassword').value;
        const ssangyoungId = document.querySelector('#ssangyoungId').value;
        const ssangyoungPassword = document.querySelector('#ssangyoungPassword').value;

        const response = await chrome.runtime.sendMessage({
            action: 'autobellDetailWork.start',
            url: url,
            auctionDate: auctionDate,
            entryNumbers: entryNumbers,
            kiaId: kiaId,
            kiaPassword: kiaPassword,
            ssangyoungId: ssangyoungId,
            ssangyoungPassword: ssangyoungPassword
        });
        console.log(response);
    });

    const stopAutobellDetailWorkButton = document.querySelector('#stopAutobellDetailWorkButton');
    stopAutobellDetailWorkButton.addEventListener("click", async () => {
        const response = await chrome.runtime.sendMessage({
            action: 'autobellDetailWork.stop'
        });
        console.log(response);
    });
}
