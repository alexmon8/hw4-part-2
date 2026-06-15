/*
  COMP 4610 GUI I - HW4 Part 2: Dynamic Multiplication Table
  Author: Alexi Montesinos
  Email: Alexi_Montesinos@student.uml.edu
  Description: Extends Part 1 with:
    - jQuery UI sliders two-way bound to each text input
    - Live table preview that updates on every slider move or keystroke
    - "Snapshot → New Tab" button that saves the current table in a new tab
    - Individual tab close button and bulk "Delete All Tables" button
*/

$(function () {
  const LIMIT = 50;
  let tabCount = 0;

  // ── jQuery UI Tabs ────────────────────────────────────────
  $('#tabs').tabs();

  // ── Custom validation rules (same as Part 1) ──────────────

  $.validator.addMethod('integer', function (value, element) {
    return this.optional(element) || /^-?\d+$/.test(value.trim());
  }, 'Please enter a whole number with no decimal point.');

  $.validator.addMethod('colOrderMax', function (value) {
    const min = parseInt($('#minCol').val(), 10);
    const max = parseInt(value, 10);
    return isNaN(min) || isNaN(max) || max >= min;
  }, 'Maximum Column Value must be ≥ Minimum Column Value.');

  $.validator.addMethod('rowOrderMax', function (value) {
    const min = parseInt($('#minRow').val(), 10);
    const max = parseInt(value, 10);
    return isNaN(min) || isNaN(max) || max >= min;
  }, 'Maximum Row Value must be ≥ Minimum Row Value.');

  // ── Validator setup ───────────────────────────────────────

  const validator = $('#tableForm').validate({
    rules: {
      minCol: { required: true, integer: true, min: -LIMIT, max: LIMIT },
      maxCol: { required: true, integer: true, min: -LIMIT, max: LIMIT, colOrderMax: true },
      minRow: { required: true, integer: true, min: -LIMIT, max: LIMIT },
      maxRow: { required: true, integer: true, min: -LIMIT, max: LIMIT, rowOrderMax: true }
    },

    messages: {
      minCol: {
        required:  'Minimum Column Value is required — enter a whole number between -50 and 50.',
        integer:   'Minimum Column Value must be a whole number (e.g. -5, 0, 10).',
        min:       'Minimum Column Value must be at least -50.',
        max:       'Minimum Column Value must be no greater than 50.'
      },
      maxCol: {
        required:    'Maximum Column Value is required — enter a whole number between -50 and 50.',
        integer:     'Maximum Column Value must be a whole number (e.g. -5, 0, 10).',
        min:         'Maximum Column Value must be at least -50.',
        max:         'Maximum Column Value must be no greater than 50.',
        colOrderMax: 'Maximum Column Value must be ≥ Minimum Column Value — increase this value or decrease the minimum.'
      },
      minRow: {
        required:  'Minimum Row Value is required — enter a whole number between -50 and 50.',
        integer:   'Minimum Row Value must be a whole number (e.g. -5, 0, 10).',
        min:       'Minimum Row Value must be at least -50.',
        max:       'Minimum Row Value must be no greater than 50.'
      },
      maxRow: {
        required:    'Maximum Row Value is required — enter a whole number between -50 and 50.',
        integer:     'Maximum Row Value must be a whole number (e.g. -5, 0, 10).',
        min:         'Maximum Row Value must be at least -50.',
        max:         'Maximum Row Value must be no greater than 50.',
        rowOrderMax: 'Maximum Row Value must be ≥ Minimum Row Value — increase this value or decrease the minimum.'
      }
    },

    errorElement: 'span',
    errorClass: 'field-error',

    /* Place each error after the slider that follows its input */
    errorPlacement: function (error, element) {
      const $slider = element.next('.slider');
      error.insertAfter($slider.length ? $slider : element);
    },

    highlight:   function (el) { $(el).addClass('input-error'); },
    unhighlight: function (el) { $(el).removeClass('input-error'); },

    onfocusout: function (element) {
      this.element(element);
      if (element.id === 'minCol' && $('#maxCol').val() !== '') this.element('#maxCol');
      if (element.id === 'minRow' && $('#maxRow').val() !== '') this.element('#maxRow');
    },

    submitHandler: function () {
      const vals = readValues();
      if (vals) addTableTab(vals);
      return false;
    }
  });

  // ── Sliders + two-way binding ─────────────────────────────

  ['minCol', 'maxCol', 'minRow', 'maxRow'].forEach(function (id) {

    /* Slider → text input */
    $('#' + id + '-slider').slider({
      min: -LIMIT,
      max: LIMIT,
      value: 0,
      slide: function (event, ui) {
        $('#' + id).val(ui.value);
        /* Re-run the field's validation rule so errors clear in real time */
        validator.element('#' + id);
        /* Re-check ordering rules when a min field moves */
        if (id === 'minCol' && $('#maxCol').val() !== '') validator.element('#maxCol');
        if (id === 'minRow' && $('#maxRow').val() !== '') validator.element('#maxRow');
        tryLivePreview();
      }
    });

    /* Text input → slider */
    $('#' + id).on('input', function () {
      const val = parseInt($(this).val(), 10);
      if (!isNaN(val)) {
        $('#' + id + '-slider').slider('value', Math.max(-LIMIT, Math.min(LIMIT, val)));
      }
      if (id === 'minCol' && $('#maxCol').val() !== '') validator.element('#maxCol');
      if (id === 'minRow' && $('#maxRow').val() !== '') validator.element('#maxRow');
      tryLivePreview();
    });
  });

  // ── Live preview ──────────────────────────────────────────

  /*
    Silently updates the preview table whenever the inputs form a valid set.
    Does not trigger validation error messages.
  */
  function tryLivePreview() {
    const v = readValues();
    if (v && v.minCol <= v.maxCol && v.minRow <= v.maxRow) {
      buildTable(v.minCol, v.maxCol, v.minRow, v.maxRow, '#preview-container');
      $('#preview-section').removeClass('hidden');
    } else {
      $('#preview-section').addClass('hidden');
    }
  }

  // ── Tab management ────────────────────────────────────────

  function addTableTab(vals) {
    tabCount++;
    const tabId = 'tab-table-' + tabCount;
    const label = 'C: ' + vals.minCol + '–' + vals.maxCol +
                  ', R: ' + vals.minRow + '–' + vals.maxRow;

    /* Build the tab list item with a close button */
    const $li = $(
      '<li data-tab-id="' + tabId + '">' +
        '<a href="#' + tabId + '">' + label + '</a>' +
        '<span class="tab-close" title="Close this tab">×</span>' +
      '</li>'
    );
    $('#tabs ul').append($li);

    /* Build the tab content panel */
    const $panel = $('<div id="' + tabId + '"><div class="table-container"></div></div>');
    $('#tabs').append($panel);

    $('#tabs').tabs('refresh');
    $('#tabs').tabs('option', 'active', $('#tabs ul li').length - 1);

    buildTable(vals.minCol, vals.maxCol, vals.minRow, vals.maxRow,
               '#' + tabId + ' .table-container');
  }

  /* Individual tab close button */
  $(document).on('click', '.tab-close', function () {
    const $li   = $(this).closest('li');
    const tabId = $li.data('tab-id');
    $li.remove();
    $('#' + tabId).remove();
    $('#tabs').tabs('refresh');
    /* If we removed the active tab, fall back to the Parameters tab */
    const total  = $('#tabs ul li').length;
    const active = $('#tabs').tabs('option', 'active');
    if (active >= total) $('#tabs').tabs('option', 'active', 0);
  });

  /* Bulk deletion — removes every generated table tab at once */
  $('#deleteAllBtn').on('click', function () {
    $('#tabs ul li[data-tab-id]').each(function () {
      $('#' + $(this).data('tab-id')).remove();
      $(this).remove();
    });
    $('#tabs').tabs('refresh');
    $('#tabs').tabs('option', 'active', 0);
  });

  // ── Helpers ───────────────────────────────────────────────

  function readValues() {
    const minCol = parseInt($('#minCol').val(), 10);
    const maxCol = parseInt($('#maxCol').val(), 10);
    const minRow = parseInt($('#minRow').val(), 10);
    const maxRow = parseInt($('#maxRow').val(), 10);
    if ([minCol, maxCol, minRow, maxRow].some(isNaN)) return null;
    if ([minCol, maxCol, minRow, maxRow].some(function (n) {
      return Math.abs(n) > LIMIT;
    })) return null;
    return { minCol, maxCol, minRow, maxRow };
  }

  function buildTable(minCol, maxCol, minRow, maxRow, selector) {
    const $container = $(selector).empty();
    const table  = document.createElement('table');
    const thead  = document.createElement('thead');
    const hRow   = document.createElement('tr');

    const corner = document.createElement('th');
    corner.textContent = '×';
    hRow.appendChild(corner);

    for (let c = minCol; c <= maxCol; c++) {
      const th = document.createElement('th');
      th.textContent = c;
      hRow.appendChild(th);
    }
    thead.appendChild(hRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = minRow; r <= maxRow; r++) {
      const tr = document.createElement('tr');
      const rh = document.createElement('td');
      rh.textContent = r;
      tr.appendChild(rh);
      for (let c = minCol; c <= maxCol; c++) {
        const td = document.createElement('td');
        td.textContent = r * c;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    $container.append(table);
  }
});
