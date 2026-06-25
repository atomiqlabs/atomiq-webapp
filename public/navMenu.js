// Menu interactivity for the navbar (MainNavigationView). Plain JS, event-delegated
// on `document`, so it works identically for the React-rendered app and the static
// SEO landing pages. Loaded via <script defer src="/navMenu.js"> in index.html and in
// every generated page. Hooks: [data-nav-toggle], [data-nav-collapse],
// [data-nav-dropdown] + [data-nav-dropdown-toggle]. See MainNavigationView.tsx.
// While the mobile menu is open it also injects a .main-navigation__overlay backdrop
// (the original component rendered it conditionally on isOpen) and removes it on close.
(function () {
  var OVERLAY_CLASS = 'main-navigation__overlay';

  function removeOverlay() {
    var o = document.querySelector('.' + OVERLAY_CLASS);
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }

  function closeAll() {
    document.querySelectorAll('[data-nav-collapse].show, [data-nav-dropdown].show')
      .forEach(function (el) { el.classList.remove('show'); });
    removeOverlay();
  }

  function openCollapse(collapse) {
    collapse.classList.add('show');
    if (!document.querySelector('.' + OVERLAY_CLASS) && collapse.parentNode) {
      var o = document.createElement('div');
      o.className = OVERLAY_CLASS;
      collapse.parentNode.insertBefore(o, collapse);
    }
  }

  function init() {
    document.addEventListener('click', function (e) {
      var target = e.target;
      var toggle = target.closest && target.closest('[data-nav-toggle]');
      if (toggle) {
        var collapse = document.querySelector('[data-nav-collapse]');
        if (collapse) {
          if (collapse.classList.contains('show')) closeAll();
          else openCollapse(collapse);
        }
        return;
      }
      var ddToggle = target.closest && target.closest('[data-nav-dropdown-toggle]');
      if (ddToggle) {
        var dd = ddToggle.closest('[data-nav-dropdown]');
        if (dd) dd.classList.toggle('show');
        return;
      }
      var link = target.closest && target.closest('[data-nav-collapse] a');
      if (link) { closeAll(); return; }
      // click outside the collapse (including on the overlay) closes everything
      if (!(target.closest && target.closest('[data-nav-collapse]'))) closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
