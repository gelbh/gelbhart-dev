/**
 * Sticky Navbar
 * Enable sticky behavior of navigation bar on page scroll
 */

import throttle from "lodash.throttle";

export default (() => {
  let navbar = document.querySelector(".navbar-sticky");

  if (navbar == null) return;

  let navbarClass = navbar.classList,
    navbarH = navbar.offsetHeight,
    scrollOffset = 500;

  const handleScroll = throttle((e) => {
    if (e.currentTarget.pageYOffset > scrollOffset) {
      if (navbarClass.contains("position-absolute")) {
        navbar.classList.add("navbar-stuck");
      } else {
        document.body.style.paddingTop = navbarH + "px";
        navbar.classList.add("navbar-stuck");
      }
    } else {
      if (navbarClass.contains("position-absolute")) {
        navbar.classList.remove("navbar-stuck");
      } else {
        document.body.style.paddingTop = "";
        navbar.classList.remove("navbar-stuck");
      }
    }
  }, 100);

  window.addEventListener("scroll", handleScroll);
})();
