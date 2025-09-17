/*
const menu = document.getElementById('menu');
const viewer = document.getElementById('viewer');

// 메뉴 선택 → 메인 프로세스로 전달
menu.addEventListener('change', () => {
  if (menu.value) {
    window.api.navigate(menu.value);
  }
});

// 메인 프로세스에서 전달받아 iframe 로드
window.api.onNavigate((page) => {
  //viewer.src = page;
});
*/
/*

fetch('menu.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('menu-container').innerHTML = html;



  //

  const select = document.getElementById('menu');

  // 현재 페이지에 맞는 option 선택
  const currentPage = location.pathname.replace(/^.*[\\\/]/, '');
  Array.from(select.options).forEach(option => {
    if(option.value.endsWith(currentPage)) {
      //option.selected = true;
    }
  });
  
  // 선택 시 페이지 이동
  select.addEventListener('change', () => {
    const page = select.value;
    if(page) {
      location.href = page; // 선택한 페이지로 이동
    }
  });




  });



*/
// 메뉴 불러오기

function loadMenu(path) {
  return fetch(path)
    .then(res => {
      if (!res.ok) throw new Error('fetch 실패');
      return res.text();
    })
    .then(html => {
      document.getElementById('menu-container').innerHTML = html;

      const select = document.getElementById('menu');
      const currentPage = location.pathname.split('/').pop();

      Array.from(select.options).forEach(option => {
        if (option.value.endsWith(currentPage)) {
          //option.selected = true;
        }
      });

      select.addEventListener('change', () => {
        if (select.value) location.href = select.value;
      });

      return true; // 성공 시 true 반환
    })
    .catch(err => {
      console.error('메뉴 로드 실패:', path, err);
      return false; // 실패 시 false 반환
    });
}

//loadMenu('../../menu-sub.html');

function selectCurrentPageOption(matchPaths = []) {
  const select = document.getElementById('menu');
  if (!select) return;

  const currentPath = location.pathname; // 전체 경로

  Array.from(select.options).forEach(option => {
    // matchPaths 배열 중 하나라도 currentPath와 option.value 모두 포함하면 선택
    const matched = matchPaths.some(p => currentPath.includes(p) && option.value.includes(p));
    if (matched) {
      option.selected = true;
      return; // 선택 후 루프 계속 돌 필요 없음
    }
  });
}

// 메뉴 로드 후 호출
loadMenu('../../menu-sub.html').then(() => {
  //selectCurrentPageOption(["home", 'band-upload', 'help', 'index.html']);
});