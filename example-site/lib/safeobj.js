/*
 * https://github.com/krues8dr/SafeObj
 */

function SafeObj(val) {
  this.value = val;

  this.get = function() {
    let args = [];
    for (let i = 0; i < arguments.length; i++) {
      let elm = arguments[i];

      if(typeof elm =='string' && elm.indexOf('.') > -1) {
        args = args.concat(elm.split('.'));
      }
      else {
        args.push(elm);
      }
    }

    return this._reducer(this.value, args);
  }

  this._reducer = function(acc, arr, idx) {
    if(typeof idx == 'undefined') { idx = 0; }

    // If we're done, we're done.
    if(idx >= arr.length) {
      return acc;
    }

    // If we can't start, we're also done.
    if(typeof acc == "undefined" || acc === null) {
      return null;
    }

    let child = arr[idx];

    if(typeof child == 'string') {
      // Array syntax [a,b] or [*]
      if(/^\[(.*?)\]$/.test(child)) {
        let mtch = child.slice(1,-1);
        if(mtch == '*') {
          child = Object.keys(acc);
        }
        else {
          child = mtch.split(/, ?/)
        }
      }
      // Object syntax {a,b} or {*}
      else if(/^\{(.*?)\}$/.test(child)) {
        let mtch = child.slice(1,-1);
        let keys = []
        if(mtch == '*') {
          keys = Object.keys(acc);
        }
        else {
          keys = mtch.split(/, ?/)
        }

        child = {};
        keys.forEach( function(elm) {
          child[elm] = null;
        });
      }
    }

    idx += 1;

    if(Array.isArray(child)) {
      return child.map(function(elm) {
        return this._reducer(acc[elm], arr, idx);
      }.bind(this));
    }
    if(typeof child == 'object') {
      let result = {};
      Object.keys(child).forEach(function(elm) {
        result[elm] = this._reducer(acc[elm], arr, idx);
      }.bind(this));
      return result;
    }
    else {
      return this._reducer(acc[child], arr, idx);
    }
  }

  this.sum = function() {
    let values = this.get.apply(this, arguments);

    if(Array.isArray(values)) {
      return values.reduce(function(acc, val) {
        if(typeof acc == 'undefined' || acc == null) {
          return val;
        }
        else if(typeof val == 'undefined' || val == null) {
          return acc;
        }
        else {
          return acc+val;
        }
      });
    }
    else {
      return values;
    }
  }
}
