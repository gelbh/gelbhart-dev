import { Controller } from "@hotwired/stimulus";
import throttle from "lodash.throttle";

// Back to top button that appears when scrolling down
export default class extends Controller {
  static targets = ["button"];

  connect() {
    this.checkScroll();
    this.throttledCheckScroll = throttle(this.checkScroll.bind(this), 100);
    window.addEventListener("scroll", this.throttledCheckScroll);
  }

  disconnect() {
    window.removeEventListener("scroll", this.throttledCheckScroll);
  }

  checkScroll() {
    const button = this.buttonTarget;
    if (window.scrollY > 300) {
      button.classList.add("visible");
    } else {
      button.classList.remove("visible");
    }
  }

  scrollToTop(event) {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}
