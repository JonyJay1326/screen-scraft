/* nav-active.js — 管理端导航唯一激活规则：按 body[data-page] 设置 .active。
   页面里不要手写 active。screens 页归属 projects 导航项。 */
(function () {
  var MAP = { screens: 'projects' };
  function run() {
    var page = document.body.getAttribute('data-page');
    var key = MAP[page] || page;
    document.querySelectorAll('.topnav [data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === key);
    });
    /* 用户下拉菜单 */
    var chip = document.getElementById('userChip');
    var menu = document.getElementById('userMenu');
    if (chip && menu) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('show');
      });
      document.addEventListener('click', function () { menu.classList.remove('show'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
