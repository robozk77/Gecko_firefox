(function () {
  const ext = window.browser || window.chrome;

  ext.devtools.panels.create(
    "Gecko",
    "icons/icon48.png",
    "panel.html",
    function (panel) {}
  );
})();