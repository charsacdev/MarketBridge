/* ==========================================================================
   MARKETBRIDGE — DATATABLE (admin)
   Sortable columns, live search, per-page control, status filters and real
   pagination. Everything happens client-side here; in Stage 2 the same
   surface is driven by a Livewire component with server-side paging, and the
   markup does not change.

     MB.datatable({
       from: 'admin/users',
       into: '#table',
       columns: [
         { key:'username', label:'User', sortable:true, render:fn },
         { key:'status',   label:'Status', sortable:true, filter:['active','banned'] },
         { key:'',         label:'Actions', align:'right', render:fn }
       ],
       search: ['username','email'],
       perPage: 10
     });
   ========================================================================== */

(function (global) {
  'use strict';
  var MB = global.MB = global.MB || {};

  MB.datatable = function (opts) {
    var o = opts || {};
    var host = typeof o.into === 'string' ? MB.$(o.into) : o.into;
    if (!host) { return null; }

    var all = [], view = [];
    var page = 1;
    var perPage = o.perPage || 10;
    var sortKey = o.sortKey || null;
    var sortDir = o.sortDir || 'asc';
    var query = '';
    var filters = {};
    var selected = {};

    var cols = o.columns || [];

    /* ------------------------------------------------------------------ */
    function value(row, key) {
      if (!key) { return ''; }
      return key.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, row);
    }

    function compute() {
      view = all.slice();

      if (query) {
        var keys = o.search || cols.map(function (c) { return c.key; }).filter(Boolean);
        view = view.filter(function (r) {
          return keys.some(function (k) {
            var v = value(r, k);
            return v != null && String(v).toLowerCase().indexOf(query) > -1;
          });
        });
      }

      Object.keys(filters).forEach(function (k) {
        var v = filters[k];
        if (!v || v === 'all') { return; }
        view = view.filter(function (r) { return String(value(r, k)) === v; });
      });

      if (sortKey) {
        var col = cols.filter(function (c) { return c.key === sortKey; })[0] || {};
        view.sort(function (a, b) {
          var x = col.sortValue ? col.sortValue(a) : value(a, sortKey);
          var y = col.sortValue ? col.sortValue(b) : value(b, sortKey);
          if (typeof x === 'number' && typeof y === 'number') { return sortDir === 'asc' ? x - y : y - x; }
          x = String(x == null ? '' : x).toLowerCase();
          y = String(y == null ? '' : y).toLowerCase();
          return sortDir === 'asc' ? (x < y ? -1 : x > y ? 1 : 0) : (x > y ? -1 : x < y ? 1 : 0);
        });
      }

      var pages = Math.max(1, Math.ceil(view.length / perPage));
      if (page > pages) { page = pages; }
    }

    /* ------------------------------------------------------------------ */
    function toolbar() {
      var filterCols = cols.filter(function (c) { return c.filter; });
      return '<div class="dt-toolbar">' +
        '<div class="dt-search input-icon">' + MB.icon('search', 16) +
          '<input class="input" type="search" data-dt-search placeholder="' +
          MB.esc(o.searchPlaceholder || 'Search…') + '" aria-label="Search table" value="' + MB.esc(query) + '">' +
        '</div>' +
        filterCols.map(function (c) {
          return '<select class="select" data-dt-filter="' + c.key + '" aria-label="Filter by ' + MB.esc(c.label) + '">' +
            '<option value="all">All ' + MB.esc(c.label) + '</option>' +
            c.filter.map(function (v) {
              var val = typeof v === 'object' ? v.value : v;
              var lab = typeof v === 'object' ? v.label : String(v).replace(/_/g, ' ');
              return '<option value="' + MB.esc(val) + '"' +
                (filters[c.key] === val ? ' selected' : '') + '>' +
                MB.esc(lab.charAt(0).toUpperCase() + lab.slice(1)) + '</option>';
            }).join('') + '</select>';
        }).join('') +
        '<span class="grow"></span>' +
        '<label class="dt-per">Rows' +
          '<select class="select" data-dt-per aria-label="Rows per page">' +
            [10, 25, 50, 100].map(function (n) {
              return '<option value="' + n + '"' + (n === perPage ? ' selected' : '') + '>' + n + '</option>';
            }).join('') +
          '</select></label>' +
        (o.exportable === false ? '' :
          '<button class="btn btn-ghost btn-sm" data-dt-export>' + MB.icon('download', 15) + ' Export</button>') +
      '</div>';
    }

    function head() {
      return '<thead><tr>' +
        (o.selectable ? '<th class="dt-check"><label class="check"><input type="checkbox" data-dt-all>' +
          '<span class="box">' + MB.icon('check', 13) + '</span></label></th>' : '') +
        cols.map(function (c) {
          var cls = (c.align === 'right' ? ' class="ta-r"' : '');
          if (!c.sortable) { return '<th' + cls + '>' + MB.esc(c.label) + '</th>'; }
          var on = sortKey === c.key;
          return '<th' + cls + '><button class="dt-sort' + (on ? ' is-on' : '') +
            '" data-dt-sort="' + c.key + '">' + MB.esc(c.label) +
            '<span class="dt-arrow">' +
              (on ? MB.icon(sortDir === 'asc' ? 'up' : 'down', 12) : MB.icon('chevdown', 12)) +
            '</span></button></th>';
        }).join('') + '</tr></thead>';
    }

    function body() {
      var rows = view.slice((page - 1) * perPage, page * perPage);
      if (!rows.length) {
        return '<tbody><tr><td colspan="' + (cols.length + (o.selectable ? 1 : 0)) + '">' +
          '<div class="empty" style="padding:48px 20px">' + MB.icon('search', 40) +
          '<h3>No rows match</h3><p>Clear the search or change the filters.</p></div></td></tr></tbody>';
      }
      return '<tbody>' + rows.map(function (r, i) {
        var id = r.id || String(i);
        return '<tr data-dt-row="' + MB.esc(id) + '"' + (selected[id] ? ' class="is-selected"' : '') + '>' +
          (o.selectable ? '<td class="dt-check"><label class="check"><input type="checkbox" data-dt-pick="' +
            MB.esc(id) + '"' + (selected[id] ? ' checked' : '') + '>' +
            '<span class="box">' + MB.icon('check', 13) + '</span></label></td>' : '') +
          cols.map(function (c) {
            var cls = (c.align === 'right' ? ' class="ta-r"' : c.numeric ? ' class="num ta-r"' : '');
            return '<td' + cls + '>' + (c.render ? c.render(r) : MB.esc(value(r, c.key) == null ? '' : value(r, c.key))) + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody>';
    }

    function pager() {
      var total = view.length;
      var pages = Math.max(1, Math.ceil(total / perPage));
      var from = total ? (page - 1) * perPage + 1 : 0;
      var to = Math.min(total, page * perPage);

      var nums = [], i;
      var add = function (n) {
        nums.push('<button class="pg-num' + (n === page ? ' is-active' : '') +
          '" data-dt-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>');
      };
      var gap = '<span class="pg-gap">&hellip;</span>';
      if (pages <= 7) { for (i = 1; i <= pages; i++) { add(i); } }
      else {
        add(1);
        if (page > 3) { nums.push(gap); }
        for (i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) { add(i); }
        if (page < pages - 2) { nums.push(gap); }
        add(pages);
      }

      var picked = Object.keys(selected).filter(function (k) { return selected[k]; }).length;

      return '<div class="dt-foot">' +
        '<div class="dt-count">' +
          (picked ? '<strong>' + picked + '</strong> selected &middot; ' : '') +
          'Showing <strong>' + from + '&ndash;' + to + '</strong> of <strong>' + total + '</strong>' +
          (total !== all.length ? ' <span class="c-3">(filtered from ' + all.length + ')</span>' : '') +
        '</div>' +
        '<div class="pager">' +
          '<button class="pg-nav" data-dt-page="prev"' + (page === 1 ? ' disabled' : '') +
            ' aria-label="Previous page">' + MB.icon('chevleft', 16) + '</button>' +
          nums.join('') +
          '<button class="pg-nav" data-dt-page="next"' + (page === pages ? ' disabled' : '') +
            ' aria-label="Next page">' + MB.icon('chevright', 16) + '</button>' +
        '</div>' +
      '</div>';
    }

    /* ------------------------------------------------------------------ */
    function render() {
      compute();
      host.innerHTML =
        '<div class="datatable">' + toolbar() +
        '<div class="dt-scroll"><table class="data">' + head() + body() + '</table></div>' +
        pager() + '</div>';
      MB.mountIcons(host);
      wire();
      if (o.done) { o.done(view, host); }
    }

    function wire() {
      var s = MB.$('[data-dt-search]', host);
      if (s) {
        var t;
        s.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            query = s.value.trim().toLowerCase();
            page = 1;
            render();
            var again = MB.$('[data-dt-search]', host);
            if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
          }, 200);
        });
      }

      MB.$$('[data-dt-filter]', host).forEach(function (sel) {
        sel.addEventListener('change', function () {
          filters[sel.getAttribute('data-dt-filter')] = sel.value;
          page = 1; render();
        });
      });

      var per = MB.$('[data-dt-per]', host);
      if (per) {
        per.addEventListener('change', function () { perPage = Number(per.value); page = 1; render(); });
      }

      MB.$$('[data-dt-sort]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-dt-sort');
          if (sortKey === k) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
          else { sortKey = k; sortDir = 'asc'; }
          render();
        });
      });

      MB.$$('[data-dt-page]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-dt-page');
          var pages = Math.max(1, Math.ceil(view.length / perPage));
          if (v === 'prev') { page = Math.max(1, page - 1); }
          else if (v === 'next') { page = Math.min(pages, page + 1); }
          else { page = Number(v); }
          render();
          host.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      var allBox = MB.$('[data-dt-all]', host);
      if (allBox) {
        allBox.addEventListener('change', function () {
          view.slice((page - 1) * perPage, page * perPage).forEach(function (r) {
            selected[r.id] = allBox.checked;
          });
          render();
        });
      }
      MB.$$('[data-dt-pick]', host).forEach(function (b) {
        b.addEventListener('change', function () {
          selected[b.getAttribute('data-dt-pick')] = b.checked;
          render();
        });
      });

      var ex = MB.$('[data-dt-export]', host);
      if (ex) {
        ex.addEventListener('click', function () {
          /* Stage 2: this hits an export endpoint. Here it proves the
             current filter + sort is what would be exported. */
          MB.toast('Exporting ' + view.length + ' rows');
        });
      }
    }

    /* ------------------------------------------------------------------ */
    host.innerHTML = '<div class="datatable"><div class="dt-scroll" style="padding:24px">' +
      '<div class="skeleton sk-line w40"></div><div class="skeleton sk-line w80"></div>' +
      '<div class="skeleton sk-line w60"></div><div class="skeleton sk-line w80"></div></div></div>';

    (o.data ? Promise.resolve(o.data) : MB.api.list(o.from)).then(function (rows) {
      all = rows || [];
      render();
    }).catch(function () {
      host.innerHTML = '<div class="empty">' + MB.icon('warning', 46) +
        '<h3>Could not load</h3><p>Serve this folder over HTTP so the data can load.</p></div>';
      MB.mountIcons(host);
    });

    return {
      refresh: render,
      rows: function () { return view.slice(); },
      selected: function () { return Object.keys(selected).filter(function (k) { return selected[k]; }); }
    };
  };
})(window);
