(function () {
  'use strict';

  var TOTAL = 30;

  /* ---------- question generation ---------- */

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randDigits(d) {
    return rand(Math.pow(10, d - 1), Math.pow(10, d) - 1);
  }

  function digitsReversed(n) {
    return String(n).split('').reverse().map(Number);
  }

  // number of carries when adding a + b
  function countCarries(a, b) {
    var x = digitsReversed(a), y = digitsReversed(b);
    var len = Math.max(x.length, y.length), carry = 0, n = 0;
    for (var i = 0; i < len; i++) {
      var s = (x[i] || 0) + (y[i] || 0) + carry;
      carry = s >= 10 ? 1 : 0;
      n += carry;
    }
    return n;
  }

  // number of borrows when subtracting b from a (a > b)
  function countBorrows(a, b) {
    var x = digitsReversed(a), y = digitsReversed(b);
    var borrow = 0, n = 0;
    for (var i = 0; i < x.length; i++) {
      var d = x[i] - borrow - (y[i] || 0);
      borrow = d < 0 ? 1 : 0;
      n += borrow;
    }
    return n;
  }

  // Moderate-to-hard: force several carries / borrows, and avoid
  // easy second numbers ending in 0.
  function makeQuestion(mode, d1, d2) {
    var need, a, b, t;

    // 100 - (2-digit number): both digits non-zero and the ones digit
    // not 5, so it always needs a borrow and is not a "friendly" number.
    if (mode === 'hundred') {
      do {
        b = rand(11, 89);
      } while (b % 10 === 0 || b % 5 === 0);
      return build('sub', 100, b);
    }

    // Multiplication: every digit is 2-9 (no 0s or 1s), so there is
    // always real carrying work.
    if (mode === 'mul') {
      return build('mul', randHardNumber(d1), randHardNumber(d2));
    }

    if (mode === 'add') {
      need = Math.max(2, Math.min(d1, d2) - 1);
    } else {
      need = Math.max(2, d2 - 1);
      need = Math.min(need, d1 === d2 ? d2 - 1 : d2);
    }

    for (t = 0; t < 4000; t++) {
      a = randDigits(d1);
      b = randDigits(d2);
      if (b % 10 === 0) continue;
      if (mode === 'sub') {
        if (a <= b) continue;
        if (countBorrows(a, b) < need) continue;
      } else if (countCarries(a, b) < need) {
        continue;
      }
      return build(mode, a, b);
    }

    // fallback (should almost never be needed)
    do {
      a = randDigits(d1);
      b = randDigits(d2);
    } while (mode === 'sub' && a <= b);
    return build(mode, a, b);
  }

  function randHardNumber(d) {
    var s = '';
    for (var i = 0; i < d; i++) s += rand(2, 9);
    return Number(s);
  }

  function build(mode, a, b) {
    var op = mode === 'add' ? '+' : mode === 'mul' ? '\u00d7' : '\u2212';
    return {
      a: a,
      b: b,
      op: op,
      answer: mode === 'add' ? a + b : mode === 'mul' ? a * b : a - b
    };
  }

  function makeSet(mode, d1, d2) {
    var list = [], seen = {}, q, key, guard = 0;
    while (list.length < TOTAL) {
      q = makeQuestion(mode, d1, d2);
      key = q.a + q.op + q.b;
      if (seen[key] && guard++ < 200) continue;
      seen[key] = true;
      list.push(q);
    }
    return list;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      makeQuestion: makeQuestion,
      makeSet: makeSet,
      countCarries: countCarries,
      countBorrows: countBorrows
    };
  }

  if (typeof document === 'undefined') return;

  /* ---------- UI ---------- */

  var modeEl = document.getElementById('mode');
  var d1El = document.getElementById('d1');
  var d2El = document.getElementById('d2');
  var gridEl = document.getElementById('questions');
  var progressEl = document.getElementById('progress');
  var submitEl = document.getElementById('submit');
  var newSetEl = document.getElementById('newSet');
  var modalEl = document.getElementById('modal');
  var scoreEl = document.getElementById('score');
  var detailEl = document.getElementById('detail');
  var againEl = document.getElementById('again');

  var questions = [];
  var inputs = [];

  // In subtraction the 2nd number can't have more digits than the 1st
  function syncDigitOptions() {
    var isSub = modeEl.value === 'sub';
    var isHundred = modeEl.value === 'hundred';
    d1El.disabled = isHundred;
    d2El.disabled = isHundred;
    var first = Number(d1El.value);
    Array.prototype.forEach.call(d2El.options, function (opt) {
      opt.disabled = isSub && Number(opt.value) > first;
    });
    if (isSub && Number(d2El.value) > first) d2El.value = String(first);
  }

  function updateProgress() {
    var n = 0;
    inputs.forEach(function (inp) {
      if (inp.value.trim() !== '') n++;
    });
    progressEl.textContent = 'Answered ' + n + '/' + TOTAL;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function generate() {
    syncDigitOptions();
    questions = makeSet(modeEl.value, Number(d1El.value), Number(d2El.value));
    inputs = [];
    gridEl.innerHTML = '';

    questions.forEach(function (q, i) {
      var card = el('div', 'card');
      card.appendChild(el('span', 'no', String(i + 1)));

      var stack = el('div', 'stack');
      var r1 = el('div', 'row');
      r1.appendChild(el('span', 'num', String(q.a)));
      var r2 = el('div', 'row');
      r2.appendChild(el('span', 'op', q.op));
      r2.appendChild(el('span', 'num', String(q.b)));
      stack.appendChild(r1);
      stack.appendChild(r2);
      stack.appendChild(el('div', 'rule'));
      card.appendChild(stack);

      var inp = document.createElement('input');
      inp.type = 'text';
      inp.setAttribute('inputmode', 'numeric');
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('autocorrect', 'off');
      inp.setAttribute('enterkeyhint', i === TOTAL - 1 ? 'done' : 'next');
      inp.setAttribute('aria-label', 'Answer for question ' + (i + 1));
      inp.addEventListener('input', updateProgress);
      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (i < TOTAL - 1) inputs[i + 1].focus();
        else {
          inp.blur();
          submitEl.focus();
        }
      });
      card.appendChild(inp);
      inputs.push(inp);
      gridEl.appendChild(card);
    });

    updateProgress();
    window.scrollTo(0, 0);
  }

  function submit() {
    var right = 0;
    questions.forEach(function (q, i) {
      var v = inputs[i].value.trim().replace('\u2212', '-');
      if (/^-?\d+$/.test(v) && Number(v) === q.answer) right++;
    });
    var wrong = TOTAL - right;
    scoreEl.textContent = right + '/' + TOTAL;
    detailEl.textContent = right + ' right, ' + wrong + ' wrong out of ' + TOTAL;
    modalEl.hidden = false;
  }

  modeEl.addEventListener('change', generate);
  d1El.addEventListener('change', generate);
  d2El.addEventListener('change', generate);
  newSetEl.addEventListener('click', generate);
  submitEl.addEventListener('click', submit);
  againEl.addEventListener('click', function () {
    modalEl.hidden = true;
    generate();
  });

  generate();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
