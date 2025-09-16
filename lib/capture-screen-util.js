export function sleep(ms) {
    return new Promise((resolve) => { 
        setTimeout(function() {
            resolve();
        }, ms);
    });
}

export function todayStr() {
  const today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1;
  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  return yyyy + mm + dd;
}

export async function capturePartialScreen(tab, elementOrSelector) {
  const [{ result: dataUrl }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [elementOrSelector],
    function: async (elementOrSelector) => {
      const element = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
      const dataUrl = await domtoimage.toPng(element, { bgcolor: 'white' });
      return dataUrl;
    }
  });
  return dataUrl;
}

export async function captureFullScreen(tab) {
  try {
    //https://developer.chrome.com/docs/extensions/reference/api/tabs?hl=ko#method-captureVisibleTab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    //const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    return dataUrl;
  } 
  catch (error) {
    console.error(`Error capturing visible tab (ID: ${tab.id}):`, error);
    return null;
  }
}

/*
//captureScrollScreen 함수 사용을 위헤 background.js 에 아래 코드 추가 필요
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "captureVisibleTab") {
      (async function() {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
          //const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
          //const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
          sendResponse(dataUrl);
      })();
      return true;
  }
});
*/
//파이썬 버전: https://github.com/automatethem/selenium-supporter/blob/main/selenium_supporter/utils.py#L120
export async function captureScrollScreen(tab) {
  const [{ result: finalDataUrl }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [tab],
    function: async (tab) => {
      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      const body = document.querySelector('body');
      const originalBodyStyleOverflow = body.style.overflow;
      body.style.overflow = 'hidden';

      let imgList = []; // 이미지를 저장할 리스트
      let offset = 0; // 시작 지점

      // 화면 높이를 얻기 위한 값
      const height = Math.max(document.documentElement.clientHeight, window.innerHeight);
    
      // 최대 스크롤 높이를 얻기 위한 값 
      await sleep(1000); //1초후 동적 콘텐츠가 로드된 후에 높이를 측정
      const maxWindowHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
        
      // 화면을 위에서 아래로 스크롤하며 이미지를 리스트에 저장
      while (offset < maxWindowHeight) {
        // 스크롤 이동
        window.scrollTo(0, offset);

        // 스크롤 후 대기
        await sleep(1000);

        const dataUrl = await chrome.runtime.sendMessage({ action: "captureVisibleTab" });

        // 이미지 로드 및 저장
        const img = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });

        imgList.push(img);

        offset += height;
      }

      body.style.overflow = originalBodyStyleOverflow;

      // 마지막 이미지에서 필요 없는 상단 부분을 잘라냅니다.
      const extraHeight = offset - maxWindowHeight;
      if (extraHeight > 0 && imgList.length > 1) {
        const pixelRatio = window.devicePixelRatio; // 현재 장치의 픽셀 비율을 가져옵니다.
        const lastImage = imgList[imgList.length - 1]; // 리스트에서 마지막 이미지를 가져옵니다.
        const canvas = document.createElement('canvas'); // 새로운 캔버스를 생성합니다.
        const ctx = canvas.getContext('2d'); // 캔버스의 2D 컨텍스트를 가져옵니다.
        canvas.width = lastImage.width; // 캔버스의 너비를 마지막 이미지의 너비로 설정합니다.
        canvas.height = lastImage.height - extraHeight * pixelRatio; // 캔버스의 높이를 조정하여 필요 없는 상단 부분을 잘라냅니다.

        // 잘라낸 이미지를 캔버스에 다시 그립니다.
        ctx.drawImage(lastImage, 0, extraHeight * pixelRatio, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        imgList[imgList.length - 1] = canvas; // 잘라낸 이미지를 다시 리스트에 저장합니다.
      }

      // 캡처된 모든 이미지를 하나의 이미지로 결합하는 작업입니다.
      const totalHeight = imgList.reduce((sum, img) => sum + img.height, 0); // 모든 이미지의 높이를 합하여 최종 이미지의 총 높이를 계산합니다.
      const finalCanvas = document.createElement('canvas'); // 최종 이미지를 그릴 새로운 캔버스를 생성합니다.
      finalCanvas.width = imgList[0].width; // 최종 이미지의 너비를 첫 번째 이미지의 너비로 설정합니다.
      finalCanvas.height = totalHeight; // 최종 이미지의 높이를 계산된 총 높이로 설정합니다.
      const finalCtx = finalCanvas.getContext('2d'); // 캔버스의 2D 컨텍스트를 가져옵니다.
      let yOffset = 0; // 각 이미지를 그릴 때 사용할 y축의 오프셋을 초기화합니다.
      imgList.forEach(img => {
        finalCtx.drawImage(img, 0, yOffset); // 각 이미지를 캔버스에 순서대로 그립니다.
        yOffset += img.height; // 다음 이미지를 그릴 위치를 위해 y축 오프셋을 증가시킵니다.
      });
      
      const finalDataUrl = finalCanvas.toDataURL('image/png');
      return finalDataUrl;
    }
  });

  return finalDataUrl;
}
