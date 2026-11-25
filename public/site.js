const desktop = document.querySelector(".desktop");
const workspace = desktop.querySelector(".workspace");
const panels = new Map([...workspace.querySelectorAll(".panel")].map(panel => [panel.id, panel]));
const shortcuts = [...document.querySelectorAll(".shortcuts [data-open]")];
const printButton = document.querySelector(".print");
const closeAllButton = document.querySelector("#close-all");
const stack = [];
const desktopLayout = matchMedia("(min-width: 57rem)");

function activate(panel, moveFocus = false) {
  const previousIndex = stack.indexOf(panel);
  if (previousIndex !== -1) stack.splice(previousIndex, 1);
  stack.push(panel);
  updateDesktop();
  if (desktopLayout.matches && panel.style.left) {
    placeWindow(panel, panel.offsetLeft, panel.offsetTop);
  }
  if (moveFocus) panel.focus({ preventScroll: desktopLayout.matches });
}

function updateDesktop() {
  const front = stack.at(-1);
  closeAllButton.hidden = stack.length < 2;
  for (const panel of panels.values()) {
    panel.hidden = !stack.includes(panel);
    panel.classList.toggle("active", panel === front);
    panel.style.zIndex = stack.indexOf(panel) + 1;
  }
  for (const shortcut of shortcuts) {
    if (shortcut.dataset.open === front?.id) shortcut.setAttribute("aria-current", "true");
    else shortcut.removeAttribute("aria-current");
  }
}

function close(panel) {
  const index = stack.indexOf(panel);
  if (index === -1) return;
  stack.splice(index, 1);
  updateDesktop();
  const shortcut = shortcuts.find(link => link.dataset.open === panel.id);
  shortcut.focus({ preventScroll: desktopLayout.matches });
}

function placeWindow(panel, left, top) {
  const maxLeft = Math.max(0, desktop.clientWidth - panel.offsetWidth);
  const maxTop = Math.max(0, desktop.clientHeight - panel.offsetHeight);
  panel.style.left = Math.min(maxLeft, Math.max(0, left)) + "px";
  panel.style.top = Math.min(maxTop, Math.max(0, top)) + "px";
}

function enableDragging(panel) {
  const titlebar = panel.querySelector(".titlebar");
  let drag;

  titlebar.addEventListener("pointerdown", event => {
    if (!desktopLayout.matches || event.button !== 0 || event.target.closest("button")) return;
    drag = {
      pointer: event.pointerId,
      grabX: event.clientX - panel.getBoundingClientRect().left,
      grabY: event.clientY - panel.getBoundingClientRect().top,
    };
    titlebar.setPointerCapture(event.pointerId);
  });

  titlebar.addEventListener("pointermove", event => {
    if (drag?.pointer !== event.pointerId) return;
    const bounds = desktop.getBoundingClientRect();
    placeWindow(panel, event.clientX - bounds.left - drag.grabX, event.clientY - bounds.top - drag.grabY);
  });

  titlebar.addEventListener("lostpointercapture", () => { drag = undefined; });
}

document.documentElement.classList.add("js");
for (const [index, panel] of [...panels.values()].entries()) {
  panel.tabIndex = -1;
  panel.style.setProperty("--offset", index * 14 + "px");
  panel.querySelector("[data-close]").hidden = false;
  panel.addEventListener("pointerdown", () => {
    if (stack.at(-1) !== panel) activate(panel);
  });
  panel.addEventListener("focusin", () => {
    if (stack.at(-1) !== panel) activate(panel);
  });
  enableDragging(panel);
}

document.addEventListener("click", event => {
  const opener = event.target.closest("[data-open]");
  if (opener && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    activate(panels.get(opener.dataset.open), true);
  }
  const closer = event.target.closest("[data-close]");
  if (closer) close(closer.closest(".panel"));
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && stack.length) close(stack.at(-1));
});

window.addEventListener("hashchange", () => {
  const panel = panels.get(location.hash.slice(1));
  if (panel) activate(panel, true);
});

window.addEventListener("resize", () => {
  for (const panel of panels.values()) {
    if (!desktopLayout.matches) {
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
    } else if (!panel.hidden && panel.style.left) {
      placeWindow(panel, panel.offsetLeft, panel.offsetTop);
    }
  }
});

closeAllButton.addEventListener("click", () => {
  if (stack.length < 2) return;
  const lastOpen = stack.at(-1);
  stack.length = 0;
  updateDesktop();
  shortcuts.find(link => link.dataset.open === lastOpen.id).focus();
});

printButton.hidden = false;
printButton.addEventListener("click", () => window.print());
document.querySelector(".hint").hidden = false;
activate(panels.get(location.hash.slice(1)) ?? panels.get("about"));
