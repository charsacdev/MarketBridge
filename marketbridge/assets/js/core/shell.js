/* ==========================================================================
   MARKETBRIDGE — SHELL
   Renders the chrome so every page file stays thin and no nav markup is
   ever duplicated. Each renderer here maps to one Blade layout later:

     brand mark   -> <x-brand />
     app topbar   -> layouts/partials/topbar.blade.php
     tab bar      -> layouts/partials/tabbar.blade.php
     admin rail   -> layouts/partials/admin-nav.blade.php

   Driven entirely by body attributes:
     data-shell="app|admin"  data-nav="home"  data-root="../"
     data-title="Signals"    data-sub="Follow top traders"
     data-back="../users/"
   ========================================================================== */

(function (global) {
  'use strict';
  var MB = global.MB = global.MB || {};

  /* ======================================================================
     BRAND
     ====================================================================== */
  /* The supplied brand artwork. icon.png is the mark on its own; logo.png is
     the full lockup with the wordmark and tagline already set. Both are used
     directly so the platform always carries the real logo files. */
  MB.brandMark = function (size) {
    var h = size ? 'style="height:' + Math.round(size * 0.88) + 'px"' : '';
    return '<img class="brand-icon" ' + h + ' src="' + MB.url('assets/icons/icon.png') +
           '" alt="" aria-hidden="true">';
  };

  /* Full lockup: logo.png. Falls back to mark + text only if the file is
     missing, so the header never renders empty. */
  MB.brand = function (opts) {
    var o = opts || {};
    var href = o.href !== undefined ? o.href : MB.url('index.html');
    var cls = 'brand' + (o.large ? ' brand-lg' : o.small ? ' brand-sm' : '');

    var inner = '<img class="brand-img" src="' + MB.url('assets/icons/logo.png') +
      '" alt="MarketBridge" ' +
      'onerror="this.outerHTML=MB.brandMark()+' +
      '\'&lt;span class=\\\'brand-text\\\'&gt;&lt;span class=\\\'brand-name\\\'&gt;' +
      '&lt;span class=\\\'a\\\'&gt;MARKET&lt;/span&gt;&lt;span class=\\\'b\\\'&gt;BRIDGE&lt;/span&gt;' +
      '&lt;/span&gt;&lt;/span&gt;\'">';

    return href
      ? '<a class="' + cls + '" href="' + href + '" aria-label="MarketBridge home">' + inner + '</a>'
      : '<span class="' + cls + '">' + inner + '</span>';
  };

  /* ======================================================================
     APP TOP BAR
     Two forms: the Home bar (brand + bell + avatar) and the inner-page bar
     (back + title + actions). Chosen by whether data-back is present.
     ====================================================================== */
  function renderTopbar(body) {
    var host = MB.$('[data-render="topbar"]');
    if (!host) { return; }

    var back = body.getAttribute('data-back');
    var title = body.getAttribute('data-title');
    var sub = body.getAttribute('data-sub');
    var unread = body.getAttribute('data-unread') || '3';
    var r = MB.root();

    var right =
      '<button class="icon-btn" data-theme-toggle aria-label="Switch between light and dark"></button>' +
      '<a class="icon-btn bell" href="' + r + 'users/notifications.html" aria-label="Notifications">' +
        MB.icon('bell', 21) +
        (unread !== '0' ? '<span class="count">' + unread + '</span>' : '') +
      '</a>' +
      '<a href="' + r + 'users/profile/index.html" aria-label="Your profile">' +
        '<span class="avatar avatar-sm avatar-ring" style="background:' + MB.avatarColor('johndavid') + '">JD</span>' +
      '</a>';

    if (back !== null && back !== undefined) {
      host.outerHTML =
        '<header class="topbar">' +
          '<a class="topbar-back" href="' + back + '" aria-label="Go back">' + MB.icon('back', 22) + '</a>' +
          '<div class="grow">' +
            '<div class="topbar-title" style="font-size:var(--mb-t-h2)">' + MB.esc(title || '') + '</div>' +
            (sub ? '<div class="topbar-sub">' + MB.esc(sub) + '</div>' : '') +
          '</div>' +
          '<div class="row g1 none">' + (body.hasAttribute('data-bare') ? '' : right) + '</div>' +
        '</header>';
    } else if (title) {
      host.outerHTML =
        '<header class="topbar">' +
          '<div class="grow">' +
            '<h1 class="topbar-title">' + MB.esc(title) + '</h1>' +
            (sub ? '<div class="topbar-sub">' + MB.esc(sub) + '</div>' : '') +
          '</div>' +
          '<div class="row g1 none">' + right + '</div>' +
        '</header>';
    } else {
      host.outerHTML =
        '<header class="topbar">' +
          '<div class="grow">' + MB.brand({ href: r + 'users/index.html' }) + '</div>' +
          '<div class="row g1 none">' + right + '</div>' +
        '</header>';
    }
  }

  /* ======================================================================
     BOTTOM TAB BAR — five items, fixed, identical on every customer screen
     ====================================================================== */
  var TABS = [
    { id: 'home',      label: 'Home',      icon: 'home',      href: 'users/index.html' },
    { id: 'markets',   label: 'Markets',   icon: 'markets',   href: 'users/markets/index.html' },
    { id: 'trade',     label: 'Trade',     icon: 'trade',     href: 'users/trade/index.html' },
    { id: 'signals',   label: 'Signals',   icon: 'signals',   href: 'users/signals/index.html' },
    { id: 'community', label: 'Community', icon: 'community', href: 'users/community/index.html' }
  ];

  function renderTabbar(body) {
    var host = MB.$('[data-render="tabbar"]');
    if (!host) { return; }
    var active = body.getAttribute('data-nav');
    var r = MB.root();

    host.outerHTML = '<nav class="tabbar" aria-label="Main">' + TABS.map(function (t) {
      return '<a href="' + r + t.href + '"' +
             (t.id === active ? ' class="is-active" aria-current="page"' : '') + '>' +
             MB.icon(t.icon, 22) + '<span>' + t.label + '</span></a>';
    }).join('') + '</nav>';
  }

  /* ======================================================================
     ADMIN SIDEBAR
     ====================================================================== */
  var ADMIN_NAV = [
    { group: 'Overview' },
    { id: 'dashboard',    label: 'Dashboard',    icon: 'grid',      href: 'admin/index.html' },
    { id: 'analytics',    label: 'Analytics',    icon: 'activity',  href: 'admin/analytics.html' },
    { group: 'People' },
    { id: 'users',        label: 'Users',        icon: 'users',     href: 'admin/users.html' },
    { group: 'Content' },
    { id: 'signals',      label: 'Signals',      icon: 'signals',   href: 'admin/signals.html' },
    { id: 'boosted',      label: 'Boosted',      icon: 'megaphone', href: 'admin/boosted.html' },
    { id: 'community',    label: 'Community',    icon: 'community', href: 'admin/community.html' },
    { id: 'resources',    label: 'Resources',    icon: 'book',      href: 'admin/resources.html' },
    { group: 'Operations' },
    { id: 'reports',      label: 'Reports',      icon: 'flag',      href: 'admin/reports.html', count: 7 },
    { id: 'capabilities', label: 'Capabilities', icon: 'layers',    href: 'admin/capabilities.html' },
    { id: 'markets',      label: 'Markets',      icon: 'markets',   href: 'admin/markets.html' },
    { id: 'transactions', label: 'Transactions', icon: 'wallet',    href: 'admin/transactions.html' },
    { id: 'settings',     label: 'Settings',     icon: 'settings',  href: 'admin/settings.html' }
  ];

  function renderAdminRail(body) {
    var host = MB.$('[data-render="admin-rail"]');
    if (!host) { return; }
    var active = body.getAttribute('data-nav');
    var r = MB.root();

    var items = ADMIN_NAV.map(function (n) {
      if (n.group) { return '<div class="admin-nav-group">' + n.group + '</div>'; }
      return '<a href="' + r + n.href + '"' +
        (n.id === active ? ' class="is-active" aria-current="page"' : '') + '>' +
        MB.icon(n.icon, 18) + '<span>' + n.label + '</span>' +
        (n.count ? '<span class="count">' + n.count + '</span>' : '') + '</a>';
    }).join('');

    host.outerHTML =
      '<aside class="admin-rail" id="adminRail">' +
        '<div class="admin-brand">' +
          MB.brandMark(26) +
          '<div><div class="brand-name" style="font-size:14px">' +
            '<span class="a">MARKET</span><span class="b">BRIDGE</span></div>' +
            '<div class="tag">Admin Console</div></div>' +
        '</div>' +
        '<nav class="admin-nav" aria-label="Admin">' + items + '</nav>' +
        '<div class="admin-rail-foot">' +
          '<a class="admin-nav" href="' + r + 'users/index.html" style="display:block">' +
            '<span style="display:flex;align-items:center;gap:12px;padding:10px 12px;' +
            'font-size:13px;font-weight:600;color:var(--mb-text-2)">' +
            MB.icon('external', 18) + 'Customer app</span></a>' +
          '<a class="admin-nav" href="' + r + 'auth/login.html" style="display:block">' +
            '<span style="display:flex;align-items:center;gap:12px;padding:10px 12px;' +
            'font-size:13px;font-weight:600;color:var(--mb-sell)">' +
            MB.icon('logout', 18) + 'Log out</span></a>' +
        '</div>' +
      '</aside>' +
      '<div class="admin-scrim" id="adminScrim"></div>';
  }

  /* ======================================================================
     PUBLIC SITE HEADER + FOOTER
     ====================================================================== */
  var SITE_NAV = [
    { id: 'home',     label: 'Home',       href: 'index.html',          icon: 'home' },
    { id: 'features', label: 'Features',   href: 'index.html#features', icon: 'grid' },
    { id: 'markets',  label: 'Markets',    href: 'users/markets/index.html', icon: 'markets' },
    { id: 'signals',  label: 'Signals',    href: 'users/signals/index.html', icon: 'signals' },
    { id: 'community',label: 'Community',  href: 'users/community/index.html', icon: 'community' },
    { id: 'resources',label: 'Resources',  href: 'users/resources/index.html', icon: 'resources' },
    { id: 'about',    label: 'About',      href: 'about.html',          icon: 'info' },
    { id: 'contact',  label: 'Contact',    href: 'contact.html',        icon: 'mail' },
    { id: 'faq',      label: 'Help & FAQ', href: 'faq.html',            icon: 'chat' }
  ];

  /* Header carries the brand and one menu control. Everything else lives in
     the drawer, which slides in from the right. */
  function renderSiteHeader(body) {
    var host = MB.$('[data-render="site-header"]');
    if (!host) { return; }
    var active = body.getAttribute('data-nav');
    var r = MB.root();

    var links = SITE_NAV.map(function (n) {
      return '<a href="' + r + n.href + '"' + (n.id === active ? ' class="is-active"' : '') + '>' +
        MB.icon(n.icon, 19) + '<span>' + n.label + '</span></a>';
    }).join('');

    host.outerHTML =
      '<header class="site-header">' +
        '<div class="container inner">' +
          MB.brand({ href: r + 'index.html' }) +
          '<button class="menu-btn" id="drawerOpen" aria-label="Open menu" ' +
            'aria-expanded="false" aria-controls="siteDrawer">' +
            MB.icon('menu', 18) + '<span class="lbl">Menu</span></button>' +
        '</div>' +
      '</header>' +

      '<div class="drawer-scrim" id="drawerScrim"></div>' +
      '<aside class="drawer" id="siteDrawer" role="dialog" aria-modal="true" aria-label="Site menu">' +
        '<div class="drawer-head">' +
          MB.brand({ href: r + 'index.html', small: true }) +
          '<button class="drawer-close" id="drawerClose" aria-label="Close menu">' +
            MB.icon('close', 19) + '</button>' +
        '</div>' +

        '<nav class="drawer-nav" aria-label="Site">' + links + '</nav>' +

        '<div class="drawer-label">Account</div>' +
        '<div class="drawer-actions">' +
          '<a class="btn btn-primary btn-block" href="' + r + 'auth/register.html">' +
            MB.icon('userplus', 18) + ' Create free account</a>' +
          '<a class="btn btn-ghost btn-block" href="' + r + 'auth/login.html">' +
            MB.icon('logout', 18) + ' Log in</a>' +
          '<button class="btn btn-outline btn-block" data-install>' +
            MB.icon('download', 18) + ' Install the app</button>' +
        '</div>' +

        '<div class="drawer-legal">' +
          '<a href="' + r + 'terms.html">Terms</a>' +
          '<a href="' + r + 'privacy.html">Privacy</a>' +
          '<a href="' + r + 'risk-disclosure.html">Risk Disclosure</a>' +
          '<a href="' + r + 'signal-disclaimer.html">Signal Disclaimer</a>' +
        '</div>' +

        '<div class="drawer-foot">' +
          '<span class="t">Appearance</span>' +
          '<button class="theme-toggle" data-theme-toggle aria-label="Switch theme"></button>' +
        '</div>' +
      '</aside>';
  }

  /* ======================================================================
     DRAWER
     ====================================================================== */
  function wireDrawer() {
    var open = document.getElementById('drawerOpen');
    var close = document.getElementById('drawerClose');
    var scrim = document.getElementById('drawerScrim');
    var drawer = document.getElementById('siteDrawer');
    if (!open || !drawer) { return; }

    var lastFocus = null;

    function show() {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      scrim.classList.add('is-open');
      open.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = drawer.querySelector('a, button');
      if (first) { first.focus(); }
    }
    function hide() {
      drawer.classList.remove('is-open');
      scrim.classList.remove('is-open');
      open.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastFocus) { lastFocus.focus(); }
    }

    open.addEventListener('click', show);
    close.addEventListener('click', hide);
    scrim.addEventListener('click', hide);
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) { hide(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { hide(); }
    });
  }

  function renderSiteFooter() {
    var host = MB.$('[data-render="site-footer"]');
    if (!host) { return; }
    var r = MB.root();
    var y = new Date().getFullYear();

    host.outerHTML =
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-col footer-about">' +
              MB.brand({ href: r + 'index.html' }) +
              '<p>A Deriv-connected social trading platform. Trade supported synthetic ' +
              'index contracts, follow traders who specialise in your markets, and learn ' +
              'in one place.</p>' +
              '<div class="footer-social">' +
                '<a href="#" aria-label="Community chat">' + MB.icon('chat', 17) + '</a>' +
                '<a href="#" aria-label="Email us">' + MB.icon('mail', 17) + '</a>' +
                '<a href="#" aria-label="Website">' + MB.icon('globe', 17) + '</a>' +
              '</div>' +
            '</div>' +
            '<div class="footer-col"><h4>Platform</h4>' +
              '<a href="' + r + 'users/markets/index.html">Markets</a>' +
              '<a href="' + r + 'users/trade/index.html">Trade</a>' +
              '<a href="' + r + 'users/signals/index.html">Signals</a>' +
              '<a href="' + r + 'users/community/index.html">Community</a>' +
              '<a href="' + r + 'users/results/index.html">Leaderboards</a>' +
              '<a href="' + r + 'users/resources/index.html">Resources</a>' +
            '</div>' +
            '<div class="footer-col"><h4>Company</h4>' +
              '<a href="' + r + 'about.html">About</a>' +
              '<a href="' + r + 'contact.html">Contact</a>' +
              '<a href="' + r + 'faq.html">Help &amp; FAQ</a>' +
              '<a href="' + r + 'auth/register.html">Create account</a>' +
            '</div>' +
            '<div class="footer-col"><h4>Legal</h4>' +
              '<a href="' + r + 'terms.html">Terms of Service</a>' +
              '<a href="' + r + 'privacy.html">Privacy Policy</a>' +
              '<a href="' + r + 'risk-disclosure.html">Risk Disclosure</a>' +
              '<a href="' + r + 'signal-disclaimer.html">Signal Disclaimer</a>' +
            '</div>' +
          '</div>' +

          '<div class="risk-strip">' +
            '<div class="rt">' + MB.icon('warning', 17) + 'Trading involves substantial risk</div>' +
            '<p>Trading synthetic indices and other leveraged products carries a high level of risk ' +
            'and may not be suitable for all investors. You could lose more than your initial ' +
            'investment. MarketBridge does not hold client funds and does not provide investment ' +
            'advice. Signals and analysis are user-generated and are not recommendations by ' +
            'MarketBridge. Past performance does not guarantee future results. Please read our ' +
            '<a href="' + r + 'risk-disclosure.html">Risk Disclosure</a> before trading.</p>' +
          '</div>' +

          '<div class="footer-bottom">' +
            '<span>&copy; ' + y + ' MarketBridge. All rights reserved.</span>' +
            '<span class="links">' +
              '<a href="' + r + 'terms.html">Terms</a>' +
              '<a href="' + r + 'privacy.html">Privacy</a>' +
              '<a href="' + r + 'risk-disclosure.html">Risk</a>' +
              '<a href="' + r + 'contact.html">Contact</a>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  MB.mountShell = function () {
    var body = document.body;
    var shell = body.getAttribute('data-shell');

    if (shell === 'app')   { renderTopbar(body); renderTabbar(body); body.classList.add('has-app'); }
    if (shell === 'auth')  { body.classList.add('has-auth'); }
    if (shell === 'admin') { renderAdminRail(body); }
    if (shell === 'site')  { renderSiteHeader(body); renderSiteFooter(); }

    MB.mountIcons();
    if (MB.mountCharts) { MB.mountCharts(); }
    if (MB.mountTicks)  { MB.mountTicks(); }

    wireDrawer();

    /* Admin burger */
    var ab = document.getElementById('adminBurger');
    if (ab) {
      var rail = document.getElementById('adminRail');
      var scrim = document.getElementById('adminScrim');
      var close = function () { rail.classList.remove('is-open'); scrim.classList.remove('is-open'); };
      ab.addEventListener('click', function () {
        rail.classList.toggle('is-open'); scrim.classList.toggle('is-open');
      });
      if (scrim) { scrim.addEventListener('click', close); }
    }

    /* Theme toggles, anywhere on the page */
    MB.$$('[data-theme-toggle]').forEach(function (btn) {
      var paint = function () {
        btn.innerHTML = MB.icon(MB.theme.resolved() === 'dark' ? 'sun' : 'moon', 18);
      };
      paint();
      btn.addEventListener('click', function () { MB.theme.toggle(); paint(); });
      document.addEventListener('mb:theme', paint);
    });
  };

  MB.ready(MB.mountShell);
})(window);
