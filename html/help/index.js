
document.addEventListener('DOMContentLoaded', () => {
  // 기존 코드 ...

  // 모든 링크 클릭 시 브라우저로 열기
  document.body.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' && e.target.href.startsWith('http')) {
      e.preventDefault();
      const url = e.target.href;
      window.api.openExternal(url);
    }
  });
});
