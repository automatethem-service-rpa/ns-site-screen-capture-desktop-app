(async () => {
/*
    // Load the sidebar menu
    const sidebarResponse = await fetch('menu.html');
    const sidebarHTML = await sidebarResponse.text();
    document.getElementById('sidebar').innerHTML = sidebarHTML;
*/

    //

    await selectAutobellList();

    //

//    await chrome.storage.sync.set({ 'lastPage': 'autobell-list.html' });
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

async function selectAutobellList() {
    // 서버로부터 토큰을 받아와서 입력 필드에 넣어줌
    const token = await fetchToken();
    document.querySelector('#listUrl').value = token;

    // 토큰이 자동으로 입력된 후, 해당 토큰으로 경매 날짜 가져오기
    await fetchAuctionDates(token, '#listAuctionDate');

    document.querySelector('#listUrl').addEventListener('change', async (event) => {
        console.log('aaa');

        const url = event.target.value;
        // 토큰 저장
        await saveToken(url);
        // 새로운 토큰으로 경매 날짜 업데이트
        await fetchAuctionDates(url, '#listAuctionDate');
    });

    const startAutobellListWorkButton = document.querySelector('#startAutobellListWorkButton');
    startAutobellListWorkButton.addEventListener("click", async () => {
        const url = document.querySelector('#listUrl').value;
        const auctionDate = document.querySelector('#listAuctionDate').value;
        const auctionRoom = document.querySelector('#auctionRoom').value;
    
        const response = await chrome.runtime.sendMessage({
            action: 'autobellListWork.start',
            url: url,
            auctionDate: auctionDate,
            auctionRoom: auctionRoom
        });
        console.log(response);
    });
    
    const stopAutobellListWorkButton = document.querySelector('#stopAutobellListWorkButton');
    stopAutobellListWorkButton.addEventListener("click", async () => {
        const response = await chrome.runtime.sendMessage({
            action: 'autobellListWork.stop'
        });
        console.log(response);
    });
};
