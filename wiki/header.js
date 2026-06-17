// wiki 共通ヘッダー。
// 各ページに置いた <div class="wiki-header" data-brand="..." data-nav='[...]'></div> を
// 実際の <header class="site-header"> に置き換える。document.write は使わない。
// nav とブランドのリンク先はページごとに data 属性で指定する（active 状態・相対パスの違いを吸収）。
(function () {
  var mount = document.querySelector('.wiki-header');
  if (!mount) return;

  var brand = mount.getAttribute('data-brand') || '/';
  var nav = [];
  try {
    nav = JSON.parse(mount.getAttribute('data-nav') || '[]');
  } catch (e) {
    nav = [];
  }

  var pills = nav.map(function (n) {
    return '<a href="' + n.href + '" class="nav-pill' + (n.active ? ' active' : '') + '">' + n.label + '</a>';
  }).join('');

  var header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML =
    '<div class="pixel-logo" id="pxl"></div>' +
    '<a href="' + brand + '" class="brand">れよんサーバー Wiki</a>' +
    '<nav class="topnav">' + pills + '</nav>';
  mount.replaceWith(header);

  // ピクセルロゴを生成
  var el = document.getElementById('pxl');
  if (el) {
    var p = ['#7CC93C', '#9DD96B', '#5BAF22', '#C6E4A6', '#4F9F1F', '#FFFDF6'];
    for (var i = 0; i < 64; i++) {
      var d = document.createElement('div');
      d.style.background = p[(i * 7 + (i % 5)) % p.length];
      el.appendChild(d);
    }
  }
})();
