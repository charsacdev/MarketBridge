/* ==========================================================================
   VYBE — STAFF ROLES

   Three staff portals, one manifest. Each portal folder owns the pages its
   role is allowed to open; this file is the single place that says which
   pages those are and which actions appear on them.

     moderator/   police content        — reports, community, signals
     admin/       run the platform      — the above plus people, money, markets
     superadmin/  own the platform      — the above plus staff, capabilities, settings

   Roles are cumulative: admin inherits every moderator page and action,
   superadmin inherits every admin one. A page never re-states an inherited
   permission, so there is exactly one place to change a role.

   STAGE 1: the role comes from <body data-role="…"> and is advisory — this is
   a static prototype and nothing here is a security control.
   STAGE 2: Laravel middleware + policies enforce the same manifest server
   side, and this file drives only what the UI offers. The names below are
   deliberately the permission names the policies will use.
   ========================================================================== */

(function (global) {
  'use strict';
  var MB = global.MB = global.MB || {};

  /* ----------------------------------------------------------------------
     PAGES — the nav for each portal, in render order.
     `id` matches <body data-nav="…">; `href` is relative to the site root.
     ---------------------------------------------------------------------- */
  var MODERATOR_PAGES = [
    { group: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'grid',      href: 'index.html' },
    { group: 'Moderation' },
    { id: 'reports',   label: 'Reports',   icon: 'flag',      href: 'reports.html', count: 7 },
    { id: 'community', label: 'Community', icon: 'community', href: 'community.html' },
    { id: 'signals',   label: 'Signals',   icon: 'signals',   href: 'signals.html' }
  ];

  var ADMIN_PAGES = [
    { group: 'Overview' },
    { id: 'dashboard',    label: 'Dashboard',    icon: 'grid',      href: 'index.html' },
    { id: 'analytics',    label: 'Analytics',    icon: 'activity',  href: 'analytics.html' },
    { group: 'People' },
    { id: 'users',        label: 'Users',        icon: 'users',     href: 'users.html' },
    { group: 'Content' },
    { id: 'signals',      label: 'Signals',      icon: 'signals',   href: 'signals.html' },
    { id: 'boosted',      label: 'Boosted',      icon: 'megaphone', href: 'boosted.html' },
    { id: 'community',    label: 'Community',    icon: 'community', href: 'community.html' },
    { id: 'resources',    label: 'Resources',    icon: 'book',      href: 'resources.html' },
    { group: 'Operations' },
    { id: 'reports',      label: 'Reports',      icon: 'flag',      href: 'reports.html', count: 7 },
    { id: 'markets',      label: 'Markets',      icon: 'markets',   href: 'markets.html' },
    { id: 'transactions', label: 'Transactions', icon: 'wallet',    href: 'transactions.html' }
  ];

  var SUPERADMIN_PAGES = ADMIN_PAGES.concat([
    { group: 'Platform' },
    { id: 'staff',        label: 'Staff & Roles', icon: 'shield',   href: 'staff.html' },
    { id: 'staff-audit',  label: 'Staff Audit',   icon: 'clock',    href: 'staff-audit.html' },
    { id: 'capabilities', label: 'Capabilities',  icon: 'layers',   href: 'capabilities.html' },
    { id: 'settings',     label: 'Settings',      icon: 'settings', href: 'settings.html' }
  ]);

  /* ----------------------------------------------------------------------
     ACTIONS — what a role may DO, independent of what it may see.
     A moderator sees the users table through a report, but cannot suspend.
     ---------------------------------------------------------------------- */
  var MODERATOR_ACTIONS = [
    'report.review', 'report.dismiss', 'report.escalate',
    'post.remove', 'comment.remove',
    'signal.retract', 'signal.unlist',
    'room.mute', 'room.remove_member', 'room.lock',
    'user.warn'
  ];

  var ADMIN_ACTIONS = MODERATOR_ACTIONS.concat([
    'user.view', 'user.suspend', 'user.ban', 'user.verify', 'user.reset_2fa',
    'signal.delete', 'boost.create', 'boost.cancel',
    'community.create', 'community.block', 'community.transfer',
    'resource.create', 'resource.edit', 'resource.price', 'resource.unpublish',
    'market.create', 'market.edit', 'market.disable',
    'transaction.view', 'transaction.approve', 'transaction.reject',
    'analytics.view'
  ]);

  var SUPERADMIN_ACTIONS = ADMIN_ACTIONS.concat([
    'staff.view', 'staff.invite', 'staff.edit_role', 'staff.disable', 'staff.delete',
    'staff.audit.view',
    'capability.edit',                 /* what Deriv can actually execute */
    'settings.edit',
    'user.delete',                     /* irreversible — owner only */
    'transaction.override'
  ]);

  var ROLES = {
    moderator: {
      id: 'moderator',
      label: 'Moderator',
      tone: 'info',
      home: 'moderator/',
      blurb: 'Keeps content clean. No access to people, money or settings.',
      pages: MODERATOR_PAGES,
      actions: MODERATOR_ACTIONS
    },
    admin: {
      id: 'admin',
      label: 'Admin',
      tone: 'green',
      home: 'admin/',
      blurb: 'Runs the platform day to day. No staff management or settings.',
      pages: ADMIN_PAGES,
      actions: ADMIN_ACTIONS
    },
    superadmin: {
      id: 'superadmin',
      label: 'Super Admin',
      tone: 'brand',
      home: 'superadmin/',
      blurb: 'Full control, including who else gets access.',
      pages: SUPERADMIN_PAGES,
      actions: SUPERADMIN_ACTIONS
    }
  };

  /* ----------------------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------------------- */
  MB.roles = {
    all: ROLES,
    list: function () { return ['moderator', 'admin', 'superadmin']; },

    /** The role this page is rendered for, from <body data-role>. */
    current: function () {
      var b = document.body;
      var r = b && b.getAttribute('data-role');
      return ROLES[r] ? r : 'admin';
    },

    get: function (id) { return ROLES[id] || null; },

    /** Nav entries for a role, hrefs resolved against that role's folder. */
    pages: function (id) {
      var role = ROLES[id || MB.roles.current()];
      if (!role) { return []; }
      return role.pages.map(function (p) {
        if (p.group) { return p; }
        return {
          id: p.id, label: p.label, icon: p.icon, count: p.count,
          href: role.home + p.href
        };
      });
    },

    /** Permission test. Use it to decide whether to RENDER an action. */
    can: function (action, id) {
      var role = ROLES[id || MB.roles.current()];
      return !!role && role.actions.indexOf(action) > -1;
    },

    /**
     * Renders `html` only when the role holds `action`. Keeps templates
     * declarative: `MB.roles.only('user.ban', banButtonHtml)`.
     */
    only: function (action, html, id) {
      return MB.roles.can(action, id) ? html : '';
    },

    /** True when a is at least as privileged as b. */
    atLeast: function (a, b) {
      var order = MB.roles.list();
      return order.indexOf(a) >= order.indexOf(b);
    }
  };
})(window);
