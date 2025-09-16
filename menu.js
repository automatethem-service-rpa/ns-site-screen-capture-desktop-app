document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("content-frame");
  const select = document.getElementById("menu-select");

  select.addEventListener("change", () => {
    if (select.value) {
      frame.src = select.value;
    }
  });
});
