/* ==========================================================
   Kwelano Bohloko - forms.js (Part 3, section 4)
   - Client-side validation with inline error messages
   - inquiry.html: AJAX (fetch) submission + dynamic response
   - contact.html: compiles a ready-to-send email (mailto)
   Forms use the "novalidate" attribute so these messages are
   shown instead of the browser's default pop-ups. The HTML5
   attributes (required, minlength, maxlength, type) remain as
   a fallback and for accessibility.
   ========================================================== */
(function () {
  'use strict';

  /* ---- Editable settings (the money values are SAMPLES: change them) ---- */
  var CONFIG = {
    recipient: 'kboadc1712@gmail.com',
    phone: '072 055 1036',
    address: 'Stand no. 02, Hlatlaganya, Mankweng area, Polokwane',
    hours: 'Monday to Friday, 08:00 to 16:00',
    openDays: [1, 2, 3, 4, 5],      // 0 = Sunday ... 6 = Saturday
    sponsorPerMonth: 500            // sample sponsorship amount in rand
  };

  /* ---------- Validation rules: each returns '' (valid) or an error message ---------- */
  var rules = {
    name: function (v) {
      if (!v) return 'Please enter your full name.';
      if (!/^[A-Za-z\u00C0-\u024F' -]{2,60}$/.test(v)) return 'Use letters only, between 2 and 60 characters.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address, e.g. name@example.com.';
      return '';
    },
    phone: function (v) {
      var p = v.replace(/[\s-]/g, '');
      if (!p) return 'Please enter your phone number.';
      if (!/^(\+27|0)[1-9][0-9]{8}$/.test(p)) return 'Enter a valid South African number, e.g. 072 055 1036 or +27 72 055 1036.';
      return '';
    },
    select: function (v) {
      return v ? '' : 'Please choose an option from the list.';
    },
    subject: function (v) {
      if (!v) return 'Please enter a subject.';
      if (v.length < 3 || v.length > 80) return 'The subject must be 3 to 80 characters long.';
      return '';
    },
    optionalNumber: function (v, el) {
      if (!v) return '';
      var max = Number(el.max || 1000);
      if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > max) return 'Enter a whole number from 1 to ' + max + '.';
      return '';
    },
    futureDate: function (v, el) {
      if (!v) return '';
      if (v < el.min) return 'Please choose today or a future date.';
      if (v > el.max) return 'Please choose a date within the next 12 months.';
      return '';
    },
    message: function (v, el) {
      var max = Number(el.getAttribute('maxlength') || 500);
      if (!v) return 'Please type your message.';
      if (v.length < 10) return 'Your message must be at least 10 characters (now ' + v.length + ').';
      if (v.length > max) return 'Your message must be ' + max + ' characters or fewer.';
      return '';
    },
    consent: function (v) {
      return v ? '' : 'Please tick the box so the centre may contact you.';
    }
  };

  /* ---------- Helpers ---------- */
  function iso(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function check(el) {
    var rule = rules[el.getAttribute('data-rule')];
    var value = el.type === 'checkbox' ? el.checked : el.value.trim();
    var msg = rule(value, el);
    var err = document.getElementById('err-' + el.id);
    if (err) err.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    el.classList.toggle('invalid', !!msg);
    return !msg;
  }

  function clearErrors(form) {
    form.querySelectorAll('.error').forEach(function (e) { e.textContent = ''; });
    form.querySelectorAll('[data-rule]').forEach(function (el) {
      el.removeAttribute('aria-invalid');
      el.classList.remove('invalid');
    });
    var count = form.querySelector('#msg-count');
    if (count) count.textContent = '0 / 500';
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
    return data;
  }

  function line(tag, text, cls) {
    var el = document.createElement(tag);
    el.textContent = text;           // textContent keeps user input safe (no HTML injection)
    if (cls) el.className = cls;
    return el;
  }

  /* Shows the result panel and hides the form */
  function showResult(form, title, lines, extra) {
    var box = document.getElementById('form-result');
    box.textContent = '';
    box.appendChild(line('h2', title));
    lines.forEach(function (t) { box.appendChild(line('p', t)); });
    if (extra) box.appendChild(extra);

    var again = line('button', 'Submit another message', 'btn secondary');
    again.type = 'button';
    again.addEventListener('click', function () {
      box.hidden = true;
      form.hidden = false;
      form.reset();
      form.querySelector('[data-rule]').focus();
    });
    box.appendChild(again);

    form.hidden = true;
    box.hidden = false;
    box.setAttribute('tabindex', '-1');
    box.focus();
  }

  /* ---------- Wires validation to a form ---------- */
  function setup(form, handler) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('[data-rule]'));

    fields.forEach(function (el) {
      if (el.type === 'date') {                       // earliest = today, latest = 1 year ahead
        var now = new Date(), later = new Date();
        later.setFullYear(now.getFullYear() + 1);
        el.min = iso(now);
        el.max = iso(later);
      }
      el.addEventListener('blur', function () { check(el); });
      el.addEventListener('change', function () { check(el); });
      el.addEventListener('input', function () {      // clear the error as soon as it is fixed
        if (el.getAttribute('aria-invalid') === 'true') check(el);
      });
    });

    var msg = form.querySelector('textarea');         // live character counter
    var count = form.querySelector('#msg-count');
    if (msg && count) {
      msg.addEventListener('input', function () {
        count.textContent = msg.value.length + ' / ' + (msg.getAttribute('maxlength') || 500);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (el) {
        if (!check(el) && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }     // stop and show the errors
      handler(form, collect(form));
    });

    form.addEventListener('reset', function () { clearErrors(form); });
  }

  /* ==========================================================
     ENQUIRY FORM: AJAX + response about cost / availability
     ========================================================== */
  function enquiryLines(d) {
    var qty = d.quantity ? Number(d.quantity) : 0;
    var what = d.item || 'your offer';
    var closedDay = false;
    if (d.date) {
      var weekday = new Date(d.date + 'T12:00:00').getDay();
      closedDay = CONFIG.openDays.indexOf(weekday) < 0;
    }
    var out = [];

    if (d.type === 'donation') {
      out.push('Cost: there is no cost to you. Donations of ' + what + (qty ? ' (quantity: ' + qty + ')' : '') + ' are welcome.');
      out.push('Drop-off: ' + CONFIG.address + '. Open ' + CONFIG.hours + '.');
      out.push(closedDay
        ? 'Your preferred date falls outside our opening days, so we will call you to arrange another time.'
        : 'For large donations please call ' + CONFIG.phone + ' before you come.');
    } else if (d.type === 'volunteer') {
      out.push('Availability: volunteers are welcome ' + CONFIG.hours + '.');
      out.push(qty
        ? 'You offered about ' + qty + ' hour(s) per week. A coordinator will confirm a suitable role with you.'
        : 'A coordinator will contact you to discuss roles and hours.');
      out.push('Cost: there is no cost to volunteer.');
      if (closedDay) out.push('Your preferred start date is outside our opening days, so we will suggest the nearest suitable day.');
    } else if (d.type === 'sponsor') {
      var months = qty || 1;
      out.push('Estimated cost: R' + CONFIG.sponsorPerMonth + ' per month x ' + months + ' month(s) = R' + (CONFIG.sponsorPerMonth * months) + '.');
      out.push('This is an estimate. The centre will confirm the final amount and payment details with you.');
    } else {
      out.push('Availability: our services run ' + CONFIG.hours + ' at ' + CONFIG.address + '.');
      out.push(closedDay
        ? 'Your preferred date is outside our opening days, so please choose a weekday or call ' + CONFIG.phone + '.'
        : 'For fees and eligibility please call ' + CONFIG.phone + ' or reply to the email we send you.');
    }
    return out;
  }

  function onEnquiry(form, d) {
    if (d.website) { return; }                        // honeypot filled in: it was a bot, ignore quietly

    var btn = form.querySelector('button[type="submit"]');
    var label = btn.textContent;
    var fail = document.getElementById('form-fail');
    fail.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    var action = form.getAttribute('action') || '';
    var live = /^https?:\/\//.test(action) && action.indexOf('YOUR_FORM_ID') === -1;
    var send = live
      ? fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error('Server replied ' + r.status); })
      : Promise.resolve();                            // no endpoint set yet: still show the response (demo mode)

    send.then(function () {
      var ref = 'KB-' + Date.now().toString(36).toUpperCase();
      var lines = enquiryLines(d);
      lines.push('Your reference number is ' + ref + '. We will reply to ' + d.email + '.');
      showResult(form, 'Thank you, ' + d.name.split(' ')[0] + '!', lines);
    }).catch(function () {
      fail.hidden = false;                            // AJAX error handling
      fail.focus();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  }

  /* ==========================================================
     CONTACT FORM: compile an email the visitor can send
     ========================================================== */
  function onContact(form, d) {
    var subject = '[' + d.type + '] ' + d.subject;
    var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nPhone: ' + d.phone +
               '\nMessage type: ' + d.type + '\n\nMessage:\n' + d.message;
    var href = 'mailto:' + CONFIG.recipient +
               '?subject=' + encodeURIComponent(subject) +
               '&body=' + encodeURIComponent(body);

    var wrap = document.createElement('div');
    wrap.appendChild(line('p', 'To: ' + CONFIG.recipient));
    wrap.appendChild(line('p', 'Subject: ' + subject));
    wrap.appendChild(line('pre', body, 'email-preview'));
    var send = line('a', 'Open in my email app', 'btn');
    send.href = href;
    wrap.appendChild(send);

    showResult(form, 'Your email is ready',
      ['Check the message below, then press the button to send it from your own email app.'], wrap);
  }

  /* ---------- Start ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var enquiry = document.getElementById('enquiry-form');
    var contact = document.getElementById('contact-form');
    if (enquiry) setup(enquiry, onEnquiry);
    if (contact) setup(contact, onContact);
  });
})();
