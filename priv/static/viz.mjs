// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label2) => label2 in fields ? fields[label2] : this[label2]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length4 = 0;
    while (current) {
      current = current.tail;
      length4++;
    }
    return length4 - 1;
  }
};
function prepend(element6, tail) {
  return new NonEmpty(element6, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index5) {
    if (index5 < 0 || index5 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index5);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a2 = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a2 !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a2 = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a2 >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index5) {
  if (bitOffset === 0) {
    return buffer[index5] ?? 0;
  } else {
    const a2 = buffer[index5] << bitOffset & 255;
    const b = buffer[index5 + 1] >> 8 - bitOffset;
    return a2 | b;
  }
}
var UtfCodepoint = class {
  constructor(value2) {
    this.value = value2;
  }
};
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name2, message) {
  if (isBitArrayDeprecationMessagePrinted[name2]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name2} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name2] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value2) {
    super();
    this[0] = value2;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a2 = values3.pop();
    let b = values3.pop();
    if (a2 === b) continue;
    if (!isObject(a2) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a2, b) || unequalDates(a2, b) || unequalBuffers(a2, b) || unequalArrays(a2, b) || unequalMaps(a2, b) || unequalSets(a2, b) || unequalRegExps(a2, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a2);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a2.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get3] = getters(a2);
    const ka = keys2(a2);
    const kb = keys2(b);
    if (ka.length !== kb.length) return false;
    for (let k of ka) {
      values3.push(get3(a2, k), get3(b, k));
    }
  }
  return true;
}
function getters(object4) {
  if (object4 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object4 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a2, b) {
  return a2 instanceof Date && (a2 > b || a2 < b);
}
function unequalBuffers(a2, b) {
  return !(a2 instanceof BitArray) && a2.buffer instanceof ArrayBuffer && a2.BYTES_PER_ELEMENT && !(a2.byteLength === b.byteLength && a2.every((n, i) => n === b[i]));
}
function unequalArrays(a2, b) {
  return Array.isArray(a2) && a2.length !== b.length;
}
function unequalMaps(a2, b) {
  return a2 instanceof Map && a2.size !== b.size;
}
function unequalSets(a2, b) {
  return a2 instanceof Set && (a2.size != b.size || [...a2].some((e) => !b.has(e)));
}
function unequalRegExps(a2, b) {
  return a2 instanceof RegExp && (a2.source !== b.source || a2.flags !== b.flags);
}
function isObject(a2) {
  return typeof a2 === "object" && a2 !== null;
}
function structurallyCompatibleObjects(a2, b) {
  if (typeof a2 !== "object" && typeof b !== "object" && (!a2 || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a2 instanceof c)) return false;
  return a2.constructor === b.constructor;
}
function makeError(variant, file, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.file = file;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var None = class extends CustomType {
};
function to_result(option2, e) {
  if (option2 instanceof Some) {
    let a2 = option2[0];
    return new Ok(a2);
  } else {
    return new Error(e);
  }
}
function unwrap(option2, default$) {
  if (option2 instanceof Some) {
    let x = option2[0];
    return x;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a2, b) {
  return a2 ^ b + 2654435769 + (a2 << 6) + (a2 >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes2 = new Array(32);
      const jdx = mask(hash, shift);
      nodes2[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes2[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes2
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function negate(x) {
  return -1 * x;
}
function round2(x) {
  let $ = x >= 0;
  if ($) {
    return round(x);
  } else {
    return 0 - round(negate(x));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function compare(a2, b) {
  let $ = a2 === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = a2 < b;
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}
function random(max2) {
  let _pipe = random_uniform() * identity(max2);
  let _pipe$1 = floor(_pipe);
  return round2(_pipe$1);
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function length_loop(loop$list, loop$count) {
  while (true) {
    let list4 = loop$list;
    let count = loop$count;
    if (list4 instanceof Empty) {
      return count;
    } else {
      let list$1 = list4.tail;
      loop$list = list$1;
      loop$count = count + 1;
    }
  }
}
function length(list4) {
  return length_loop(list4, 0);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix instanceof Empty) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function contains(loop$list, loop$elem) {
  while (true) {
    let list4 = loop$list;
    let elem = loop$elem;
    if (list4 instanceof Empty) {
      return false;
    } else {
      let first$1 = list4.head;
      if (isEqual(first$1, elem)) {
        return true;
      } else {
        let rest$1 = list4.tail;
        loop$list = rest$1;
        loop$elem = elem;
      }
    }
  }
}
function first(list4) {
  if (list4 instanceof Empty) {
    return new Error(void 0);
  } else {
    let first$1 = list4.head;
    return new Ok(first$1);
  }
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list4, predicate) {
  return filter_loop(list4, predicate, toList([]));
}
function filter_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let _block;
      let $ = fun(first$1);
      if ($ instanceof Ok) {
        let first$2 = $[0];
        _block = prepend(first$2, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter_map(list4, fun) {
  return filter_map_loop(list4, fun, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function map_fold_loop(loop$list, loop$fun, loop$acc, loop$list_acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    let list_acc = loop$list_acc;
    if (list4 instanceof Empty) {
      return [acc, reverse(list_acc)];
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = fun(acc, first$1);
      let acc$1;
      let first$2;
      acc$1 = $[0];
      first$2 = $[1];
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = acc$1;
      loop$list_acc = prepend(first$2, list_acc);
    }
  }
}
function map_fold(list4, initial, fun) {
  return map_fold_loop(list4, fun, initial, toList([]));
}
function index_map_loop(loop$list, loop$fun, loop$index, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let index5 = loop$index;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let acc$1 = prepend(fun(first$1, index5), acc);
      loop$list = rest$1;
      loop$fun = fun;
      loop$index = index5 + 1;
      loop$acc = acc$1;
    }
  }
}
function index_map(list4, fun) {
  return index_map_loop(list4, fun, 0, toList([]));
}
function take_loop(loop$list, loop$n, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let n = loop$n;
    let acc = loop$acc;
    let $ = n <= 0;
    if ($) {
      return reverse(acc);
    } else {
      if (list4 instanceof Empty) {
        return reverse(acc);
      } else {
        let first$1 = list4.head;
        let rest$1 = list4.tail;
        loop$list = rest$1;
        loop$n = n - 1;
        loop$acc = prepend(first$1, acc);
      }
    }
  }
}
function take(list4, n) {
  return take_loop(list4, n, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2 instanceof Empty) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function flatten_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists instanceof Empty) {
      return reverse(acc);
    } else {
      let list4 = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list4, acc);
    }
  }
}
function flatten(lists) {
  return flatten_loop(lists, toList([]));
}
function flat_map(list4, fun) {
  return flatten(map(list4, fun));
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4 instanceof Empty) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function find2(loop$list, loop$is_desired) {
  while (true) {
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4 instanceof Empty) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function find_map(loop$list, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    if (list4 instanceof Empty) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = fun(first$1);
      if ($ instanceof Ok) {
        return $;
      } else {
        loop$list = rest$1;
        loop$fun = fun;
      }
    }
  }
}
function unique_loop(loop$list, loop$seen, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let seen = loop$seen;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = has_key(seen, first$1);
      if ($) {
        loop$list = rest$1;
        loop$seen = seen;
        loop$acc = acc;
      } else {
        loop$list = rest$1;
        loop$seen = insert(seen, first$1, void 0);
        loop$acc = prepend(first$1, acc);
      }
    }
  }
}
function unique(list4) {
  return unique_loop(list4, new_map(), toList([]));
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare5 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4 instanceof Empty) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare5(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare5;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare5;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else {
          let _block;
          if (direction instanceof Ascending) {
            _block = prepend(reverse(growing$1), acc);
          } else {
            _block = prepend(growing$1, acc);
          }
          let acc$1 = _block;
          if (rest$1 instanceof Empty) {
            return prepend(toList([new$1]), acc$1);
          } else {
            let next = rest$1.head;
            let rest$2 = rest$1.tail;
            let _block$1;
            let $1 = compare5(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = new Ascending();
            } else if ($1 instanceof Eq) {
              _block$1 = new Ascending();
            } else {
              _block$1 = new Descending();
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare5;
            loop$growing = toList([new$1]);
            loop$direction = direction$1;
            loop$prev = next;
            loop$acc = acc$1;
          }
        }
      } else if ($ instanceof Lt) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Eq) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let ascending1 = sequences2.head;
        let ascending2 = $.head;
        let rest$1 = $.tail;
        let descending = merge_ascendings(
          ascending1,
          ascending2,
          compare5,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare5;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let descending1 = sequences2.head;
        let descending2 = $.head;
        let rest$1 = $.tail;
        let ascending = merge_descendings(
          descending1,
          descending2,
          compare5,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare5;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare5 = loop$compare;
    if (sequences2 instanceof Empty) {
      return sequences2;
    } else if (direction instanceof Ascending) {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences2, compare5, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Descending();
        loop$compare = compare5;
      }
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences2, compare5, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Ascending();
        loop$compare = compare5;
      }
    }
  }
}
function sort(list4, compare5) {
  if (list4 instanceof Empty) {
    return list4;
  } else {
    let $ = list4.tail;
    if ($ instanceof Empty) {
      return list4;
    } else {
      let x = list4.head;
      let y = $.head;
      let rest$1 = $.tail;
      let _block;
      let $1 = compare5(x, y);
      if ($1 instanceof Lt) {
        _block = new Ascending();
      } else if ($1 instanceof Eq) {
        _block = new Ascending();
      } else {
        _block = new Descending();
      }
      let direction = _block;
      let sequences$1 = sequences(
        rest$1,
        compare5,
        toList([x]),
        direction,
        y,
        toList([])
      );
      return merge_all(sequences$1, new Ascending(), compare5);
    }
  }
}
function range_loop(loop$start, loop$stop, loop$acc) {
  while (true) {
    let start4 = loop$start;
    let stop = loop$stop;
    let acc = loop$acc;
    let $ = compare(start4, stop);
    if ($ instanceof Lt) {
      loop$start = start4;
      loop$stop = stop - 1;
      loop$acc = prepend(stop, acc);
    } else if ($ instanceof Eq) {
      return prepend(stop, acc);
    } else {
      loop$start = start4;
      loop$stop = stop + 1;
      loop$acc = prepend(stop, acc);
    }
  }
}
function range(start4, stop) {
  return range_loop(start4, stop, toList([]));
}
function key_find(keyword_list, desired_key) {
  return find_map(
    keyword_list,
    (keyword) => {
      let key;
      let value2;
      key = keyword[0];
      value2 = keyword[1];
      let $ = isEqual(key, desired_key);
      if ($) {
        return new Ok(value2);
      } else {
        return new Error(void 0);
      }
    }
  );
}
function key_filter(keyword_list, desired_key) {
  return filter_map(
    keyword_list,
    (keyword) => {
      let key;
      let value2;
      key = keyword[0];
      value2 = keyword[1];
      let $ = isEqual(key, desired_key);
      if ($) {
        return new Ok(value2);
      } else {
        return new Error(void 0);
      }
    }
  );
}
function each(loop$list, loop$f) {
  while (true) {
    let list4 = loop$list;
    let f = loop$f;
    if (list4 instanceof Empty) {
      return void 0;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      f(first$1);
      loop$list = rest$1;
      loop$f = f;
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function compare3(a2, b) {
  let $ = a2 === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = less_than(a2, b);
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}
function append2(first2, second) {
  return first2 + second;
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string5;
    }
  }
}
function join(strings, separator) {
  if (strings instanceof Empty) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}
function split2(x, substring) {
  if (substring === "") {
    return graphemes(x);
  } else {
    let _pipe = x;
    let _pipe$1 = identity(_pipe);
    let _pipe$2 = split(_pipe$1, substring);
    return map(_pipe$2, identity);
  }
}
function capitalise(string5) {
  let $ = pop_grapheme(string5);
  if ($ instanceof Ok) {
    let first$1 = $[0][0];
    let rest = $[0][1];
    return append2(uppercase(first$1), lowercase(rest));
  } else {
    return "";
  }
}
function inspect2(term) {
  let _pipe = inspect(term);
  return identity(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path2) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path2;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data;
  let errors;
  maybe_invalid_data = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map2(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data;
      let errors;
      data = $[0];
      errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders instanceof Empty) {
      return failure2;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure2;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first2, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first2.function(dynamic_data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
function decode_error(expected, found) {
  return toList([
    new DecodeError(expected, classify_dynamic(found), toList([]))
  ]);
}
function run_dynamic_function(data, name2, f) {
  let $ = f(data);
  if ($ instanceof Ok) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError(name2, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_bool(data) {
  let $ = isEqual(identity(true), data);
  if ($) {
    return [true, toList([])];
  } else {
    let $1 = isEqual(identity(false), data);
    if ($1) {
      return [false, toList([])];
    } else {
      return [false, decode_error("Bool", data)];
    }
  }
}
function decode_int(data) {
  return run_dynamic_function(data, "Int", int);
}
function decode_float(data) {
  return run_dynamic_function(data, "Float", float);
}
function failure(zero, expected) {
  return new Decoder((d) => {
    return [zero, decode_error(expected, d)];
  });
}
var bool = /* @__PURE__ */ new Decoder(decode_bool);
var int2 = /* @__PURE__ */ new Decoder(decode_int);
var float2 = /* @__PURE__ */ new Decoder(decode_float);
function decode_string(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function list2(inner) {
  return new Decoder(
    (data) => {
      return list(
        data,
        inner.function,
        (p2, k) => {
          return push_path(p2, toList([k]));
        },
        0,
        toList([])
      );
    }
  );
}
function push_path(layer, path2) {
  let decoder = one_of(
    string2,
    toList([
      (() => {
        let _pipe = int2;
        return map2(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map(
    path2,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($ instanceof Ok) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map(
    layer[1],
    (error) => {
      return new DecodeError(
        error.expected,
        error.found,
        append(path$1, error.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path2 = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path2 instanceof Empty) {
      let _pipe = inner(data);
      return push_path(_pipe, reverse(position));
    } else {
      let key = path2.head;
      let path$1 = path2.tail;
      let $ = index2(data, key);
      if ($ instanceof Ok) {
        let $1 = $[0];
        if ($1 instanceof Some) {
          let data$1 = $1[0];
          loop$path = path$1;
          loop$position = prepend(key, position);
          loop$inner = inner;
          loop$data = data$1;
          loop$handle_miss = handle_miss;
        } else {
          return handle_miss(data, prepend(key, position));
        }
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$;
        default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$;
          default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
      let out;
      let errors1;
      out = $[0];
      errors1 = $[1];
      let $1 = next(out).function(data);
      let out$1;
      let errors2;
      out$1 = $1[0];
      errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}
function field(field_name, field_decoder, next) {
  return subfield(toList([field_name]), field_decoder, next);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function parse_int(value2) {
  if (/^[-+]?(\d+)$/.test(value2)) {
    return new Ok(parseInt(value2));
  } else {
    return new Error(Nil);
  }
}
function parse_float(value2) {
  if (/^[-+]?(\d+)\.(\d+)([eE][-+]?\d+)?$/.test(value2)) {
    return new Ok(parseFloat(value2));
  } else {
    return new Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function graphemes(string5) {
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    return List.fromArray(Array.from(iterator).map((item) => item.segment));
  } else {
    return List.fromArray(string5.match(/./gsu));
  }
}
var segmenter = void 0;
function graphemes_iterator(string5) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string5)[Symbol.iterator]();
  }
}
function pop_grapheme(string5) {
  let first2;
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string5.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string5.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
}
function pop_codeunit(str) {
  return [str.charCodeAt(0) | 0, str.slice(1)];
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function uppercase(string5) {
  return string5.toUpperCase();
}
function less_than(a2, b) {
  return a2 < b;
}
function split(xs, pattern) {
  return List.fromArray(xs.split(pattern));
}
function string_codeunit_slice(str, from2, length4) {
  return str.slice(from2, from2 + length4);
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function console_log(term) {
  console.log(term);
}
function floor(float4) {
  return Math.floor(float4);
}
function round(float4) {
  return Math.round(float4);
}
function random_uniform() {
  const random_uniform_result = Math.random();
  if (random_uniform_result === 1) {
    return random_uniform();
  }
  return random_uniform_result;
}
function new_map() {
  return Dict.new();
}
function map_get(map6, key) {
  const value2 = map6.get(key, NOT_FOUND);
  if (value2 === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value2);
}
function map_insert(key, value2, map6) {
  return map6.set(key, value2);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Array`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Nil";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function inspect(v) {
  return new Inspector().inspect(v);
}
function float_to_string(float4) {
  const string5 = float4.toString().replace("+", "");
  if (string5.indexOf(".") >= 0) {
    return string5;
  } else {
    const index5 = string5.indexOf("e");
    if (index5 >= 0) {
      return string5.slice(0, index5) + ".0" + string5.slice(index5);
    } else {
      return string5 + ".0";
    }
  }
}
var Inspector = class {
  #references = /* @__PURE__ */ new Set();
  inspect(v) {
    const t = typeof v;
    if (v === true) return "True";
    if (v === false) return "False";
    if (v === null) return "//js(null)";
    if (v === void 0) return "Nil";
    if (t === "string") return this.#string(v);
    if (t === "bigint" || Number.isInteger(v)) return v.toString();
    if (t === "number") return float_to_string(v);
    if (v instanceof UtfCodepoint) return this.#utfCodepoint(v);
    if (v instanceof BitArray) return this.#bit_array(v);
    if (v instanceof RegExp) return `//js(${v})`;
    if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
    if (v instanceof globalThis.Error) return `//js(${v.toString()})`;
    if (v instanceof Function) {
      const args = [];
      for (const i of Array(v.length).keys())
        args.push(String.fromCharCode(i + 97));
      return `//fn(${args.join(", ")}) { ... }`;
    }
    if (this.#references.size === this.#references.add(v).size) {
      return "//js(circular reference)";
    }
    let printed;
    if (Array.isArray(v)) {
      printed = `#(${v.map((v2) => this.inspect(v2)).join(", ")})`;
    } else if (v instanceof List) {
      printed = this.#list(v);
    } else if (v instanceof CustomType) {
      printed = this.#customType(v);
    } else if (v instanceof Dict) {
      printed = this.#dict(v);
    } else if (v instanceof Set) {
      return `//js(Set(${[...v].map((v2) => this.inspect(v2)).join(", ")}))`;
    } else {
      printed = this.#object(v);
    }
    this.#references.delete(v);
    return printed;
  }
  #object(v) {
    const name2 = Object.getPrototypeOf(v)?.constructor?.name || "Object";
    const props = [];
    for (const k of Object.keys(v)) {
      props.push(`${this.inspect(k)}: ${this.inspect(v[k])}`);
    }
    const body = props.length ? " " + props.join(", ") + " " : "";
    const head = name2 === "Object" ? "" : name2 + " ";
    return `//js(${head}{${body}})`;
  }
  #dict(map6) {
    let body = "dict.from_list([";
    let first2 = true;
    map6.forEach((value2, key) => {
      if (!first2) body = body + ", ";
      body = body + "#(" + this.inspect(key) + ", " + this.inspect(value2) + ")";
      first2 = false;
    });
    return body + "])";
  }
  #customType(record) {
    const props = Object.keys(record).map((label2) => {
      const value2 = this.inspect(record[label2]);
      return isNaN(parseInt(label2)) ? `${label2}: ${value2}` : value2;
    }).join(", ");
    return props ? `${record.constructor.name}(${props})` : record.constructor.name;
  }
  #list(list4) {
    if (list4 instanceof Empty) {
      return "[]";
    }
    let char_out = 'charlist.from_string("';
    let list_out = "[";
    let current = list4;
    while (current instanceof NonEmpty) {
      let element6 = current.head;
      current = current.tail;
      if (list_out !== "[") {
        list_out += ", ";
      }
      list_out += this.inspect(element6);
      if (char_out) {
        if (Number.isInteger(element6) && element6 >= 32 && element6 <= 126) {
          char_out += String.fromCharCode(element6);
        } else {
          char_out = null;
        }
      }
    }
    if (char_out) {
      return char_out + '")';
    } else {
      return list_out + "]";
    }
  }
  #string(str) {
    let new_str = '"';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      switch (char) {
        case "\n":
          new_str += "\\n";
          break;
        case "\r":
          new_str += "\\r";
          break;
        case "	":
          new_str += "\\t";
          break;
        case "\f":
          new_str += "\\f";
          break;
        case "\\":
          new_str += "\\\\";
          break;
        case '"':
          new_str += '\\"';
          break;
        default:
          if (char < " " || char > "~" && char < "\xA0") {
            new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
          } else {
            new_str += char;
          }
      }
    }
    new_str += '"';
    return new_str;
  }
  #utfCodepoint(codepoint2) {
    return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
  }
  #bit_array(bits) {
    if (bits.bitSize === 0) {
      return "<<>>";
    }
    let acc = "<<";
    for (let i = 0; i < bits.byteSize - 1; i++) {
      acc += bits.byteAt(i).toString();
      acc += ", ";
    }
    if (bits.byteSize * 8 === bits.bitSize) {
      acc += bits.byteAt(bits.byteSize - 1).toString();
    } else {
      const trailingBitsCount = bits.bitSize % 8;
      acc += bits.byteAt(bits.byteSize - 1) >> 8 - trailingBitsCount;
      acc += `:size(${trailingBitsCount})`;
    }
    acc += ">>";
    return acc;
  }
};
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token = {};
    const entry = data.get(key, token);
    if (entry === token) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value2 of data) {
      if (i === key) return new Ok(new Some(value2));
      i++;
    }
    return new Error("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error(key_is_int ? "Indexable" : "Dict");
}
function list(data, decode2, pushPath, index5, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError("List", classify_dynamic(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }
  const decoded = [];
  for (const element6 of data) {
    const layer = decode2(element6);
    const [out, errors] = layer;
    if (errors instanceof NonEmpty) {
      const [_, errors2] = pushPath(layer, index5.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index5++;
  }
  return [List.fromArray(decoded), emptyList];
}
function float(data) {
  if (typeof data === "number") return new Ok(data);
  return new Error(0);
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function do_has_key(key, dict3) {
  return !isEqual(map_get(dict3, key), new Error(void 0));
}
function has_key(dict3, key) {
  return do_has_key(key, dict3);
}
function insert(dict3, key, value2) {
  return map_insert(key, value2, dict3);
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map3(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    return result;
  }
}
function map_error(result, fun) {
  if (result instanceof Ok) {
    return result;
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return fun(x);
  } else {
    return result;
  }
}
function then$(result, fun) {
  return try$(result, fun);
}
function unwrap2(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function values2(results) {
  return filter_map(results, (result) => {
    return result;
  });
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function json_to_string(json2) {
  return JSON.stringify(json2);
}
function object(entries) {
  return Object.fromEntries(entries);
}
function identity3(x) {
  return x;
}
function array(list4) {
  return list4.toArray();
}
function decode(string5) {
  try {
    const result = JSON.parse(string5);
    return new Ok(result);
  } catch (err) {
    return new Error(getJsonDecodeError(err, string5));
  }
}
function getJsonDecodeError(stdErr, json2) {
  if (isUnexpectedEndOfInput(stdErr)) return new UnexpectedEndOfInput();
  return toUnexpectedByteError(stdErr, json2);
}
function isUnexpectedEndOfInput(err) {
  const unexpectedEndOfInputRegex = /((unexpected (end|eof))|(end of data)|(unterminated string)|(json( parse error|\.parse)\: expected '(\:|\}|\])'))/i;
  return unexpectedEndOfInputRegex.test(err.message);
}
function toUnexpectedByteError(err, json2) {
  let converters = [
    v8UnexpectedByteError,
    oldV8UnexpectedByteError,
    jsCoreUnexpectedByteError,
    spidermonkeyUnexpectedByteError
  ];
  for (let converter of converters) {
    let result = converter(err, json2);
    if (result) return result;
  }
  return new UnexpectedByte("", 0);
}
function v8UnexpectedByteError(err) {
  const regex = /unexpected token '(.)', ".+" is not valid JSON/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  return new UnexpectedByte(byte, -1);
}
function oldV8UnexpectedByteError(err) {
  const regex = /unexpected token (.) in JSON at position (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  const position = Number(match[2]);
  return new UnexpectedByte(byte, position);
}
function spidermonkeyUnexpectedByteError(err, json2) {
  const regex = /(unexpected character|expected .*) at line (\d+) column (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const line = Number(match[2]);
  const column = Number(match[3]);
  const position = getPositionFromMultiline(line, column, json2);
  const byte = toHex(json2[position]);
  return new UnexpectedByte(byte, position);
}
function jsCoreUnexpectedByteError(err) {
  const regex = /unexpected (identifier|token) "(.)"/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[2]);
  return new UnexpectedByte(byte, 0);
}
function toHex(char) {
  return "0x" + char.charCodeAt(0).toString(16).toUpperCase();
}
function getPositionFromMultiline(line, column, string5) {
  if (line === 1) return column - 1;
  let currentLn = 1;
  let position = 0;
  string5.split("").find((char, idx) => {
    if (char === "\n") currentLn += 1;
    if (currentLn === line) {
      position = idx + column;
      return true;
    }
    return false;
  });
  return position;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
var UnexpectedEndOfInput = class extends CustomType {
};
var UnexpectedByte = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UnableToDecode = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
function do_parse(json2, decoder) {
  return try$(
    decode(json2),
    (dynamic_value) => {
      let _pipe = run(dynamic_value, decoder);
      return map_error(
        _pipe,
        (var0) => {
          return new UnableToDecode(var0);
        }
      );
    }
  );
}
function parse(json2, decoder) {
  return do_parse(json2, decoder);
}
function to_string2(json2) {
  return json_to_string(json2);
}
function string3(input2) {
  return identity3(input2);
}
function bool2(input2) {
  return identity3(input2);
}
function int3(input2) {
  return identity3(input2);
}
function float3(input2) {
  return identity3(input2);
}
function object2(entries) {
  return object(entries);
}
function preprocessed_array(from2) {
  return array(from2);
}
function array2(entries, inner_type) {
  let _pipe = entries;
  let _pipe$1 = map(_pipe, inner_type);
  return preprocessed_array(_pipe$1);
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var document2 = () => globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare4(a2, b) {
  if (a2.name === b.name) {
    return EQ;
  } else if (a2.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name2, value2) {
    super();
    this.kind = kind;
    this.name = name2;
    this.value = value2;
  }
};
var Property = class extends CustomType {
  constructor(kind, name2, value2) {
    super();
    this.kind = kind;
    this.name = name2;
    this.value = value2;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name2, handler, include, prevent_default3, stop_propagation, immediate, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name2;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default3;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate;
    this.debounce = debounce;
    this.throttle = throttle;
  }
};
var Handler = class extends CustomType {
  constructor(prevent_default3, stop_propagation, message) {
    super();
    this.prevent_default = prevent_default3;
    this.stop_propagation = stop_propagation;
    this.message = message;
  }
};
var Never = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
var Always = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes instanceof Empty) {
      return merged;
    } else {
      let $ = attributes.head;
      if ($ instanceof Attribute) {
        let $1 = $.name;
        if ($1 === "") {
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = merged;
        } else if ($1 === "class") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "class") {
                  let kind = $.kind;
                  let class1 = $2;
                  let rest = $3.tail;
                  let class2 = $4.value;
                  let value2 = class1 + " " + class2;
                  let attribute$1 = new Attribute(kind, "class", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else if ($1 === "style") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "style") {
                  let kind = $.kind;
                  let style1 = $2;
                  let rest = $3.tail;
                  let style2 = $4.value;
                  let value2 = style1 + ";" + style2;
                  let attribute$1 = new Attribute(kind, "style", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else {
          let attribute$1 = $;
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = prepend(attribute$1, merged);
        }
      } else {
        let attribute$1 = $;
        let rest = attributes.tail;
        loop$attributes = rest;
        loop$merged = prepend(attribute$1, merged);
      }
    }
  }
}
function prepare(attributes) {
  if (attributes instanceof Empty) {
    return attributes;
  } else {
    let $ = attributes.tail;
    if ($ instanceof Empty) {
      return attributes;
    } else {
      let _pipe = attributes;
      let _pipe$1 = sort(_pipe, (a2, b) => {
        return compare4(b, a2);
      });
      return merge(_pipe$1, empty_list);
    }
  }
}
var attribute_kind = 0;
function attribute(name2, value2) {
  return new Attribute(attribute_kind, name2, value2);
}
var property_kind = 1;
function property(name2, value2) {
  return new Property(property_kind, name2, value2);
}
var event_kind = 2;
function event(name2, handler, include, prevent_default3, stop_propagation, immediate, debounce, throttle) {
  return new Event2(
    event_kind,
    name2,
    handler,
    include,
    prevent_default3,
    stop_propagation,
    immediate,
    debounce,
    throttle
  );
}
var never_kind = 0;
var never = /* @__PURE__ */ new Never(never_kind);
var always_kind = 2;
var always = /* @__PURE__ */ new Always(always_kind);

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name2, value2) {
  return attribute(name2, value2);
}
function property2(name2, value2) {
  return property(name2, value2);
}
function boolean_attribute(name2, value2) {
  if (value2) {
    return attribute2(name2, "");
  } else {
    return property2(name2, bool2(false));
  }
}
function class$(name2) {
  return attribute2("class", name2);
}
function id(value2) {
  return attribute2("id", value2);
}
function title(text4) {
  return attribute2("title", text4);
}
function accept(values3) {
  return attribute2("accept", join(values3, ","));
}
function checked(is_checked) {
  return boolean_attribute("checked", is_checked);
}
function for$(id2) {
  return attribute2("for", id2);
}
function form(id2) {
  return attribute2("form", id2);
}
function name(element_name) {
  return attribute2("name", element_name);
}
function selected(is_selected) {
  return boolean_attribute("selected", is_selected);
}
function type_(control_type) {
  return attribute2("type", control_type);
}
function value(control_value) {
  return attribute2("value", control_value);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function from(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  return new Effect(toList([task]), empty.before_paint, empty.after_paint);
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get(map6, key) {
  const value2 = map6?.get(key);
  if (value2 != null) {
    return new Ok(value2);
  } else {
    return new Error(void 0);
  }
}
function has_key2(map6, key) {
  return map6 && map6.has(key);
}
function insert2(map6, key, value2) {
  map6 ??= /* @__PURE__ */ new Map();
  map6.set(key, value2);
  return map6;
}
function remove(map6, key) {
  map6?.delete(key);
  return map6;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index5, parent) {
    super();
    this.index = index5;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path2 = loop$path;
    let candidates = loop$candidates;
    if (candidates instanceof Empty) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path2, candidate);
      if ($) {
        return $;
      } else {
        loop$path = path2;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index5, key) {
  if (key === "") {
    return new Index(index5, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_element = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path2 = loop$path;
    let acc = loop$acc;
    if (path2 instanceof Root) {
      if (acc instanceof Empty) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path2 instanceof Key) {
      let key = path2.key;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(separator_element, prepend(key, acc));
    } else {
      let index5 = path2.index;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_element,
        prepend(to_string(index5), acc)
      );
    }
  }
}
function to_string3(path2) {
  return do_to_string(path2, toList([]));
}
function matches(path2, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string3(path2), candidates);
  }
}
var separator_event = "\n";
function event2(path2, event4) {
  return do_to_string(path2, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace2) {
  if (namespace2 === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function to_keyed(key, node) {
  if (node instanceof Fragment) {
    return new Fragment(
      node.kind,
      key,
      node.mapper,
      node.children,
      node.keyed_children
    );
  } else if (node instanceof Element) {
    return new Element(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.children,
      node.keyed_children,
      node.self_closing,
      node.void
    );
  } else if (node instanceof Text) {
    return new Text(node.kind, key, node.mapper, node.content);
  } else {
    return new UnsafeInnerHtml(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.inner_html
    );
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children) {
  return new Fragment(fragment_kind, key, mapper, children, keyed_children);
}
var element_kind = 1;
function element(key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace2,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace2)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;

// build/dev/javascript/lustre/lustre/internals/equals.ffi.mjs
var isReferenceEqual = (a2, b) => a2 === b;
var isEqual2 = (a2, b) => {
  if (a2 === b) {
    return true;
  }
  if (a2 == null || b == null) {
    return false;
  }
  const type = typeof a2;
  if (type !== typeof b) {
    return false;
  }
  if (type !== "object") {
    return false;
  }
  const ctor = a2.constructor;
  if (ctor !== b.constructor) {
    return false;
  }
  if (Array.isArray(a2)) {
    return areArraysEqual(a2, b);
  }
  return areObjectsEqual(a2, b);
};
var areArraysEqual = (a2, b) => {
  let index5 = a2.length;
  if (index5 !== b.length) {
    return false;
  }
  while (index5--) {
    if (!isEqual2(a2[index5], b[index5])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a2, b) => {
  const properties = Object.keys(a2);
  let index5 = properties.length;
  if (Object.keys(b).length !== index5) {
    return false;
  }
  while (index5--) {
    const property3 = properties[index5];
    if (!Object.hasOwn(b, property3)) {
      return false;
    }
    if (!isEqual2(a2[property3], b[property3])) {
      return false;
    }
  }
  return true;
};

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$3() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path2, name2) {
  return remove(handlers, event2(path2, name2));
}
function remove_event(events, path2, name2) {
  let handlers = do_remove_event(events.handlers, path2, name2);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function remove_attributes(handlers, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name2 = attribute3.name;
        return do_remove_event(events, path2, name2);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path2, name2, event4) {
  let next_dispatched_paths = prepend(path2, events.next_dispatched_paths);
  let events$1 = new Events(
    events.handlers,
    events.dispatched_paths,
    next_dispatched_paths
  );
  let $ = get(
    events$1.handlers,
    path2 + separator_event + name2
  );
  if ($ instanceof Ok) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path2) {
  return matches(path2, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path2, name2, handler) {
  return insert2(
    handlers,
    event2(path2, name2),
    map2(
      handler,
      (handler2) => {
        return new Handler(
          handler2.prevent_default,
          handler2.stop_propagation,
          identity2(mapper)(handler2.message)
        );
      }
    )
  );
}
function add_event(events, mapper, path2, name2, handler) {
  let handlers = do_add_event(events.handlers, mapper, path2, name2, handler);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name2 = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path2, name2, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = isReferenceEqual(mapper, identity2);
  let $1 = isReferenceEqual(child_mapper, identity2);
  if ($1) {
    return mapper;
  } else if ($) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path2;
      loop$child_index = child_index + 1;
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    return do_remove_children(handlers, path2, 0, children);
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path2, attributes);
    return do_remove_children(_pipe$1, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path2, attributes);
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path2;
      loop$child_index = child_index + 1;
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return do_add_children(handlers, composed_mapper, path2, 0, children);
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path2, attributes);
    return do_add_children(_pipe$1, composed_mapper, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path2, attributes);
  }
}
function add_child(events, mapper, parent, index5, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index5, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_children(events, mapper, path2, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path2,
    child_index,
    children
  );
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace2, tag, attributes, children) {
  return element(
    "",
    identity2,
    namespace2,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity2, content);
}
function none2() {
  return text("", identity2, "");
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function h1(attrs, children) {
  return element2("h1", attrs, children);
}
function nav(attrs, children) {
  return element2("nav", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function span(attrs, children) {
  return element2("span", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function form2(attrs, children) {
  return element2("form", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}
function label(attrs, children) {
  return element2("label", attrs, children);
}
function option(attrs, label2) {
  return element2("option", attrs, toList([text2(label2)]));
}
function select(attrs, children) {
  return element2("select", attrs, children);
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index5, removed, changes, children) {
    super();
    this.index = index5;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
  }
};
var Replace = class extends CustomType {
  constructor(kind, index5, with$) {
    super();
    this.kind = kind;
    this.index = index5;
    this.with = with$;
  }
};
var Remove = class extends CustomType {
  constructor(kind, index5) {
    super();
    this.kind = kind;
    this.index = index5;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
function new$5(index5, removed, changes, children) {
  return new Patch(index5, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before) {
  return new Move(move_kind, key, before);
}
var remove_kind = 4;
function remove2(index5) {
  return new Remove(remove_kind, index5);
}
var replace_kind = 5;
function replace2(index5, with$) {
  return new Replace(replace_kind, index5, with$);
}
var insert_kind = 6;
function insert3(children, before) {
  return new Insert(insert_kind, children, before);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace2, tag, path2) {
  if (tag === "input" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "select" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "textarea" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path2 = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$9 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (new$9 instanceof Empty) {
      if (old instanceof Empty) {
        return new AttributeChange(added, removed, events);
      } else {
        let $ = old.head;
        if ($ instanceof Event2) {
          let prev = $;
          let old$1 = old.tail;
          let name2 = $.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name2);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = old$1;
          loop$new = new$9;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let prev = $;
          let old$1 = old.tail;
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = old$1;
          loop$new = new$9;
          loop$added = added;
          loop$removed = removed$1;
        }
      }
    } else if (old instanceof Empty) {
      let $ = new$9.head;
      if ($ instanceof Event2) {
        let next = $;
        let new$1 = new$9.tail;
        let name2 = $.name;
        let handler = $.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name2, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let next = $;
        let new$1 = new$9.tail;
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      }
    } else {
      let next = new$9.head;
      let remaining_new = new$9.tail;
      let prev = old.head;
      let remaining_old = old.tail;
      let $ = compare4(prev, next);
      if ($ instanceof Lt) {
        if (prev instanceof Event2) {
          let name2 = prev.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name2);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = new$9;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = remaining_old;
          loop$new = new$9;
          loop$added = added;
          loop$removed = removed$1;
        }
      } else if ($ instanceof Eq) {
        if (next instanceof Attribute) {
          if (prev instanceof Attribute) {
            let _block;
            let $1 = next.name;
            if ($1 === "value") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "checked") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "selected") {
              _block = controlled || prev.value !== next.value;
            } else {
              _block = prev.value !== next.value;
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name2 = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name2);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (next instanceof Property) {
          if (prev instanceof Property) {
            let _block;
            let $1 = next.name;
            if ($1 === "scrollLeft") {
              _block = true;
            } else if ($1 === "scrollRight") {
              _block = true;
            } else if ($1 === "value") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "checked") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "selected") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else {
              _block = !isEqual2(prev.value, next.value);
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name2 = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name2);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (prev instanceof Event2) {
          let name2 = next.name;
          let handler = next.handler;
          let has_changes = prev.prevent_default.kind !== next.prevent_default.kind || prev.stop_propagation.kind !== next.stop_propagation.kind || prev.immediate !== next.immediate || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
          let _block;
          if (has_changes) {
            _block = prepend(next, added);
          } else {
            _block = added;
          }
          let added$1 = _block;
          let events$1 = add_event(events, mapper, path2, name2, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let name2 = next.name;
          let handler = next.handler;
          let added$1 = prepend(next, added);
          let removed$1 = prepend(prev, removed);
          let events$1 = add_event(events, mapper, path2, name2, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed$1;
        }
      } else if (next instanceof Event2) {
        let name2 = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name2, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$9 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path2 = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (new$9 instanceof Empty) {
      if (old instanceof Empty) {
        return new Diff(
          new Patch(patch_index, removed, changes, children),
          events
        );
      } else {
        let prev = old.head;
        let old$1 = old.tail;
        let _block;
        let $ = prev.key === "" || !has_key2(moved, prev.key);
        if ($) {
          _block = removed + 1;
        } else {
          _block = removed;
        }
        let removed$1 = _block;
        let events$1 = remove_child(events, path2, node_index, prev);
        loop$old = old$1;
        loop$old_keyed = old_keyed;
        loop$new = new$9;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset;
        loop$removed = removed$1;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old instanceof Empty) {
      let events$1 = add_children(
        events,
        mapper,
        path2,
        node_index,
        new$9
      );
      let insert4 = insert3(new$9, node_index - moved_offset);
      let changes$1 = prepend(insert4, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else {
      let next = new$9.head;
      let prev = old.head;
      if (prev.key !== next.key) {
        let new_remaining = new$9.tail;
        let old_remaining = old.tail;
        let next_did_exist = get(old_keyed, next.key);
        let prev_does_exist = has_key2(new_keyed, prev.key);
        if (next_did_exist instanceof Ok) {
          if (prev_does_exist) {
            let match = next_did_exist[0];
            let $ = has_key2(moved, prev.key);
            if ($) {
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new$9;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let before = node_index - moved_offset;
              let changes$1 = prepend(
                move(next.key, before),
                changes
              );
              let moved$1 = insert2(moved, next.key, void 0);
              let moved_offset$1 = moved_offset + 1;
              loop$old = prepend(match, old);
              loop$old_keyed = old_keyed;
              loop$new = new$9;
              loop$new_keyed = new_keyed;
              loop$moved = moved$1;
              loop$moved_offset = moved_offset$1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes$1;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let index5 = node_index - moved_offset;
            let changes$1 = prepend(remove2(index5), changes);
            let events$1 = remove_child(events, path2, node_index, prev);
            let moved_offset$1 = moved_offset - 1;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new$9;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset$1;
            loop$removed = removed;
            loop$node_index = node_index;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes$1;
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if (prev_does_exist) {
          let before = node_index - moved_offset;
          let events$1 = add_child(
            events,
            mapper,
            path2,
            node_index,
            next
          );
          let insert4 = insert3(toList([next]), before);
          let changes$1 = prepend(insert4, changes);
          loop$old = old;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset + 1;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = changes$1;
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        } else {
          let change = replace2(node_index - moved_offset, next);
          let _block;
          let _pipe = events;
          let _pipe$1 = remove_child(_pipe, path2, node_index, prev);
          _block = add_child(_pipe$1, mapper, path2, node_index, next);
          let events$1 = _block;
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = prepend(change, changes);
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        }
      } else {
        let $ = old.head;
        if ($ instanceof Fragment) {
          let $1 = new$9.head;
          if ($1 instanceof Fragment) {
            let next$1 = $1;
            let new$1 = new$9.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child_path = add2(path2, node_index, next$1.key);
            let child = do_diff(
              prev$1.children,
              prev$1.keyed_children,
              next$1.children,
              next$1.keyed_children,
              empty2(),
              0,
              0,
              0,
              node_index,
              child_path,
              empty_list,
              empty_list,
              composed_mapper,
              events
            );
            let _block;
            let $2 = child.patch;
            let $3 = $2.children;
            if ($3 instanceof Empty) {
              let $4 = $2.changes;
              if ($4 instanceof Empty) {
                let $5 = $2.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(child.patch, children);
                }
              } else {
                _block = prepend(child.patch, children);
              }
            } else {
              _block = prepend(child.patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes;
            loop$children = children$1;
            loop$mapper = mapper;
            loop$events = child.events;
          } else {
            let next$1 = $1;
            let new_remaining = new$9.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Element) {
          let $1 = new$9.head;
          if ($1 instanceof Element) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.namespace === next$1.namespace && prev$1.tag === next$1.tag) {
              let new$1 = new$9.tail;
              let old$1 = old.tail;
              let composed_mapper = compose_mapper(
                mapper,
                next$1.mapper
              );
              let child_path = add2(path2, node_index, next$1.key);
              let controlled = is_controlled(
                events,
                next$1.namespace,
                next$1.tag,
                child_path
              );
              let $2 = diff_attributes(
                controlled,
                child_path,
                composed_mapper,
                events,
                prev$1.attributes,
                next$1.attributes,
                empty_list,
                empty_list
              );
              let added_attrs;
              let removed_attrs;
              let events$1;
              added_attrs = $2.added;
              removed_attrs = $2.removed;
              events$1 = $2.events;
              let _block;
              if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
                _block = empty_list;
              } else {
                _block = toList([update(added_attrs, removed_attrs)]);
              }
              let initial_child_changes = _block;
              let child = do_diff(
                prev$1.children,
                prev$1.keyed_children,
                next$1.children,
                next$1.keyed_children,
                empty2(),
                0,
                0,
                0,
                node_index,
                child_path,
                initial_child_changes,
                empty_list,
                composed_mapper,
                events$1
              );
              let _block$1;
              let $3 = child.patch;
              let $4 = $3.children;
              if ($4 instanceof Empty) {
                let $5 = $3.changes;
                if ($5 instanceof Empty) {
                  let $6 = $3.removed;
                  if ($6 === 0) {
                    _block$1 = children;
                  } else {
                    _block$1 = prepend(child.patch, children);
                  }
                } else {
                  _block$1 = prepend(child.patch, children);
                }
              } else {
                _block$1 = prepend(child.patch, children);
              }
              let children$1 = _block$1;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children$1;
              loop$mapper = mapper;
              loop$events = child.events;
            } else {
              let next$2 = $1;
              let new_remaining = new$9.tail;
              let prev$2 = $;
              let old_remaining = old.tail;
              let change = replace2(node_index - moved_offset, next$2);
              let _block;
              let _pipe = events;
              let _pipe$1 = remove_child(
                _pipe,
                path2,
                node_index,
                prev$2
              );
              _block = add_child(
                _pipe$1,
                mapper,
                path2,
                node_index,
                next$2
              );
              let events$1 = _block;
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new_remaining;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = prepend(change, changes);
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events$1;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$9.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Text) {
          let $1 = new$9.head;
          if ($1 instanceof Text) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.content === next$1.content) {
              let new$1 = new$9.tail;
              let old$1 = old.tail;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let next$2 = $1;
              let new$1 = new$9.tail;
              let old$1 = old.tail;
              let child = new$5(
                node_index,
                0,
                toList([replace_text(next$2.content)]),
                empty_list
              );
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = prepend(child, children);
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$9.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else {
          let $1 = new$9.head;
          if ($1 instanceof UnsafeInnerHtml) {
            let next$1 = $1;
            let new$1 = new$9.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child_path = add2(path2, node_index, next$1.key);
            let $2 = diff_attributes(
              false,
              child_path,
              composed_mapper,
              events,
              prev$1.attributes,
              next$1.attributes,
              empty_list,
              empty_list
            );
            let added_attrs;
            let removed_attrs;
            let events$1;
            added_attrs = $2.added;
            removed_attrs = $2.removed;
            events$1 = $2.events;
            let _block;
            if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
              _block = empty_list;
            } else {
              _block = toList([update(added_attrs, removed_attrs)]);
            }
            let child_changes = _block;
            let _block$1;
            let $3 = prev$1.inner_html === next$1.inner_html;
            if ($3) {
              _block$1 = child_changes;
            } else {
              _block$1 = prepend(
                replace_inner_html(next$1.inner_html),
                child_changes
              );
            }
            let child_changes$1 = _block$1;
            let _block$2;
            if (child_changes$1 instanceof Empty) {
              _block$2 = children;
            } else {
              _block$2 = prepend(
                new$5(node_index, 0, child_changes$1, toList([])),
                children
              );
            }
            let children$1 = _block$2;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes;
            loop$children = children$1;
            loop$mapper = mapper;
            loop$events = events$1;
          } else {
            let next$1 = $1;
            let new_remaining = new$9.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        }
      }
    }
  }
}
function diff(events, old, new$9) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$9]),
    empty2(),
    empty2(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity2,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var setTimeout = globalThis.setTimeout;
var clearTimeout = globalThis.clearTimeout;
var createElementNS = (ns, name2) => document2().createElementNS(ns, name2);
var createTextNode = (data) => document2().createTextNode(data);
var createDocumentFragment = () => document2().createDocumentFragment();
var insertBefore = (parent, node, reference) => parent.insertBefore(node, reference);
var moveBefore = SUPPORTS_MOVE_BEFORE ? (parent, node, reference) => parent.moveBefore(node, reference) : insertBefore;
var removeChild = (parent, child) => parent.removeChild(child);
var getAttribute = (node, name2) => node.getAttribute(name2);
var setAttribute = (node, name2, value2) => node.setAttribute(name2, value2);
var removeAttribute = (node, name2) => node.removeAttribute(name2);
var addEventListener = (node, name2, handler, options) => node.addEventListener(name2, handler, options);
var removeEventListener = (node, name2, handler) => node.removeEventListener(name2, handler);
var setInnerHtml = (node, innerHtml) => node.innerHTML = innerHtml;
var setData = (node, data) => node.data = data;
var meta = Symbol("lustre");
var MetadataNode = class {
  constructor(kind, parent, node, key) {
    this.kind = kind;
    this.key = key;
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.handlers = /* @__PURE__ */ new Map();
    this.throttles = /* @__PURE__ */ new Map();
    this.debouncers = /* @__PURE__ */ new Map();
  }
  get parentNode() {
    return this.kind === fragment_kind ? this.node.parentNode : this.node;
  }
};
var insertMetadataChild = (kind, parent, node, index5, key) => {
  const child = new MetadataNode(kind, parent, node, key);
  node[meta] = child;
  parent?.children.splice(index5, 0, child);
  return child;
};
var getPath = (node) => {
  let path2 = "";
  for (let current = node[meta]; current.parent; current = current.parent) {
    if (current.key) {
      path2 = `${separator_element}${current.key}${path2}`;
    } else {
      const index5 = current.parent.children.indexOf(current);
      path2 = `${separator_element}${index5}${path2}`;
    }
  }
  return path2.slice(1);
};
var Reconciler = class {
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  #exposeKeys = false;
  constructor(root3, dispatch, { useServerEvents = false, exposeKeys = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
    this.#exposeKeys = exposeKeys;
  }
  mount(vdom) {
    insertMetadataChild(element_kind, null, this.#root, 0, null);
    this.#insertChild(this.#root, null, this.#root[meta], 0, vdom);
  }
  push(patch) {
    this.#stack.push({ node: this.#root[meta], patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #stack = [];
  #reconcile() {
    const stack = this.#stack;
    while (stack.length) {
      const { node, patch } = stack.pop();
      const { children: childNodes } = node;
      const { changes, removed, children: childPatches } = patch;
      iterate(changes, (change) => this.#patch(node, change));
      if (removed) {
        this.#removeChildren(node, childNodes.length - removed, removed);
      }
      iterate(childPatches, (childPatch) => {
        const child = childNodes[childPatch.index | 0];
        this.#stack.push({ node: child, patch: childPatch });
      });
    }
  }
  #patch(node, change) {
    switch (change.kind) {
      case replace_text_kind:
        this.#replaceText(node, change);
        break;
      case replace_inner_html_kind:
        this.#replaceInnerHtml(node, change);
        break;
      case update_kind:
        this.#update(node, change);
        break;
      case move_kind:
        this.#move(node, change);
        break;
      case remove_kind:
        this.#remove(node, change);
        break;
      case replace_kind:
        this.#replace(node, change);
        break;
      case insert_kind:
        this.#insert(node, change);
        break;
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(parent, { children, before }) {
    const fragment3 = createDocumentFragment();
    const beforeEl = this.#getReference(parent, before);
    this.#insertChildren(fragment3, null, parent, before | 0, children);
    insertBefore(parent.parentNode, fragment3, beforeEl);
  }
  #replace(parent, { index: index5, with: child }) {
    this.#removeChildren(parent, index5 | 0, 1);
    const beforeEl = this.#getReference(parent, index5);
    this.#insertChild(parent.parentNode, beforeEl, parent, index5 | 0, child);
  }
  #getReference(node, index5) {
    index5 = index5 | 0;
    const { children } = node;
    const childCount = children.length;
    if (index5 < childCount) {
      return children[index5].node;
    }
    let lastChild = children[childCount - 1];
    if (!lastChild && node.kind !== fragment_kind) return null;
    if (!lastChild) lastChild = node;
    while (lastChild.kind === fragment_kind && lastChild.children.length) {
      lastChild = lastChild.children[lastChild.children.length - 1];
    }
    return lastChild.node.nextSibling;
  }
  #move(parent, { key, before }) {
    before = before | 0;
    const { children, parentNode } = parent;
    const beforeEl = children[before].node;
    let prev = children[before];
    for (let i = before + 1; i < children.length; ++i) {
      const next = children[i];
      children[i] = prev;
      prev = next;
      if (next.key === key) {
        children[before] = next;
        break;
      }
    }
    const { kind, node, children: prevChildren } = prev;
    moveBefore(parentNode, node, beforeEl);
    if (kind === fragment_kind) {
      this.#moveChildren(parentNode, prevChildren, beforeEl);
    }
  }
  #moveChildren(domParent, children, beforeEl) {
    for (let i = 0; i < children.length; ++i) {
      const { kind, node, children: nestedChildren } = children[i];
      moveBefore(domParent, node, beforeEl);
      if (kind === fragment_kind) {
        this.#moveChildren(domParent, nestedChildren, beforeEl);
      }
    }
  }
  #remove(parent, { index: index5 }) {
    this.#removeChildren(parent, index5, 1);
  }
  #removeChildren(parent, index5, count) {
    const { children, parentNode } = parent;
    const deleted = children.splice(index5, count);
    for (let i = 0; i < deleted.length; ++i) {
      const { kind, node, children: nestedChildren } = deleted[i];
      removeChild(parentNode, node);
      this.#removeDebouncers(deleted[i]);
      if (kind === fragment_kind) {
        deleted.push(...nestedChildren);
      }
    }
  }
  #removeDebouncers(node) {
    const { debouncers, children } = node;
    for (const { timeout } of debouncers.values()) {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    debouncers.clear();
    iterate(children, (child) => this.#removeDebouncers(child));
  }
  #update({ node, handlers, throttles, debouncers }, { added, removed }) {
    iterate(removed, ({ name: name2 }) => {
      if (handlers.delete(name2)) {
        removeEventListener(node, name2, handleEvent);
        this.#updateDebounceThrottle(throttles, name2, 0);
        this.#updateDebounceThrottle(debouncers, name2, 0);
      } else {
        removeAttribute(node, name2);
        SYNCED_ATTRIBUTES[name2]?.removed?.(node, name2);
      }
    });
    iterate(added, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #replaceText({ node }, { content }) {
    setData(node, content ?? "");
  }
  #replaceInnerHtml({ node }, { inner_html }) {
    setInnerHtml(node, inner_html ?? "");
  }
  // INSERT --------------------------------------------------------------------
  #insertChildren(domParent, beforeEl, metaParent, index5, children) {
    iterate(
      children,
      (child) => this.#insertChild(domParent, beforeEl, metaParent, index5++, child)
    );
  }
  #insertChild(domParent, beforeEl, metaParent, index5, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = this.#createElement(metaParent, index5, vnode);
        this.#insertChildren(node, null, node[meta], 0, vnode.children);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case text_kind: {
        const node = this.#createTextNode(metaParent, index5, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case fragment_kind: {
        const head = this.#createTextNode(metaParent, index5, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChildren(
          domParent,
          beforeEl,
          head[meta],
          0,
          vnode.children
        );
        break;
      }
      case unsafe_inner_html_kind: {
        const node = this.#createElement(metaParent, index5, vnode);
        this.#replaceInnerHtml({ node }, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
    }
  }
  #createElement(parent, index5, { kind, key, tag, namespace: namespace2, attributes }) {
    const node = createElementNS(namespace2 || NAMESPACE_HTML, tag);
    insertMetadataChild(kind, parent, node, index5, key);
    if (this.#exposeKeys && key) {
      setAttribute(node, "data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
    return node;
  }
  #createTextNode(parent, index5, { kind, key, content }) {
    const node = createTextNode(content ?? "");
    insertMetadataChild(kind, parent, node, index5, key);
    return node;
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name: name2,
      value: value2,
      prevent_default: prevent,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value2 ?? "";
        if (name2 === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        }
        if (valueOrDefault !== getAttribute(node, name2)) {
          setAttribute(node, name2, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name2]?.added?.(node, valueOrDefault);
        break;
      }
      case property_kind:
        node[name2] = value2;
        break;
      case event_kind: {
        if (handlers.has(name2)) {
          removeEventListener(node, name2, handleEvent);
        }
        const passive = prevent.kind === never_kind;
        addEventListener(node, name2, handleEvent, { passive });
        this.#updateDebounceThrottle(throttles, name2, throttleDelay);
        this.#updateDebounceThrottle(debouncers, name2, debounceDelay);
        handlers.set(name2, (event4) => this.#handleEvent(attribute3, event4));
        break;
      }
    }
  }
  #updateDebounceThrottle(map6, name2, delay) {
    const debounceOrThrottle = map6.get(name2);
    if (delay > 0) {
      if (debounceOrThrottle) {
        debounceOrThrottle.delay = delay;
      } else {
        map6.set(name2, { delay });
      }
    } else if (debounceOrThrottle) {
      const { timeout } = debounceOrThrottle;
      if (timeout) {
        clearTimeout(timeout);
      }
      map6.delete(name2);
    }
  }
  #handleEvent(attribute3, event4) {
    const { currentTarget, type } = event4;
    const { debouncers, throttles } = currentTarget[meta];
    const path2 = getPath(currentTarget);
    const {
      prevent_default: prevent,
      stop_propagation: stop,
      include,
      immediate
    } = attribute3;
    if (prevent.kind === always_kind) event4.preventDefault();
    if (stop.kind === always_kind) event4.stopPropagation();
    if (type === "submit") {
      event4.detail ??= {};
      event4.detail.formData = [
        ...new FormData(event4.target, event4.submitter).entries()
      ];
    }
    const data = this.#useServerEvents ? createServerEvent(event4, include ?? []) : event4;
    const throttle = throttles.get(type);
    if (throttle) {
      const now = Date.now();
      const last = throttle.last || 0;
      if (now > last + throttle.delay) {
        throttle.last = now;
        throttle.lastEvent = event4;
        this.#dispatch(data, path2, type, immediate);
      }
    }
    const debounce = debouncers.get(type);
    if (debounce) {
      clearTimeout(debounce.timeout);
      debounce.timeout = setTimeout(() => {
        if (event4 === throttles.get(type)?.lastEvent) return;
        this.#dispatch(data, path2, type, immediate);
      }, debounce.delay);
    }
    if (!throttle && !debounce) {
      this.#dispatch(data, path2, type, immediate);
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.head; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var handleEvent = (event4) => {
  const { currentTarget, type } = event4;
  const handler = currentTarget[meta].handlers.get(type);
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property3 of include) {
    const path2 = property3.split(".");
    for (let i = 0, input2 = event4, output = data; i < path2.length; i++) {
      if (i === path2.length - 1) {
        output[path2[i]] = input2[path2[i]];
        break;
      }
      output = output[path2[i]] ??= {};
      input2 = input2[path2[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = /* @__NO_SIDE_EFFECTS__ */ (name2) => {
  return {
    added(node) {
      node[name2] = true;
    },
    removed(node) {
      node[name2] = false;
    }
  };
};
var syncedAttribute = /* @__NO_SIDE_EFFECTS__ */ (name2) => {
  return {
    added(node, value2) {
      node[name2] = value2;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: /* @__PURE__ */ syncedBooleanAttribute("checked"),
  selected: /* @__PURE__ */ syncedBooleanAttribute("selected"),
  value: /* @__PURE__ */ syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => {
        node.focus?.();
      });
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function do_extract_keyed_children(loop$key_children_pairs, loop$keyed_children, loop$children) {
  while (true) {
    let key_children_pairs = loop$key_children_pairs;
    let keyed_children = loop$keyed_children;
    let children = loop$children;
    if (key_children_pairs instanceof Empty) {
      return [keyed_children, reverse(children)];
    } else {
      let rest = key_children_pairs.tail;
      let key = key_children_pairs.head[0];
      let element$1 = key_children_pairs.head[1];
      let keyed_element = to_keyed(key, element$1);
      let _block;
      if (key === "") {
        _block = keyed_children;
      } else {
        _block = insert2(keyed_children, key, keyed_element);
      }
      let keyed_children$1 = _block;
      let children$1 = prepend(keyed_element, children);
      loop$key_children_pairs = rest;
      loop$keyed_children = keyed_children$1;
      loop$children = children$1;
    }
  }
}
function extract_keyed_children(children) {
  return do_extract_keyed_children(
    children,
    empty2(),
    empty_list
  );
}
function element3(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function namespaced2(namespace2, tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element(
    "",
    identity2,
    namespace2,
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function fragment2(children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return fragment("", identity2, children$1, keyed_children);
}

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const rootMeta = insertMetadataChild(element_kind, null, root3, 0, null);
  let virtualisableRootChildren = 0;
  for (let child = root3.firstChild; child; child = child.nextSibling) {
    if (canVirtualiseNode(child)) virtualisableRootChildren += 1;
  }
  if (virtualisableRootChildren === 0) {
    const placeholder = document2().createTextNode("");
    insertMetadataChild(text_kind, rootMeta, placeholder, 0, null);
    root3.replaceChildren(placeholder);
    return none2();
  }
  if (virtualisableRootChildren === 1) {
    const children2 = virtualiseChildNodes(rootMeta, root3);
    return children2.head[1];
  }
  const fragmentHead = document2().createTextNode("");
  const fragmentMeta = insertMetadataChild(fragment_kind, rootMeta, fragmentHead, 0, null);
  const children = virtualiseChildNodes(fragmentMeta, root3);
  root3.insertBefore(fragmentHead, root3.firstChild);
  return fragment2(children);
};
var canVirtualiseNode = (node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
      return true;
    case TEXT_NODE:
      return !!node.data;
    default:
      return false;
  }
};
var virtualiseNode = (meta2, node, key, index5) => {
  if (!canVirtualiseNode(node)) {
    return null;
  }
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const childMeta = insertMetadataChild(element_kind, meta2, node, index5, key);
      const tag = node.localName;
      const namespace2 = node.namespaceURI;
      const isHtmlElement = !namespace2 || namespace2 === NAMESPACE_HTML;
      if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
        virtualiseInputEvents(tag, node);
      }
      const attributes = virtualiseAttributes(node);
      const children = virtualiseChildNodes(childMeta, node);
      const vnode = isHtmlElement ? element3(tag, attributes, children) : namespaced2(namespace2, tag, attributes, children);
      return vnode;
    }
    case TEXT_NODE:
      insertMetadataChild(text_kind, meta2, node, index5, null);
      return text2(node.data);
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked2 = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked2) return;
  if (tag === "input" && node.type === "radio" && !checked2) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2) return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked2;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2().activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualiseChildNodes = (meta2, node) => {
  let children = null;
  let child = node.firstChild;
  let ptr = null;
  let index5 = 0;
  while (child) {
    const key = child.nodeType === ELEMENT_NODE ? child.getAttribute("data-lustre-key") : null;
    if (key != null) {
      child.removeAttribute("data-lustre-key");
    }
    const vnode = virtualiseNode(meta2, child, key, index5);
    const next = child.nextSibling;
    if (vnode) {
      const list_node = new NonEmpty([key ?? "", vnode], null);
      if (ptr) {
        ptr = ptr.tail = list_node;
      } else {
        ptr = children = list_node;
      }
      index5 += 1;
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  if (!ptr) return empty_list;
  ptr.tail = empty_list;
  return children;
};
var virtualiseAttributes = (node) => {
  let index5 = node.attributes.length;
  let attributes = empty_list;
  while (index5-- > 0) {
    const attr = node.attributes[index5];
    if (attr.name === "xmlns") {
      continue;
    }
    attributes = new NonEmpty(virtualiseAttribute(attr), attributes);
  }
  return attributes;
};
var virtualiseAttribute = (attr) => {
  const name2 = attr.localName;
  const value2 = attr.value;
  return attribute2(name2, value2);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2();
var Runtime = class {
  constructor(root3, [model, effects], view4, update5) {
    this.root = root3;
    this.#model = model;
    this.#view = view4;
    this.#update = update5;
    this.root.addEventListener("context-request", (event4) => {
      if (!(event4.context && event4.callback)) return;
      if (!this.#contexts.has(event4.context)) return;
      event4.stopImmediatePropagation();
      const context = this.#contexts.get(event4.context);
      if (event4.subscribe) {
        const unsubscribe = () => {
          context.subscribers = context.subscribers.filter(
            (subscriber) => subscriber !== event4.callback
          );
        };
        context.subscribers.push([event4.callback, unsubscribe]);
        event4.callback(context.value, unsubscribe);
      } else {
        event4.callback(context.value);
      }
    });
    this.#reconciler = new Reconciler(this.root, (event4, path2, name2) => {
      const [events, result] = handle(this.#events, path2, name2, event4);
      this.#events = events;
      if (result.isOk()) {
        const handler = result[0];
        if (handler.stop_propagation) event4.stopPropagation();
        if (handler.prevent_default) event4.preventDefault();
        this.dispatch(handler.message, false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$3();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  dispatch(msg, immediate = false) {
    this.#shouldFlush ||= immediate;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // Provide a context value for any child nodes that request it using the given
  // key. If the key already exists, any existing subscribers will be notified
  // of the change. Otherwise, we store the value and wait for any `context-request`
  // events to come in.
  provide(key, value2) {
    if (!this.#contexts.has(key)) {
      this.#contexts.set(key, { value: value2, subscribers: [] });
    } else {
      const context = this.#contexts.get(key);
      context.value = value2;
      for (let i = context.subscribers.length - 1; i >= 0; i--) {
        const [subscriber, unsubscribe] = context.subscribers[i];
        if (!subscriber) {
          context.subscribers.splice(i, 1);
          continue;
        }
        subscriber(value2, unsubscribe);
      }
    }
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #contexts = /* @__PURE__ */ new Map();
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate) => this.dispatch(msg, immediate),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root,
    provide: (key, value2) => this.provide(key, value2)
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a2, b) {
  if (a2 instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a2;
  } else {
    return append(a2, b);
  }
}
var copiedStyleSheets = /* @__PURE__ */ new WeakMap();
async function adoptStylesheets(shadowRoot) {
  const pendingParentStylesheets = [];
  for (const node of document2().querySelectorAll(
    "link[rel=stylesheet], style"
  )) {
    if (node.sheet) continue;
    pendingParentStylesheets.push(
      new Promise((resolve2, reject) => {
        node.addEventListener("load", resolve2);
        node.addEventListener("error", reject);
      })
    );
  }
  await Promise.allSettled(pendingParentStylesheets);
  if (!shadowRoot.host.isConnected) {
    return [];
  }
  shadowRoot.adoptedStyleSheets = shadowRoot.host.getRootNode().adoptedStyleSheets;
  const pending = [];
  for (const sheet of document2().styleSheets) {
    try {
      shadowRoot.adoptedStyleSheets.push(sheet);
    } catch {
      try {
        let copiedSheet = copiedStyleSheets.get(sheet);
        if (!copiedSheet) {
          copiedSheet = new CSSStyleSheet();
          for (const rule of sheet.cssRules) {
            copiedSheet.insertRule(rule.cssText, copiedSheet.cssRules.length);
          }
          copiedStyleSheets.set(sheet, copiedSheet);
        }
        shadowRoot.adoptedStyleSheets.push(copiedSheet);
      } catch {
        const node = sheet.ownerNode.cloneNode();
        shadowRoot.prepend(node);
        pending.push(node);
      }
    }
  }
  return pending;
}
var ContextRequestEvent = class extends Event {
  constructor(context, callback, subscribe) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
    this.subscribe = subscribe;
  }
};

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name2, data) {
    super();
    this.name = name2;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/runtime/client/component.ffi.mjs
var make_component = ({ init: init4, update: update5, view: view4, config }, name2) => {
  if (!is_browser()) return new Error(new NotABrowser());
  if (!name2.includes("-")) return new Error(new BadComponentName(name2));
  if (customElements.get(name2)) {
    return new Error(new ComponentAlreadyRegistered(name2));
  }
  const attributes = /* @__PURE__ */ new Map();
  const observedAttributes = [];
  for (let attr = config.attributes; attr.tail; attr = attr.tail) {
    const [name3, decoder] = attr.head;
    if (attributes.has(name3)) continue;
    attributes.set(name3, decoder);
    observedAttributes.push(name3);
  }
  const [model, effects] = init4(void 0);
  const component = class Component extends HTMLElement {
    static get observedAttributes() {
      return observedAttributes;
    }
    static formAssociated = config.is_form_associated;
    #runtime;
    #adoptedStyleNodes = [];
    #shadowRoot;
    #contextSubscriptions = /* @__PURE__ */ new Map();
    constructor() {
      super();
      this.internals = this.attachInternals();
      if (!this.internals.shadowRoot) {
        this.#shadowRoot = this.attachShadow({
          mode: config.open_shadow_root ? "open" : "closed",
          delegatesFocus: config.delegates_focus
        });
      } else {
        this.#shadowRoot = this.internals.shadowRoot;
      }
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
      this.#runtime = new Runtime(
        this.#shadowRoot,
        [model, effects],
        view4,
        update5
      );
    }
    // CUSTOM ELEMENT LIFECYCLE METHODS ----------------------------------------
    connectedCallback() {
      const requested = /* @__PURE__ */ new Set();
      for (let ctx = config.contexts; ctx.tail; ctx = ctx.tail) {
        const [key, decoder] = ctx.head;
        if (!key) continue;
        if (requested.has(key)) continue;
        this.dispatchEvent(
          new ContextRequestEvent(
            key,
            (value2, unsubscribe) => {
              const previousUnsubscribe = this.#contextSubscriptions.get(key);
              if (previousUnsubscribe !== unsubscribe) {
                previousUnsubscribe?.();
              }
              const decoded = run(value2, decoder);
              this.#contextSubscriptions.set(key, unsubscribe);
              if (decoded.isOk()) {
                this.dispatch(decoded[0]);
              }
            },
            true
          )
        );
        requested.add(key);
      }
    }
    adoptedCallback() {
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
    }
    attributeChangedCallback(name3, _, value2) {
      const decoded = attributes.get(name3)(value2 ?? "");
      if (decoded.isOk()) {
        this.dispatch(decoded[0]);
      }
    }
    formResetCallback() {
      if (config.on_form_reset instanceof Some) {
        this.dispatch(config.on_form_reset[0]);
      }
    }
    formStateRestoreCallback(state, reason) {
      switch (reason) {
        case "restore":
          if (config.on_form_restore instanceof Some) {
            this.dispatch(config.on_form_restore[0](state));
          }
          break;
        case "autocomplete":
          if (config.on_form_populate instanceof Some) {
            this.dispatch(config.on_form_autofill[0](state));
          }
          break;
      }
    }
    disconnectedCallback() {
      for (const [_, unsubscribe] of this.#contextSubscriptions) {
        unsubscribe?.();
      }
      this.#contextSubscriptions.clear();
    }
    // LUSTRE RUNTIME METHODS --------------------------------------------------
    send(message) {
      switch (message.constructor) {
        case EffectDispatchedMessage: {
          this.dispatch(message.message, false);
          break;
        }
        case EffectEmitEvent: {
          this.emit(message.name, message.data);
          break;
        }
        case SystemRequestedShutdown:
          break;
      }
    }
    dispatch(msg, immediate = false) {
      this.#runtime.dispatch(msg, immediate);
    }
    emit(event4, data) {
      this.#runtime.emit(event4, data);
    }
    provide(key, value2) {
      this.#runtime.provide(key, value2);
    }
    async #adoptStyleSheets() {
      while (this.#adoptedStyleNodes.length) {
        this.#adoptedStyleNodes.pop().remove();
        this.shadowRoot.firstChild.remove();
      }
      this.#adoptedStyleNodes = await adoptStylesheets(this.#shadowRoot);
    }
  };
  for (let prop = config.properties; prop.tail; prop = prop.tail) {
    const [name3, decoder] = prop.head;
    if (Object.hasOwn(component.prototype, name3)) {
      continue;
    }
    Object.defineProperty(component.prototype, name3, {
      get() {
        return this[`_${name3}`];
      },
      set(value2) {
        this[`_${name3}`] = value2;
        const decoded = run(value2, decoder);
        if (decoded.constructor === Ok) {
          this.dispatch(decoded[0]);
        }
      }
    });
  }
  customElements.define(name2, component);
  return new Ok(void 0);
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, delegates_focus, attributes, properties, contexts, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.delegates_focus = delegates_focus;
    this.attributes = attributes;
    this.properties = properties;
    this.contexts = contexts;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$6(options) {
  let init4 = new Config2(
    true,
    true,
    false,
    empty_list,
    empty_list,
    empty_list,
    false,
    option_none,
    option_none,
    option_none
  );
  return fold(
    options,
    init4,
    (config, option2) => {
      return option2.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class {
  #runtime;
  constructor(root3, [init4, effects], update5, view4) {
    this.#runtime = new Runtime(root3, [init4, effects], view4, update5);
  }
  send(message) {
    switch (message.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message.name, message.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate) {
    this.#runtime.dispatch(msg, immediate);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = ({ init: init4, update: update5, view: view4 }, selector, flags) => {
  if (!is_browser()) return new Error(new NotABrowser());
  const root3 = selector instanceof HTMLElement ? selector : document2().querySelector(selector);
  if (!root3) return new Error(new ElementNotFound(selector));
  return new Ok(new Spa(root3, init4(flags), update5, view4));
};

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init4, update5, view4, config) {
    super();
    this.init = init4;
    this.update = update5;
    this.view = view4;
    this.config = config;
  }
};
var BadComponentName = class extends CustomType {
  constructor(name2) {
    super();
    this.name = name2;
  }
};
var ComponentAlreadyRegistered = class extends CustomType {
  constructor(name2) {
    super();
    this.name = name2;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init4, update5, view4) {
  return new App(init4, update5, view4, new$6(empty_list));
}
function simple(init4, update5, view4) {
  let init$1 = (start_args) => {
    return [init4(start_args), none()];
  };
  let update$1 = (model, msg) => {
    return [update5(model, msg), none()];
  };
  return application(init$1, update$1, view4);
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/svg.mjs
var namespace = "http://www.w3.org/2000/svg";
function svg(attrs, children) {
  return namespaced(namespace, "svg", attrs, children);
}
function path(attrs) {
  return namespaced(namespace, "path", attrs, empty_list);
}

// build/dev/javascript/gleam_stdlib/gleam/pair.mjs
function new$7(first2, second) {
  return [first2, second];
}

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name2) {
  if (name2 === "input") {
    return true;
  } else if (name2 === "change") {
    return true;
  } else if (name2 === "focus") {
    return true;
  } else if (name2 === "focusin") {
    return true;
  } else if (name2 === "focusout") {
    return true;
  } else if (name2 === "blur") {
    return true;
  } else if (name2 === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name2, handler) {
  return event(
    name2,
    map2(handler, (msg) => {
      return new Handler(false, false, msg);
    }),
    empty_list,
    never,
    never,
    is_immediate_event(name2),
    0,
    0
  );
}
function prevent_default(event4) {
  if (event4 instanceof Event2) {
    return new Event2(
      event4.kind,
      event4.name,
      event4.handler,
      event4.include,
      always,
      event4.stop_propagation,
      event4.immediate,
      event4.debounce,
      event4.throttle
    );
  } else {
    return event4;
  }
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_change(msg) {
  return on(
    "change",
    subfield(
      toList(["target", "value"]),
      string2,
      (value2) => {
        return success(msg(value2));
      }
    )
  );
}
function formdata_decoder() {
  let string_value_decoder = field(
    0,
    string2,
    (key) => {
      return field(
        1,
        one_of(
          map2(string2, (var0) => {
            return new Ok(var0);
          }),
          toList([success(new Error(void 0))])
        ),
        (value2) => {
          let _pipe2 = value2;
          let _pipe$12 = map3(
            _pipe2,
            (_capture) => {
              return new$7(key, _capture);
            }
          );
          return success(_pipe$12);
        }
      );
    }
  );
  let _pipe = string_value_decoder;
  let _pipe$1 = list2(_pipe);
  return map2(_pipe$1, values2);
}
function on_submit(msg) {
  let _pipe = on(
    "submit",
    subfield(
      toList(["detail", "formData"]),
      formdata_decoder(),
      (formdata) => {
        let _pipe2 = formdata;
        let _pipe$1 = msg(_pipe2);
        return success(_pipe$1);
      }
    )
  );
  return prevent_default(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
var Uri = class extends CustomType {
  constructor(scheme, userinfo, host, port, path2, query, fragment3) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path2;
    this.query = query;
    this.fragment = fragment3;
  }
};
function is_valid_host_within_brackets_char(char) {
  return 48 >= char && char <= 57 || 65 >= char && char <= 90 || 97 >= char && char <= 122 || char === 58 || char === 46;
}
function parse_fragment(rest, pieces) {
  return new Ok(
    new Uri(
      pieces.scheme,
      pieces.userinfo,
      pieces.host,
      pieces.port,
      pieces.path,
      pieces.query,
      new Some(rest)
    )
  );
}
function parse_query_with_question_mark_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let query = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          new Some(query),
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          new Some(original),
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_query_with_question_mark(uri_string, pieces) {
  return parse_query_with_question_mark_loop(uri_string, uri_string, pieces, 0);
}
function parse_path_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let path2 = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        pieces.port,
        path2,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let path2 = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        pieces.port,
        path2,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          original,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_path(uri_string, pieces) {
  return parse_path_loop(uri_string, uri_string, pieces, 0);
}
function parse_port_loop(loop$uri_string, loop$pieces, loop$port) {
  while (true) {
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let port = loop$port;
    if (uri_string.startsWith("0")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10;
    } else if (uri_string.startsWith("1")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 1;
    } else if (uri_string.startsWith("2")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 2;
    } else if (uri_string.startsWith("3")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 3;
    } else if (uri_string.startsWith("4")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 4;
    } else if (uri_string.startsWith("5")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 5;
    } else if (uri_string.startsWith("6")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 6;
    } else if (uri_string.startsWith("7")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 7;
    } else if (uri_string.startsWith("8")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 8;
    } else if (uri_string.startsWith("9")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 9;
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_path(uri_string, pieces$1);
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          new Some(port),
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      return new Error(void 0);
    }
  }
}
function parse_port(uri_string, pieces) {
  if (uri_string.startsWith(":0")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 0);
  } else if (uri_string.startsWith(":1")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 1);
  } else if (uri_string.startsWith(":2")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 2);
  } else if (uri_string.startsWith(":3")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 3);
  } else if (uri_string.startsWith(":4")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 4);
  } else if (uri_string.startsWith(":5")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 5);
  } else if (uri_string.startsWith(":6")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 6);
  } else if (uri_string.startsWith(":7")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 7);
  } else if (uri_string.startsWith(":8")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 8);
  } else if (uri_string.startsWith(":9")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 9);
  } else if (uri_string === ":") {
    return new Ok(pieces);
  } else if (uri_string === "") {
    return new Ok(pieces);
  } else if (uri_string.startsWith("?")) {
    let rest = uri_string.slice(1);
    return parse_query_with_question_mark(rest, pieces);
  } else if (uri_string.startsWith(":?")) {
    let rest = uri_string.slice(2);
    return parse_query_with_question_mark(rest, pieces);
  } else if (uri_string.startsWith("#")) {
    let rest = uri_string.slice(1);
    return parse_fragment(rest, pieces);
  } else if (uri_string.startsWith(":#")) {
    let rest = uri_string.slice(2);
    return parse_fragment(rest, pieces);
  } else if (uri_string.startsWith("/")) {
    return parse_path(uri_string, pieces);
  } else if (uri_string.startsWith(":")) {
    let rest = uri_string.slice(1);
    if (rest.startsWith("/")) {
      return parse_path(rest, pieces);
    } else {
      return new Error(void 0);
    }
  } else {
    return new Error(void 0);
  }
}
function parse_host_outside_of_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(original),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else if (uri_string.startsWith(":")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_port(uri_string, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_path(uri_string, pieces$1);
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_host_within_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(uri_string),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else if (uri_string.startsWith("]")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_port(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2 + 1);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_port(rest, pieces$1);
      }
    } else if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_path(uri_string, pieces);
      } else {
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_path(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else {
      let $ = pop_codeunit(uri_string);
      let char;
      let rest;
      char = $[0];
      rest = $[1];
      let $1 = is_valid_host_within_brackets_char(char);
      if ($1) {
        loop$original = original;
        loop$uri_string = rest;
        loop$pieces = pieces;
        loop$size = size2 + 1;
      } else {
        return parse_host_outside_of_brackets_loop(
          original,
          original,
          pieces,
          0
        );
      }
    }
  }
}
function parse_host_within_brackets(uri_string, pieces) {
  return parse_host_within_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host_outside_of_brackets(uri_string, pieces) {
  return parse_host_outside_of_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host(uri_string, pieces) {
  if (uri_string.startsWith("[")) {
    return parse_host_within_brackets(uri_string, pieces);
  } else if (uri_string.startsWith(":")) {
    let pieces$1 = new Uri(
      pieces.scheme,
      pieces.userinfo,
      new Some(""),
      pieces.port,
      pieces.path,
      pieces.query,
      pieces.fragment
    );
    return parse_port(uri_string, pieces$1);
  } else if (uri_string === "") {
    return new Ok(
      new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(""),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      )
    );
  } else {
    return parse_host_outside_of_brackets(uri_string, pieces);
  }
}
function parse_userinfo_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("@")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_host(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let userinfo = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          new Some(userinfo),
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_host(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("/")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("?")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("#")) {
      return parse_host(original, pieces);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_authority_pieces(string5, pieces) {
  return parse_userinfo_loop(string5, string5, pieces, 0);
}
function parse_authority_with_slashes(uri_string, pieces) {
  if (uri_string === "//") {
    return new Ok(
      new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(""),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      )
    );
  } else if (uri_string.startsWith("//")) {
    let rest = uri_string.slice(2);
    return parse_authority_pieces(rest, pieces);
  } else {
    return parse_path(uri_string, pieces);
  }
}
function parse_scheme_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_authority_with_slashes(uri_string, pieces);
      } else {
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_authority_with_slashes(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string.startsWith(":")) {
      if (size2 === 0) {
        return new Error(void 0);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_authority_with_slashes(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          original,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function to_string5(uri) {
  let _block;
  let $ = uri.fragment;
  if ($ instanceof Some) {
    let fragment3 = $[0];
    _block = toList(["#", fragment3]);
  } else {
    _block = toList([]);
  }
  let parts = _block;
  let _block$1;
  let $1 = uri.query;
  if ($1 instanceof Some) {
    let query = $1[0];
    _block$1 = prepend("?", prepend(query, parts));
  } else {
    _block$1 = parts;
  }
  let parts$1 = _block$1;
  let parts$2 = prepend(uri.path, parts$1);
  let _block$2;
  let $2 = uri.host;
  let $3 = starts_with(uri.path, "/");
  if (!$3 && $2 instanceof Some) {
    let host = $2[0];
    if (host !== "") {
      _block$2 = prepend("/", parts$2);
    } else {
      _block$2 = parts$2;
    }
  } else {
    _block$2 = parts$2;
  }
  let parts$3 = _block$2;
  let _block$3;
  let $4 = uri.host;
  let $5 = uri.port;
  if ($5 instanceof Some && $4 instanceof Some) {
    let port = $5[0];
    _block$3 = prepend(":", prepend(to_string(port), parts$3));
  } else {
    _block$3 = parts$3;
  }
  let parts$4 = _block$3;
  let _block$4;
  let $6 = uri.scheme;
  let $7 = uri.userinfo;
  let $8 = uri.host;
  if ($8 instanceof Some) {
    if ($7 instanceof Some) {
      if ($6 instanceof Some) {
        let h = $8[0];
        let u = $7[0];
        let s = $6[0];
        _block$4 = prepend(
          s,
          prepend(
            "://",
            prepend(u, prepend("@", prepend(h, parts$4)))
          )
        );
      } else {
        _block$4 = parts$4;
      }
    } else if ($6 instanceof Some) {
      let h = $8[0];
      let s = $6[0];
      _block$4 = prepend(s, prepend("://", prepend(h, parts$4)));
    } else {
      let h = $8[0];
      _block$4 = prepend("//", prepend(h, parts$4));
    }
  } else if ($7 instanceof Some) {
    if ($6 instanceof Some) {
      let s = $6[0];
      _block$4 = prepend(s, prepend(":", parts$4));
    } else {
      _block$4 = parts$4;
    }
  } else if ($6 instanceof Some) {
    let s = $6[0];
    _block$4 = prepend(s, prepend(":", parts$4));
  } else {
    _block$4 = parts$4;
  }
  let parts$5 = _block$4;
  return concat2(parts$5);
}
var empty3 = /* @__PURE__ */ new Uri(
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  "",
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None()
);
function parse2(uri_string) {
  return parse_scheme_loop(uri_string, uri_string, empty3, 0);
}

// build/dev/javascript/formal/formal/form.mjs
var Form = class extends CustomType {
  constructor(translator, values3, errors, run3) {
    super();
    this.translator = translator;
    this.values = values3;
    this.errors = errors;
    this.run = run3;
  }
};
var Schema = class extends CustomType {
  constructor(run3) {
    super();
    this.run = run3;
  }
};
var MustBePresent = class extends CustomType {
};
var MustBeInt = class extends CustomType {
};
var MustBeFloat = class extends CustomType {
};
var MustBeEmail = class extends CustomType {
};
var MustBePhoneNumber = class extends CustomType {
};
var MustBeUrl = class extends CustomType {
};
var MustBeDate = class extends CustomType {
};
var MustBeTime = class extends CustomType {
};
var MustBeDateTime = class extends CustomType {
};
var MustBeColour = class extends CustomType {
};
var MustBeStringLengthMoreThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeStringLengthLessThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeIntMoreThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeIntLessThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeFloatMoreThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeFloatLessThan = class extends CustomType {
  constructor(limit) {
    super();
    this.limit = limit;
  }
};
var MustBeAccepted = class extends CustomType {
};
var MustConfirm = class extends CustomType {
};
var MustBeUnique = class extends CustomType {
};
var CustomError = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var Parser = class extends CustomType {
  constructor(run3) {
    super();
    this.run = run3;
  }
};
var Check = class extends CustomType {
};
var DontCheck = class extends CustomType {
};
function field_value(form3, name2) {
  let _pipe = form3.values;
  let _pipe$1 = key_find(_pipe, name2);
  return unwrap2(_pipe$1, "");
}
function run2(form3) {
  let $ = form3.run(form3.values, toList([]));
  let value2;
  let errors;
  value2 = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(value2);
  } else {
    return new Error(new Form(form3.translator, form3.values, errors, form3.run));
  }
}
function field2(name2, parser, continuation) {
  return new Schema(
    (values3, errors) => {
      let input2 = key_filter(values3, name2);
      let $ = parser.run(input2, new Check());
      let value2;
      let new_errors;
      value2 = $[0];
      new_errors = $[2];
      let _block;
      if (new_errors instanceof Empty) {
        _block = errors;
      } else {
        _block = prepend([name2, new_errors], errors);
      }
      let errors$1 = _block;
      return continuation(value2).run(values3, errors$1);
    }
  );
}
function success2(value2) {
  return new Schema((_, errors) => {
    return [value2, errors];
  });
}
function add_values(form3, values3) {
  return new Form(
    form3.translator,
    append(values3, form3.values),
    form3.errors,
    form3.run
  );
}
function set_values(form3, values3) {
  return new Form(form3.translator, values3, form3.errors, form3.run);
}
function checkbox_parser(inputs, status) {
  if (inputs instanceof Empty) {
    return [false, status, toList([])];
  } else {
    return [true, status, toList([])];
  }
}
function string_parser(inputs, status) {
  if (inputs instanceof Empty) {
    return ["", status, toList([])];
  } else {
    let input2 = inputs.head;
    return [input2, status, toList([])];
  }
}
function value_parser(inputs, zero, status, error, next) {
  if (inputs instanceof Empty) {
    return [zero, new DontCheck(), toList([error])];
  } else {
    let input2 = inputs.head;
    let $ = next(input2);
    if ($ instanceof Ok) {
      let t = $[0];
      return [t, status, toList([])];
    } else {
      return [zero, new DontCheck(), toList([error])];
    }
  }
}
function int_parser(inputs, status) {
  return value_parser(
    inputs,
    0,
    status,
    new MustBeInt(),
    (input2) => {
      return parse_int(input2);
    }
  );
}
function float_parser(inputs, status) {
  return value_parser(
    inputs,
    0,
    status,
    new MustBeFloat(),
    (input2) => {
      let $ = parse_float(input2);
      if ($ instanceof Ok) {
        return $;
      } else {
        let _pipe = parse_int(input2);
        return map3(_pipe, identity);
      }
    }
  );
}
function add_check(parser, checker) {
  return new Parser(
    (inputs, status) => {
      let $ = parser.run(inputs, status);
      let value2;
      let status$1;
      let errors;
      value2 = $[0];
      status$1 = $[1];
      errors = $[2];
      let _block;
      if (status$1 instanceof Check) {
        let $1 = checker(value2);
        if ($1 instanceof Ok) {
          _block = errors;
        } else {
          let error = $1[0];
          _block = prepend(error, errors);
        }
      } else {
        _block = errors;
      }
      let errors$1 = _block;
      return [value2, status$1, errors$1];
    }
  );
}
function check(parser, checker) {
  return add_check(
    parser,
    (a2) => {
      let $ = checker(a2);
      if ($ instanceof Ok) {
        return $;
      } else {
        let e = $[0];
        return new Error(new CustomError(e));
      }
    }
  );
}
function check_not_empty(parser) {
  return add_check(
    parser,
    (x) => {
      if (x === "") {
        return new Error(new MustBePresent());
      } else {
        return new Ok(x);
      }
    }
  );
}
function en_gb(error) {
  if (error instanceof MustBePresent) {
    return "must not be blank";
  } else if (error instanceof MustBeInt) {
    return "must be a whole number";
  } else if (error instanceof MustBeFloat) {
    return "must be a number";
  } else if (error instanceof MustBeEmail) {
    return "must be an email";
  } else if (error instanceof MustBePhoneNumber) {
    return "must be a phone number";
  } else if (error instanceof MustBeUrl) {
    return "must be a URL";
  } else if (error instanceof MustBeDate) {
    return "must be a date";
  } else if (error instanceof MustBeTime) {
    return "must be a time";
  } else if (error instanceof MustBeDateTime) {
    return "must be a date and time";
  } else if (error instanceof MustBeColour) {
    return "must be a hex colour code";
  } else if (error instanceof MustBeStringLengthMoreThan) {
    let limit = error.limit;
    return "must be more than " + to_string(limit) + " characters";
  } else if (error instanceof MustBeStringLengthLessThan) {
    let limit = error.limit;
    return "must be less than " + to_string(limit) + " characters";
  } else if (error instanceof MustBeIntMoreThan) {
    let limit = error.limit;
    return "must be more than " + to_string(limit);
  } else if (error instanceof MustBeIntLessThan) {
    let limit = error.limit;
    return "must be less than " + to_string(limit);
  } else if (error instanceof MustBeFloatMoreThan) {
    let limit = error.limit;
    return "must be more than " + float_to_string(limit);
  } else if (error instanceof MustBeFloatLessThan) {
    let limit = error.limit;
    return "must be less than " + float_to_string(limit);
  } else if (error instanceof MustBeAccepted) {
    return "must be accepted";
  } else if (error instanceof MustConfirm) {
    return "doesn't match";
  } else if (error instanceof MustBeUnique) {
    return "is already in use";
  } else {
    let message = error.message;
    return message;
  }
}
function new$8(schema) {
  return new Form(en_gb, toList([]), toList([]), schema.run);
}
function field_error_messages(form3, name2) {
  let _pipe = form3.errors;
  let _pipe$1 = key_filter(_pipe, name2);
  return flat_map(
    _pipe$1,
    (_capture) => {
      return map(_capture, form3.translator);
    }
  );
}
var parse_checkbox = /* @__PURE__ */ new Parser(checkbox_parser);
var parse_string = /* @__PURE__ */ new Parser(string_parser);
var parse_int2 = /* @__PURE__ */ new Parser(int_parser);
var parse_float2 = /* @__PURE__ */ new Parser(float_parser);

// build/dev/javascript/keyboard_shortcuts/keyboard_shortcuts.ffi.mjs
var isMac = navigator.platform && navigator.platform.toLowerCase().startsWith("mac") || navigator.platform && navigator.platform.toLowerCase().startsWith("iphone") || navigator.userAgent && /mac/i.test(navigator.userAgent.toLowerCase()) || navigator.userAgent?.platform?.startsWith("mac");
var window_add_event_listener = (name2, handler) => {
  window.addEventListener(name2, handler);
};
var prevent_default2 = (event4) => {
  event4.preventDefault();
};
var is_mac = () => {
  return isMac;
};

// build/dev/javascript/keyboard_shortcuts/keyboard_shortcuts.mjs
var Shortcut = class extends CustomType {
  constructor(combination, msg, options) {
    super();
    this.combination = combination;
    this.msg = msg;
    this.options = options;
  }
};
var PreventDefault = class extends CustomType {
};
var Exclude = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ExcludeInputElements = class extends CustomType {
};
var Key2 = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var Code = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var Modifier = class extends CustomType {
};
var Shift = class extends CustomType {
};
var Alt = class extends CustomType {
};
var KeyDown = class extends CustomType {
};
var DecodedKey = class extends CustomType {
  constructor(key, mod, shift, alt, code) {
    super();
    this.key = key;
    this.mod = mod;
    this.shift = shift;
    this.alt = alt;
    this.code = code;
  }
};
var DecodedKeyEvent = class extends CustomType {
  constructor(key, tag_name) {
    super();
    this.key = key;
    this.tag_name = tag_name;
  }
};
var InternalShortcut = class extends CustomType {
  constructor(trigger, msg, prevent_default3, exclude) {
    super();
    this.trigger = trigger;
    this.msg = msg;
    this.prevent_default = prevent_default3;
    this.exclude = exclude;
  }
};
function combination_to_decoded_key(combination) {
  let modifier = contains(combination, new Modifier());
  let shift = contains(combination, new Shift());
  let alt = contains(combination, new Alt());
  let _block;
  let $ = find_map(
    combination,
    (key2) => {
      if (key2 instanceof Key2) {
        let key$1 = key2[0];
        return new Ok(key$1);
      } else {
        return new Error("not found");
      }
    }
  );
  if ($ instanceof Ok) {
    let s = $[0];
    _block = lowercase(s);
  } else {
    _block = "NOTMATCHING";
  }
  let key = _block;
  let _block$1;
  let $1 = find_map(
    combination,
    (key2) => {
      if (key2 instanceof Code) {
        let code2 = key2[0];
        return new Ok(code2);
      } else {
        return new Error("not found");
      }
    }
  );
  if ($1 instanceof Ok) {
    let s = $1[0];
    _block$1 = lowercase(s);
  } else {
    _block$1 = "NOTMATCHING";
  }
  let code = _block$1;
  return new DecodedKey(key, modifier, shift, alt, code);
}
function modifiers_match(k1, k2) {
  return k1.mod === k2.mod && k1.shift === k2.shift && k1.alt === k2.alt;
}
function key_or_code_matches(k1, k2) {
  return k1.key === k2.key || k1.code === k2.code;
}
function modifier_key() {
  let $ = is_mac();
  if ($) {
    return "metaKey";
  } else {
    return "ctrlKey";
  }
}
var input_elements = /* @__PURE__ */ toList([
  "INPUT",
  "TEXTAREA",
  "SELECT"
]);
function install_keyboard_shortcuts(dispatch, event_type, shortcuts) {
  let _block;
  if (event_type instanceof KeyDown) {
    _block = "keydown";
  } else {
    _block = "keyup";
  }
  let event_name = _block;
  let modifier = modifier_key();
  let internal_shortcuts = map(
    shortcuts,
    (shortcut) => {
      let trigger = combination_to_decoded_key(shortcut.combination);
      let prevent_default$1 = contains(
        shortcut.options,
        new PreventDefault()
      );
      let _block$1;
      let _pipe = filter_map(
        shortcut.options,
        (option2) => {
          if (option2 instanceof Exclude) {
            let exclude2 = option2[0];
            return new Ok(toList([exclude2]));
          } else if (option2 instanceof ExcludeInputElements) {
            return new Ok(input_elements);
          } else {
            return new Error(void 0);
          }
        }
      );
      _block$1 = flatten(_pipe);
      let exclude = _block$1;
      return new InternalShortcut(
        trigger,
        shortcut.msg,
        prevent_default$1,
        exclude
      );
    }
  );
  return window_add_event_listener(
    event_name,
    (event4) => {
      let key_event = run(
        event4,
        field(
          "key",
          string2,
          (key) => {
            return field(
              modifier,
              bool,
              (mod) => {
                return field(
                  "shiftKey",
                  bool,
                  (shift) => {
                    return field(
                      "altKey",
                      bool,
                      (alt) => {
                        return field(
                          "code",
                          string2,
                          (code) => {
                            return subfield(
                              toList(["target", "tagName"]),
                              string2,
                              (tag_name) => {
                                return success(
                                  new DecodedKeyEvent(
                                    new DecodedKey(
                                      lowercase(key),
                                      mod,
                                      shift,
                                      alt,
                                      lowercase(code)
                                    ),
                                    tag_name
                                  )
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        )
      );
      if (key_event instanceof Ok) {
        let decoded_key_event = key_event[0];
        let shortcut = find2(
          internal_shortcuts,
          (shortcut2) => {
            return modifiers_match(shortcut2.trigger, decoded_key_event.key) && key_or_code_matches(
              shortcut2.trigger,
              decoded_key_event.key
            ) && !contains(shortcut2.exclude, decoded_key_event.tag_name);
          }
        );
        if (shortcut instanceof Ok) {
          let shortcut$1 = shortcut[0];
          let $ = shortcut$1.prevent_default;
          if ($) {
            prevent_default2(event4);
          } else {
          }
          return dispatch(shortcut$1.msg);
        } else {
          return void 0;
        }
      } else {
        let e = key_event[0];
        return void 0;
      }
    }
  );
}

// build/dev/javascript/gleam_http/gleam/http.mjs
var Get = class extends CustomType {
};
var Post = class extends CustomType {
};
var Head = class extends CustomType {
};
var Put = class extends CustomType {
};
var Delete = class extends CustomType {
};
var Trace = class extends CustomType {
};
var Connect = class extends CustomType {
};
var Options = class extends CustomType {
};
var Patch2 = class extends CustomType {
};
var Http = class extends CustomType {
};
var Https = class extends CustomType {
};
function method_to_string(method) {
  if (method instanceof Get) {
    return "GET";
  } else if (method instanceof Post) {
    return "POST";
  } else if (method instanceof Head) {
    return "HEAD";
  } else if (method instanceof Put) {
    return "PUT";
  } else if (method instanceof Delete) {
    return "DELETE";
  } else if (method instanceof Trace) {
    return "TRACE";
  } else if (method instanceof Connect) {
    return "CONNECT";
  } else if (method instanceof Options) {
    return "OPTIONS";
  } else if (method instanceof Patch2) {
    return "PATCH";
  } else {
    let method$1 = method[0];
    return method$1;
  }
}
function scheme_to_string(scheme) {
  if (scheme instanceof Http) {
    return "http";
  } else {
    return "https";
  }
}
function scheme_from_string(scheme) {
  let $ = lowercase(scheme);
  if ($ === "http") {
    return new Ok(new Http());
  } else if ($ === "https") {
    return new Ok(new Https());
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/gleam_http/gleam/http/request.mjs
var Request = class extends CustomType {
  constructor(method, headers, body, scheme, host, port, path2, query) {
    super();
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.scheme = scheme;
    this.host = host;
    this.port = port;
    this.path = path2;
    this.query = query;
  }
};
function to_uri(request) {
  return new Uri(
    new Some(scheme_to_string(request.scheme)),
    new None(),
    new Some(request.host),
    request.port,
    request.path,
    request.query,
    new None()
  );
}
function from_uri(uri) {
  return try$(
    (() => {
      let _pipe = uri.scheme;
      let _pipe$1 = unwrap(_pipe, "");
      return scheme_from_string(_pipe$1);
    })(),
    (scheme) => {
      return try$(
        (() => {
          let _pipe = uri.host;
          return to_result(_pipe, void 0);
        })(),
        (host) => {
          let req = new Request(
            new Get(),
            toList([]),
            "",
            scheme,
            host,
            uri.port,
            uri.path,
            uri.query
          );
          return new Ok(req);
        }
      );
    }
  );
}
function to(url) {
  let _pipe = url;
  let _pipe$1 = parse2(_pipe);
  return try$(_pipe$1, from_uri);
}

// build/dev/javascript/gleam_http/gleam/http/response.mjs
var Response = class extends CustomType {
  constructor(status, headers, body) {
    super();
    this.status = status;
    this.headers = headers;
    this.body = body;
  }
};

// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
var PromiseLayer = class _PromiseLayer {
  constructor(promise) {
    this.promise = promise;
  }
  static wrap(value2) {
    return value2 instanceof Promise ? new _PromiseLayer(value2) : value2;
  }
  static unwrap(value2) {
    return value2 instanceof _PromiseLayer ? value2.promise : value2;
  }
};
function resolve(value2) {
  return Promise.resolve(PromiseLayer.wrap(value2));
}
function then_await(promise, fn) {
  return promise.then((value2) => fn(PromiseLayer.unwrap(value2)));
}
function map_promise(promise, fn) {
  return promise.then(
    (value2) => PromiseLayer.wrap(fn(PromiseLayer.unwrap(value2)))
  );
}
function rescue(promise, fn) {
  return promise.catch((error) => fn(error));
}

// build/dev/javascript/gleam_javascript/gleam/javascript/promise.mjs
function tap(promise, callback) {
  let _pipe = promise;
  return map_promise(
    _pipe,
    (a2) => {
      callback(a2);
      return a2;
    }
  );
}
function try_await(promise, callback) {
  let _pipe = promise;
  return then_await(
    _pipe,
    (result) => {
      if (result instanceof Ok) {
        let a2 = result[0];
        return callback(a2);
      } else {
        let e = result[0];
        return resolve(new Error(e));
      }
    }
  );
}

// build/dev/javascript/gleam_fetch/gleam_fetch_ffi.mjs
async function raw_send(request) {
  try {
    return new Ok(await fetch(request));
  } catch (error) {
    return new Error(new NetworkError(error.toString()));
  }
}
function from_fetch_response(response) {
  return new Response(
    response.status,
    List.fromArray([...response.headers]),
    response
  );
}
function request_common(request) {
  let url = to_string5(to_uri(request));
  let method = method_to_string(request.method).toUpperCase();
  let options = {
    headers: make_headers(request.headers),
    method
  };
  return [url, options];
}
function to_fetch_request(request) {
  let [url, options] = request_common(request);
  if (options.method !== "GET" && options.method !== "HEAD") options.body = request.body;
  return new globalThis.Request(url, options);
}
function make_headers(headersList) {
  let headers = new globalThis.Headers();
  for (let [k, v] of headersList) headers.append(k.toLowerCase(), v);
  return headers;
}
async function read_text_body(response) {
  let body;
  try {
    body = await response.body.text();
  } catch (error) {
    return new Error(new UnableToReadBody());
  }
  return new Ok(response.withFields({ body }));
}

// build/dev/javascript/gleam_fetch/gleam/fetch.mjs
var NetworkError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UnableToReadBody = class extends CustomType {
};
function send2(request) {
  let _pipe = request;
  let _pipe$1 = to_fetch_request(_pipe);
  let _pipe$2 = raw_send(_pipe$1);
  return try_await(
    _pipe$2,
    (resp) => {
      return resolve(new Ok(from_fetch_response(resp)));
    }
  );
}

// build/dev/javascript/lustre_http/lustre_http.mjs
var BadUrl = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var InternalServerError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var JsonError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var NetworkError2 = class extends CustomType {
};
var NotFound = class extends CustomType {
};
var OtherError = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};
var Unauthorized = class extends CustomType {
};
var ExpectTextResponse = class extends CustomType {
  constructor(run3) {
    super();
    this.run = run3;
  }
};
function do_send(req, expect, dispatch) {
  let _pipe = send2(req);
  let _pipe$1 = try_await(_pipe, read_text_body);
  let _pipe$2 = map_promise(
    _pipe$1,
    (response) => {
      if (response instanceof Ok) {
        let res = response[0];
        return expect.run(new Ok(res));
      } else {
        return expect.run(new Error(new NetworkError2()));
      }
    }
  );
  let _pipe$3 = rescue(
    _pipe$2,
    (_) => {
      return expect.run(new Error(new NetworkError2()));
    }
  );
  tap(_pipe$3, dispatch);
  return void 0;
}
function get2(url, expect) {
  return from(
    (dispatch) => {
      let $ = to(url);
      if ($ instanceof Ok) {
        let req = $[0];
        return do_send(req, expect, dispatch);
      } else {
        return dispatch(expect.run(new Error(new BadUrl(url))));
      }
    }
  );
}
function response_to_result(response) {
  let status = response.status;
  if (200 <= status && status <= 299) {
    let body = response.body;
    return new Ok(body);
  } else {
    let $ = response.status;
    if ($ === 401) {
      return new Error(new Unauthorized());
    } else if ($ === 404) {
      return new Error(new NotFound());
    } else if ($ === 500) {
      let body = response.body;
      return new Error(new InternalServerError(body));
    } else {
      let code = $;
      let body = response.body;
      return new Error(new OtherError(code, body));
    }
  }
}
function expect_json(decoder, to_msg) {
  return new ExpectTextResponse(
    (response) => {
      let _pipe = response;
      let _pipe$1 = then$(_pipe, response_to_result);
      let _pipe$2 = then$(
        _pipe$1,
        (body) => {
          let $ = parse(body, decoder);
          if ($ instanceof Ok) {
            return $;
          } else {
            let json_error = $[0];
            return new Error(new JsonError(json_error));
          }
        }
      );
      return to_msg(_pipe$2);
    }
  );
}

// build/dev/javascript/viz/components/flow_map.ffi.mjs
var CONFIG = {
  nodeRadius: 1.5,
  mapHeight: 0.6,
  // 60% of window height
  animationDuration: 150,
  pathAnimationDuration: 150,
  hoverDuration: 200,
  bundleBeta: 0.9,
  alphaDecay: 0.1,
  chargeStrength: 3,
  linkStrength: 3,
  chargeDistanceMax: 50,
  hoverStrokeWidth: 2.5,
  arrowSize: 3
};
var SCALES = {
  pathThickness: d3.scaleLinear().range([0.4, 2]),
  segments: d3.scaleLinear().domain([0, 500]).range([1, 8])
};
var COLORS = {
  node: "#1f2937",
  nodeStroke: "#ffffff",
  tempNode: "#6b7280",
  path: "#4b5563",
  country: "#9ca3af",
  countryStroke: "#f3f4f6",
  text: "#1f2937",
  legendBackground: "rgba(255, 255, 255, 0.5)",
  labelBackground: "rgba(255, 255, 255, 0)",
  labelBackgroundHover: "rgba(255, 255, 255, 0.5)",
  labelBackgroundDrag: "rgba(255, 255, 255, 0.8)"
};
var STYLES = {
  fontFamily: "Arial, sans-serif",
  fontSize: "4px",
  strokeWidth: {
    node: 0.5,
    country: 0.25
  }
};
var flowMap = {
  svg: null,
  g: null,
  countries: null,
  nodesList: null,
  pathsList: null,
  projection: null,
  tempNode: null,
  forceLayout: null,
  initialised: false,
  bundleData: { nodes: [], links: [], paths: [] }
};
var messageDispatch = null;
function initFlowMap() {
  if (flowMap.initialised) return null;
  requestAnimationFrame(() => {
    const flowMapElement = document.querySelector("flow-map");
    const isHidden = flowMapElement.closest(".hidden") !== null;
    if (isHidden) {
      initFlowMap();
      return;
    }
    const element6 = flowMapElement.shadowRoot?.getElementById("flow-map");
    if (element6) {
      createMap();
      flowMap.initialised = true;
    } else {
      initFlowMap();
    }
  });
  return null;
}
function setDispatch(dispatch) {
  messageDispatch = dispatch;
  return null;
}
function addNode(nodeId, lat, lon, nodeLabel) {
  if (!isMapReady()) {
    requestAnimationFrame(() => addNode(nodeId, lat, lon, nodeLabel));
    return null;
  }
  removeTempNode();
  removeExistingNode(nodeId);
  const [x, y] = flowMap.projection([lon, lat]);
  const nodeGroup = createNodeGroup(nodeId, x, y);
  setupNodeVisuals(nodeGroup, nodeLabel);
  setupNodeInteraction(nodeGroup, nodeId);
  animateNodeIn(nodeGroup);
  return null;
}
function editNode(nodeId, lat, lon, nodeLabel) {
  if (!isMapReady()) {
    requestAnimationFrame(() => editNode(nodeId, lat, lon, nodeLabel));
    return null;
  }
  removeTempNode();
  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }
  const [x, y] = flowMap.projection([lon, lat]);
  updateNodePosition(existingNode, x, y);
  updateNodeLabel(existingNode, nodeLabel);
  updatePathsForNode(nodeId, lat, lon);
  return null;
}
function deleteNode(nodeId) {
  if (!flowMap.initialised || !flowMap.nodesList) {
    console.warn("Cannot delete node: map not initialised or no nodes exist");
    return null;
  }
  const existingNode = flowMap.nodesList.select(`#${nodeId}`);
  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }
  const connectedPaths = flowMap.bundleData.paths.filter(
    (path2) => path2.source.id === nodeId || path2.target.id === nodeId
  );
  connectedPaths.forEach((path2) => {
    removeBundleData(path2.id);
    const pathElement = flowMap.pathsList?.select(`#${path2.id}`);
    if (pathElement && !pathElement.empty()) {
      pathElement.remove();
    }
    const hoverElement = flowMap.pathsList?.select(
      `path.flow-hover[data-path-id="${path2.id}"]`
    );
    if (hoverElement && !hoverElement.empty()) {
      hoverElement.remove();
    }
  });
  if (flowMap.bundleData.paths.length > 0) {
    regenerateBundling();
  }
  animateNodeOut(existingNode);
  return null;
}
function addPath(pathId, originNodeId, destinationNodeId, value2) {
  if (!isPathCreationReady()) {
    requestAnimationFrame(
      () => addPath(pathId, originNodeId, destinationNodeId, value2)
    );
    return null;
  }
  removeTempNode();
  const { originCoords, destinationCoords } = getNodeCoordinates(
    originNodeId,
    destinationNodeId
  );
  if (!originCoords || !destinationCoords) {
    console.warn(
      `Cannot create path: nodes ${originNodeId} or ${destinationNodeId} not found`
    );
    return null;
  }
  ensurePathsGroup();
  removeExistingPath(pathId);
  addToBundleData(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value2
  );
  regenerateBundling();
  return null;
}
function editPath(pathId, originNodeId, destinationNodeId, value2) {
  if (!isPathCreationReady()) return null;
  removeTempNode();
  const { originCoords, destinationCoords } = getNodeCoordinates(
    originNodeId,
    destinationNodeId
  );
  if (!originCoords || !destinationCoords) {
    console.warn(
      `Cannot edit path: nodes ${originNodeId} or ${destinationNodeId} not found`
    );
    return null;
  }
  updateBundleDataPath(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value2
  );
  regenerateBundling();
  return null;
}
function deletePath(pathId) {
  if (!flowMap.initialised || !flowMap.pathsList) {
    console.warn("Cannot delete path: map not initialised or no paths exist");
    return null;
  }
  removeTempNode();
  const existingPath = flowMap.pathsList.select(`#${pathId}`);
  if (!existingPath.empty()) {
    animatePathOut(existingPath);
    const hoverPath = flowMap.pathsList.selectAll("path.flow-hover").filter((d) => d.id === pathId);
    if (!hoverPath.empty()) {
      hoverPath.remove();
    }
    removeBundleData(pathId);
    regenerateBundling();
  } else {
    console.warn(`Path with id ${pathId} not found`);
  }
  return null;
}
function removeTempNode() {
  if (flowMap.tempNode) {
    flowMap.tempNode.remove();
    flowMap.tempNode = null;
  }
}
function showTempNodeAtCoords(lat, lon) {
  if (!flowMap.projection) {
    requestAnimationFrame(() => showTempNodeAtCoords(lat, lon));
    return null;
  }
  removeTempNode();
  const [x, y] = flowMap.projection([lon, lat]);
  createTempNode(x, y);
  return null;
}
function downloadModelData(gleamJsonData) {
  const gleamState = JSON.parse(gleamJsonData);
  const d3State = {
    nodes: [],
    paths: []
  };
  if (flowMap.nodesList) {
    flowMap.nodesList.selectAll(".node").each(function() {
      const nodeElement = d3.select(this);
      const nodeId = nodeElement.attr("id");
      const transform = nodeElement.attr("transform");
      const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
      if (match && flowMap.projection) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const [lon, lat] = flowMap.projection.invert([x, y]);
        const labelGroup = nodeElement.select(".label-group");
        const labelText = labelGroup.select("text");
        const labelDx = parseFloat(labelText.attr("dx")) || 0;
        const labelDy = parseFloat(labelText.attr("dy")) || -6;
        d3State.nodes.push({
          id: nodeId,
          lat,
          lon,
          x,
          y,
          labelDx,
          labelDy
        });
      }
    });
  }
  if (flowMap.pathsList) {
    flowMap.pathsList.selectAll(".flow").each(function() {
      const pathElement = d3.select(this);
      const pathId = pathElement.attr("id");
      d3State.paths.push({
        id: pathId
      });
    });
  }
  const combinedData = {
    gleam_state: gleamState,
    d3_state: d3State
  };
  const jsonData = JSON.stringify(combinedData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement("a");
  a2.href = url;
  a2.download = `flow-map-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a2);
  a2.click();
  document.body.removeChild(a2);
  URL.revokeObjectURL(url);
}
function setupFileImport(dispatch) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("flow-map").shadowRoot;
    const fileInput = shadowRoot.querySelector("#import-file");
    if (!fileInput) {
      setupFileImport(dispatch);
      return;
    }
    fileInput.addEventListener("change", (event4) => {
      const file = event4.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const combinedData = JSON.parse(e.target.result);
            if (combinedData.d3_state && combinedData.gleam_state) {
              window.pendingD3State = combinedData.d3_state;
              dispatch(`import:${JSON.stringify(combinedData.gleam_state)}`);
            } else {
              console.error("Invalid file format");
            }
          } catch (error) {
            console.error("Failed to parse import file:", error);
          }
        };
        reader.readAsText(file);
      }
    });
    const fileLabel = shadowRoot.querySelector('label[for="import-file"]');
    if (fileLabel) {
      fileLabel.addEventListener("keydown", (event4) => {
        if (event4.key === "Enter" || event4.key === " ") {
          event4.preventDefault();
          fileInput.click();
        }
      });
    }
  });
}
function restoreD3State(nodes2, paths) {
  const d3State = window.pendingD3State;
  clearFlowMap();
  nodes2.toArray().forEach((node) => {
    const nodeState = d3State?.nodes.find((n) => n.id === node.node_id);
    addNode(node.node_id, node.lat, node.lon, node.node_label);
    if (nodeState && (nodeState.labelDx !== 0 || nodeState.labelDy !== -6)) {
      requestAnimationFrame(() => {
        const nodeElement = flowMap.nodesList.select(`#${node.node_id}`);
        if (!nodeElement.empty()) {
          const labelGroup = nodeElement.select(".label-group");
          const labelText = labelGroup.select("text");
          const rect = labelGroup.select("rect");
          labelText.attr("dx", nodeState.labelDx).attr("dy", nodeState.labelDy);
          if (!rect.empty()) {
            const bbox = labelText.node().getBBox();
            rect.attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2);
          }
        }
      });
    }
  });
  paths.toArray().forEach((path2) => {
    addPath(
      path2.path_id,
      path2.origin_node_id,
      path2.destination_node_id,
      path2.value
    );
  });
  if (window.pendingD3State) {
    delete window.pendingD3State;
  }
}
function exportMapAsPNG() {
  if (!flowMap.svg || !flowMap.initialised) {
    console.warn("Map not ready for export");
    return null;
  }
  const svgNode = flowMap.svg.node();
  const clonedSvg = svgNode.cloneNode(true);
  const currentTransform = flowMap.g.attr("transform");
  const clonedGroup = clonedSvg.querySelector("g");
  if (clonedGroup && currentTransform) {
    clonedGroup.setAttribute("transform", currentTransform);
  }
  const bbox = flowMap.g.node().getBBox();
  const padding = 40;
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;
  clonedSvg.setAttribute(
    "viewBox",
    `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`
  );
  clonedSvg.setAttribute("width", width);
  clonedSvg.setAttribute("height", height);
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", bbox.x - padding);
  rect.setAttribute("y", bbox.y - padding);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", "white");
  clonedGroup.insertBefore(rect, clonedGroup.firstChild);
  clonedSvg.style.cursor = "default";
  if (!clonedSvg.getAttribute("xmlns")) {
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const scale = 15;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8"
  });
  const url = URL.createObjectURL(svgBlob);
  img.onload = function() {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function(blob) {
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `flow-map-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = url;
  return null;
}
function createNodeGroup(nodeId, x, y) {
  ensureNodesGroup();
  return flowMap.nodesList.append("g").attr("class", "node").attr("id", nodeId).attr("transform", `translate(${x}, ${y})`);
}
function setupNodeVisuals(nodeGroup, nodeLabel) {
  createNodeCircle(nodeGroup);
  createNodeLabel(nodeGroup, nodeLabel);
}
function createNodeCircle(nodeGroup) {
  nodeGroup.append("circle").attr("r", CONFIG.nodeRadius).attr("stroke", COLORS.nodeStroke).attr("stroke-width", STYLES.strokeWidth.node).attr("fill", COLORS.node).style("cursor", "pointer");
}
function createNodeLabel(nodeGroup, nodeLabel) {
  const labelGroup = nodeGroup.append("g").attr("class", "label-group");
  const labelText = labelGroup.append("text").attr("dy", -6).attr("text-anchor", "middle").style("font-size", STYLES.fontSize).style("font-family", STYLES.fontFamily).style("fill", COLORS.text).style("cursor", "pointer").text(nodeLabel);
  if (nodeLabel && nodeLabel.trim() !== "") {
    createLabelBackground(labelGroup, labelText);
  }
  setupLabelDragBehavior(labelGroup, labelText);
}
function createLabelBackground(labelGroup, labelText) {
  const bbox = labelText.node().getBBox();
  const rect = labelGroup.insert("rect", "text").attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2).attr("fill", COLORS.labelBackground).attr("rx", 2).style("cursor", "move");
  return rect;
}
function setupNodeInteraction(nodeGroup, nodeId) {
  nodeGroup.on("mouseover", function() {
    animateNodeHover(d3.select(this), true);
  }).on("mouseout", function() {
    animateNodeHover(d3.select(this), false);
  }).on("mousedown", function(event4) {
    if (event4.target.tagName === "circle") {
      event4.stopPropagation();
      if (messageDispatch) {
        messageDispatch("node_id:" + nodeId);
      }
    }
  });
}
function setupLabelDragBehavior(labelGroup, labelText) {
  const nodeId = labelGroup.node().parentNode.id;
  const drag = createLabelDragBehavior(nodeId);
  labelText.call(drag);
  const rect = labelGroup.select("rect");
  if (!rect.empty()) {
    rect.call(drag);
  }
}
function animateNodeHover(nodeGroup, isHover) {
  const scale = isHover ? 2 : 1;
  const opacity = isHover ? 0.5 : 0;
  nodeGroup.select("circle").transition().duration(CONFIG.hoverDuration).attr("r", CONFIG.nodeRadius * scale);
  nodeGroup.select(".label-group rect").transition().duration(CONFIG.hoverDuration).attr(
    "fill",
    isHover ? COLORS.labelBackgroundHover : COLORS.labelBackground
  );
}
function animateNodeIn(nodeGroup) {
  nodeGroup.style("opacity", 0).transition().duration(CONFIG.animationDuration).style("opacity", 1);
}
function animateNodeOut(nodeGroup) {
  nodeGroup.transition().duration(CONFIG.animationDuration).style("opacity", 0).remove();
}
function updateNodePosition(existingNode, x, y) {
  existingNode.transition().duration(CONFIG.animationDuration).attr("transform", `translate(${x}, ${y})`);
}
function updateNodeLabel(existingNode, nodeLabel) {
  const labelGroup = existingNode.select(".label-group");
  const labelText = labelGroup.select("text");
  const currentDx = parseFloat(labelText.attr("dx")) || 0;
  const currentDy = parseFloat(labelText.attr("dy")) || -6;
  labelText.text(nodeLabel).attr("dx", currentDx).attr("dy", currentDy);
  updateLabelBackground(labelGroup, labelText, nodeLabel);
  updateLabelDragBehavior(labelGroup, labelText);
}
function updateLabelBackground(labelGroup, labelText, nodeLabel) {
  let rectElement = labelGroup.select("rect");
  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();
    if (rectElement.empty()) {
      rectElement = createLabelBackground(labelGroup, labelText);
      const nodeId = labelGroup.node().parentNode.id;
      const dragBehavior = createLabelDragBehavior(nodeId);
      rectElement.call(dragBehavior);
    }
    rectElement.attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2);
  } else if (!rectElement.empty()) {
    rectElement.remove();
  }
}
function updateLabelDragBehavior(labelGroup, labelText) {
  const nodeId = labelGroup.node().parentNode.id;
  if (!labelText.node().__on) {
    const dragBehavior = createLabelDragBehavior(nodeId);
    labelText.call(dragBehavior);
    const rectElement = labelGroup.select("rect");
    if (!rectElement.empty()) {
      rectElement.call(dragBehavior);
    }
  }
}
function createLabelDragBehavior(nodeId) {
  return d3.drag().on("start", function(event4) {
    event4.sourceEvent.stopPropagation();
    d3.select(this.parentNode).select("rect").transition().duration(100).attr("fill", COLORS.labelBackgroundDrag);
  }).on("drag", function(event4) {
    const labelGroup = d3.select(this.parentNode);
    const textElement = labelGroup.select("text");
    const rectElement = labelGroup.select("rect");
    textElement.attr("dx", event4.x).attr("dy", event4.y);
    if (!rectElement.empty()) {
      const bbox = textElement.node().getBBox();
      rectElement.attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2);
    }
  }).on("end", function(event4) {
    d3.select(this.parentNode).select("rect").transition().duration(100).attr("fill", COLORS.labelBackground);
    const textElement = d3.select(this);
    const dx = parseFloat(textElement.attr("dx")) || 0;
    const dy = parseFloat(textElement.attr("dy")) || -6;
    if (messageDispatch) {
      messageDispatch(`label_moved:${nodeId}:${dx}:${dy}`);
    }
  });
}
function createTempNode(mouseX, mouseY) {
  ensureNodesGroup();
  flowMap.tempNode = flowMap.nodesList.append("circle").attr("cx", mouseX).attr("cy", mouseY).attr("r", CONFIG.nodeRadius).attr("fill", COLORS.tempNode).attr("stroke", COLORS.nodeStroke).attr("stroke-width", STYLES.strokeWidth.node).attr("opacity", 0.7);
}
function createPathElements() {
  const line = d3.line().curve(d3.curveBundle.beta(CONFIG.bundleBeta)).x((d) => d.x).y((d) => d.y);
  clearExistingPaths();
  const hoverAreas = createHoverAreas(line);
  const visiblePaths = createVisiblePaths(line);
  return { hoverAreas, visiblePaths, line };
}
function clearExistingPaths() {
  flowMap.pathsList.selectAll("path.flow").remove();
  flowMap.pathsList.selectAll("path.flow-hover").remove();
}
function createHoverAreas(line) {
  return flowMap.pathsList.selectAll("path.flow-hover").data(flowMap.bundleData.paths).enter().append("path").attr("d", (d) => line(d.segments)).attr("class", "flow-hover").attr("fill", "none").attr("data-path-id", (d) => d.id).attr("stroke", "transparent").attr("stroke-width", CONFIG.hoverStrokeWidth).style("cursor", "pointer").on("mouseover", handlePathHover).on("mouseout", handlePathUnhover).on("click", handlePathClick);
}
function createVisiblePaths(line) {
  return flowMap.pathsList.selectAll("path.flow").data(flowMap.bundleData.paths).enter().append("path").attr("d", (d) => line(d.segments)).attr("class", "flow").attr("id", (d) => d.id).attr("fill", "none").attr("stroke", COLORS.path).attr("stroke-width", (d) => SCALES.pathThickness(d.value)).attr("marker-mid", "url(#arrowhead)").style("pointer-events", "none");
}
function handlePathHover(event4, d) {
  flowMap.pathsList.select(`path.flow#${d.id}`).transition().duration(CONFIG.hoverDuration).attr("stroke-width", SCALES.pathThickness(d.value) + 1);
}
function handlePathUnhover(event4, d) {
  flowMap.pathsList.select(`path.flow#${d.id}`).transition().duration(CONFIG.hoverDuration).attr("stroke-width", SCALES.pathThickness(d.value));
}
function handlePathClick(event4, d) {
  event4.stopPropagation();
  removeTempNode();
  if (messageDispatch) {
    messageDispatch("path_id:" + d.id);
  }
}
function animatePathsIn(visiblePaths) {
  const pathLengths = visiblePaths.nodes().map((node) => node.getTotalLength());
  visiblePaths.attr("stroke-dasharray", (d, i) => `${pathLengths[i]} ${pathLengths[i]}`).attr("stroke-dashoffset", (d, i) => pathLengths[i]).transition().duration(CONFIG.pathAnimationDuration).attr("stroke-dashoffset", 0).on("end", function() {
    d3.select(this).attr("stroke-dasharray", "none");
  });
}
function animatePathOut(pathElement) {
  pathElement.transition().duration(CONFIG.animationDuration).style("opacity", 0).remove();
}
function addToBundleData(pathId, originCoords, destinationCoords, fromNodeId, toNodeId, value2) {
  const pathData = {
    id: pathId,
    source: {
      ...originCoords,
      id: fromNodeId,
      fx: originCoords.x,
      fy: originCoords.y
    },
    target: {
      ...destinationCoords,
      id: toNodeId,
      fx: destinationCoords.x,
      fy: destinationCoords.y
    }
  };
  const segments = generateSegments(pathData);
  flowMap.bundleData.paths.push({
    id: pathId,
    value: value2,
    segments: segments.local,
    source: pathData.source,
    target: pathData.target
  });
  flowMap.bundleData.nodes.push(...segments.nodes);
  flowMap.bundleData.links.push(...segments.links);
}
function updateBundleDataPath(pathId, originCoords, destinationCoords, originNodeId, destinationNodeId, value2) {
  const pathIndex = flowMap.bundleData.paths.findIndex((p2) => p2.id === pathId);
  if (pathIndex === -1) {
    console.warn(`Path ${pathId} not found for editing`);
    return;
  }
  removeBundleData(pathId);
  addToBundleData(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value2
  );
}
function removeBundleData(pathId) {
  const pathIndex = flowMap.bundleData.paths.findIndex((p2) => p2.id === pathId);
  if (pathIndex === -1) return;
  const pathToRemove = flowMap.bundleData.paths[pathIndex];
  removePathSegments(pathToRemove);
  removePathLinks(pathToRemove);
  flowMap.bundleData.paths.splice(pathIndex, 1);
}
function removePathSegments(pathToRemove) {
  pathToRemove.segments.forEach((segment) => {
    if (segment.generated) {
      const nodeIndex = flowMap.bundleData.nodes.findIndex(
        (n) => n === segment
      );
      if (nodeIndex !== -1) {
        flowMap.bundleData.nodes.splice(nodeIndex, 1);
      }
    }
  });
}
function removePathLinks(pathToRemove) {
  flowMap.bundleData.links = flowMap.bundleData.links.filter(
    (link) => !pathToRemove.segments.includes(link.source) && !pathToRemove.segments.includes(link.target)
  );
}
function generateSegments(pathData) {
  const length4 = calculateDistance(pathData.source, pathData.target);
  const segmentCount = Math.round(SCALES.segments(length4));
  const xScale = d3.scaleLinear().domain([0, segmentCount + 1]).range([pathData.source.x, pathData.target.x]);
  const yScale = d3.scaleLinear().domain([0, segmentCount + 1]).range([pathData.source.y, pathData.target.y]);
  let source = pathData.source;
  const local = [source];
  const nodes2 = [];
  const links2 = [];
  for (let i = 1; i <= segmentCount; i++) {
    const target = {
      x: xScale(i),
      y: yScale(i),
      generated: true
    };
    local.push(target);
    nodes2.push(target);
    links2.push({ source, target });
    source = target;
  }
  local.push(pathData.target);
  links2.push({ source, target: pathData.target });
  return { local, nodes: nodes2, links: links2 };
}
function updatePathsForNode(nodeId, lat, lon) {
  const connectedPaths = flowMap.bundleData.paths.filter(
    (path2) => path2.source.id === nodeId || path2.target.id === nodeId
  );
  if (connectedPaths.length === 0) return;
  const [x, y] = flowMap.projection([lon, lat]);
  const newCoords = { x, y };
  connectedPaths.forEach((pathData) => {
    updatePathNodePosition(pathData, nodeId, newCoords, x, y);
    regeneratePathSegments(pathData);
  });
  regenerateBundling();
}
function updatePathNodePosition(pathData, nodeId, newCoords, x, y) {
  const pathIndex = flowMap.bundleData.paths.findIndex(
    (p2) => p2.id === pathData.id
  );
  if (pathIndex !== -1) {
    const pathToRemove = flowMap.bundleData.paths[pathIndex];
    removePathSegments(pathToRemove);
    removePathLinks(pathToRemove);
  }
  if (pathData.source.id === nodeId) {
    pathData.source = { ...newCoords, id: nodeId, fx: x, fy: y };
  }
  if (pathData.target.id === nodeId) {
    pathData.target = { ...newCoords, id: nodeId, fx: x, fy: y };
  }
}
function regeneratePathSegments(pathData) {
  const segments = generateSegments({
    id: pathData.id,
    source: pathData.source,
    target: pathData.target
  });
  pathData.segments = segments.local;
  flowMap.bundleData.nodes.push(...segments.nodes);
  flowMap.bundleData.links.push(...segments.links);
}
function regenerateBundling() {
  if (flowMap.bundleData.paths.length === 0) {
    stopForceLayout();
    return;
  }
  updatePathScales();
  const { hoverAreas, visiblePaths, line } = createPathElements();
  setupForceLayout(visiblePaths, hoverAreas, line);
  animatePathsIn(visiblePaths);
  requestAnimationFrame(() => {
    createLegend();
  });
}
function updatePathScales() {
  const totalSum = flowMap.bundleData.paths.reduce(
    (sum, path2) => sum + path2.value,
    0
  );
  SCALES.pathThickness.domain([0, totalSum]);
}
function setupForceLayout(visiblePaths, hoverAreas, line) {
  visiblePaths.style("opacity", 0);
  hoverAreas.style("opacity", 0);
  stopForceLayout();
  flowMap.forceLayout = d3.forceSimulation().alphaDecay(CONFIG.alphaDecay).randomSource(d3.randomLcg(42)).force(
    "charge",
    d3.forceManyBody().strength(CONFIG.chargeStrength).distanceMax(CONFIG.chargeDistanceMax)
  ).force("link", d3.forceLink().strength(CONFIG.linkStrength).distance(1)).on("tick", function() {
    visiblePaths.attr("d", (d) => line(d.segments));
    hoverAreas.attr("d", (d) => line(d.segments));
  }).on("end", function() {
    visiblePaths.transition().duration(CONFIG.pathAnimationDuration).style("opacity", 1);
    hoverAreas.transition().duration(CONFIG.pathAnimationDuration).style("opacity", 1);
  });
  flowMap.forceLayout.nodes(flowMap.bundleData.nodes).force("link").links(flowMap.bundleData.links);
}
function stopForceLayout() {
  if (flowMap.forceLayout) {
    flowMap.forceLayout.stop();
  }
}
function isMapReady() {
  return flowMap.initialised && flowMap.projection;
}
function isPathCreationReady() {
  return flowMap.initialised && flowMap.projection && flowMap.nodesList;
}
function ensureNodesGroup() {
  if (!flowMap.nodesList) {
    flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
  }
}
function ensurePathsGroup() {
  if (!flowMap.pathsList) {
    flowMap.pathsList = flowMap.g.insert("g", ".nodes").attr("class", "paths");
  }
}
function removeExistingNode(nodeId) {
  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (existingNode && !existingNode.empty()) {
    existingNode.remove();
  }
}
function removeExistingPath(pathId) {
  const existingPath = flowMap.pathsList?.select(`#${pathId}`);
  if (existingPath && !existingPath.empty()) {
    existingPath.remove();
    removeBundleData(pathId);
  }
}
function getNodeCoordinates(originNodeId, destinationNodeId) {
  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);
  if (originNode.empty() || destinationNode.empty()) {
    return { originCoords: null, destinationCoords: null };
  }
  const originCoords = parseTransform(originNode.attr("transform"));
  const destinationCoords = parseTransform(destinationNode.attr("transform"));
  return { originCoords, destinationCoords };
}
function parseTransform(transform) {
  if (!transform) return null;
  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
  return match ? {
    x: parseFloat(match[1]),
    y: parseFloat(match[2])
  } : null;
}
function calculateDistance(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function clearFlowMap() {
  if (flowMap.g) {
    flowMap.g.selectAll(".node").remove();
    flowMap.g.selectAll(".flow").remove();
    flowMap.svg.selectAll(".legend").remove();
    flowMap.bundleData = { nodes: [], links: [], paths: [] };
    stopForceLayout();
  }
}
function createLegend() {
  flowMap.svg.selectAll(".legend").remove();
  if (flowMap.bundleData.paths.length === 0) return;
  const legendGroup = flowMap.svg.append("g").attr("class", "legend");
  const maxValue = SCALES.pathThickness.domain()[1];
  const minValue = SCALES.pathThickness.domain()[0];
  const legendValues = [
    minValue,
    maxValue * 0.25,
    maxValue * 0.5,
    maxValue * 0.75,
    maxValue
  ].filter((v) => v > 0);
  const legendX = 15;
  const legendY = flowMap.svg.attr("height") - 70;
  const legendHeight = legendValues.length * 12 + 20;
  legendGroup.append("rect").attr("x", legendX - 5).attr("y", legendY - 15).attr("width", 100).attr("height", legendHeight).attr("fill", COLORS.legendBackground).attr("stroke", COLORS.node).attr("stroke-width", 0.5).attr("rx", 2);
  legendGroup.append("text").attr("x", legendX).attr("y", legendY - 5).style("font-size", "5px").style("font-family", STYLES.fontFamily).style("font-weight", "bold").style("fill", COLORS.text).text("Flow Value");
  legendValues.forEach((value2, i) => {
    const y = legendY + 5 + i * 12;
    legendGroup.append("line").attr("x1", legendX).attr("y1", y).attr("x2", legendX + 20).attr("y2", y).attr("stroke", COLORS.path).attr("stroke-width", SCALES.pathThickness(value2));
    legendGroup.append("text").attr("x", legendX + 25).attr("y", y + 1.5).style("font-size", "4px").style("font-family", STYLES.fontFamily).style("fill", COLORS.text).text(Math.round(value2).toLocaleString());
  });
}
function createMap() {
  const shadowRoot = document.querySelector("flow-map").shadowRoot;
  const flowMapDiv = shadowRoot.getElementById("flow-map");
  const width = flowMapDiv.clientWidth;
  const height = window.innerHeight * CONFIG.mapHeight;
  setupSVG(shadowRoot, width, height);
  setupZoomBehavior();
  setupMapInteraction();
  setupProjection(width, height);
  loadWorldData(width, height);
  window.addEventListener("resize", () => {
    const newWidth = flowMapDiv.clientWidth;
    const newHeight = window.innerHeight * 0.6;
    flowMap.svg.style("width", newWidth).attr("height", newHeight);
  });
}
function setupSVG(shadowRoot, width, height) {
  flowMap.svg = d3.select(shadowRoot.getElementById("flow-map")).append("svg").attr("width", "100%").style("width", width).attr("height", height).style("cursor", "crosshair");
  flowMap.g = flowMap.svg.append("g");
  flowMap.svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "0 -5 10 10").attr("refX", 5).attr("refY", 0).attr("markerWidth", CONFIG.arrowSize).attr("markerHeight", CONFIG.arrowSize).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", COLORS.path);
}
function setupZoomBehavior() {
  const zoom = d3.zoom().scaleExtent([0.1, 200]).on("zoom", (event4) => {
    flowMap.g.attr("transform", event4.transform);
  }).on("end", (event4) => {
    flowMap.g.attr("transform", `${event4.transform} translate(0, 0)`);
    requestAnimationFrame(() => {
      flowMap.g.attr("transform", event4.transform);
    });
  });
  flowMap.svg.call(zoom);
}
function setupMapInteraction() {
  flowMap.svg.on("click", function(event4) {
    if (isInteractiveElement(event4.target)) return;
    const [mouseX, mouseY] = d3.pointer(event4, flowMap.g.node());
    if (flowMap.projection) {
      const [lon, lat] = flowMap.projection.invert([mouseX, mouseY]);
      removeTempNode();
      createTempNode(mouseX, mouseY);
      if (messageDispatch) {
        messageDispatch(`coords:${lat},${lon}`);
      }
    }
  });
}
function isInteractiveElement(target) {
  return ["circle", "text", "rect"].includes(target.tagName);
}
function setupProjection(width, height) {
  flowMap.projection = d3.geoNaturalEarth1();
}
function loadWorldData(width, height) {
  const path2 = d3.geoPath().projection(flowMap.projection);
  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  ).then((world) => {
    flowMap.countries = topojson.feature(world, world.objects.countries);
    flowMap.projection.fitSize([width, height], flowMap.countries);
    renderWorldMap(path2);
  });
}
function renderWorldMap(path2) {
  flowMap.g.selectAll("path").data(flowMap.countries.features).enter().append("path").attr("d", path2).attr("fill", COLORS.country).attr("stroke", COLORS.countryStroke).attr("stroke-width", STYLES.strokeWidth.country);
}

// build/dev/javascript/viz/components/utils.ffi.mjs
function focusRootById(root3, element_id) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector(root3)?.shadowRoot;
    const element6 = shadowRoot?.getElementById(element_id);
    if (element6) {
      element6.focus();
    } else if (!element6) {
      focusRootById(root3, element_id);
    }
  });
  return null;
}

// build/dev/javascript/viz/components/flow_map.mjs
var Model = class extends CustomType {
  constructor(form3, current_form, actions, next_node_id, next_path_id, nodes2, paths, selected_coords, selected_node) {
    super();
    this.form = form3;
    this.current_form = current_form;
    this.actions = actions;
    this.next_node_id = next_node_id;
    this.next_path_id = next_path_id;
    this.nodes = nodes2;
    this.paths = paths;
    this.selected_coords = selected_coords;
    this.selected_node = selected_node;
  }
};
var SelectCoords = class extends CustomType {
  constructor(lat, lon) {
    super();
    this.lat = lat;
    this.lon = lon;
  }
};
var NodeSelected = class extends CustomType {
  constructor(node_id) {
    super();
    this.node_id = node_id;
  }
};
var StartNodeForm = class extends CustomType {
  constructor(node_id) {
    super();
    this.node_id = node_id;
  }
};
var NodeFormSubmit = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var StartPathForm = class extends CustomType {
  constructor(path_id) {
    super();
    this.path_id = path_id;
  }
};
var PathFormSubmit = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var LocationSearch = class extends CustomType {
  constructor(query) {
    super();
    this.query = query;
  }
};
var LocationSearchResult = class extends CustomType {
  constructor(result) {
    super();
    this.result = result;
  }
};
var DeleteNode = class extends CustomType {
  constructor(node_id) {
    super();
    this.node_id = node_id;
  }
};
var DeletePath = class extends CustomType {
  constructor(path_id) {
    super();
    this.path_id = path_id;
  }
};
var Undo = class extends CustomType {
};
var ResetForm = class extends CustomType {
};
var DownloadModel = class extends CustomType {
};
var ImportModel = class extends CustomType {
  constructor(json_data) {
    super();
    this.json_data = json_data;
  }
};
var ExportMap = class extends CustomType {
};
var ClearMap = class extends CustomType {
};
var GenerateRandomMap = class extends CustomType {
};
var Node = class extends CustomType {
  constructor(node_id, lat, lon, node_label) {
    super();
    this.node_id = node_id;
    this.lat = lat;
    this.lon = lon;
    this.node_label = node_label;
  }
};
var Path = class extends CustomType {
  constructor(path_id, origin_node_id, destination_node_id, value2) {
    super();
    this.path_id = path_id;
    this.origin_node_id = origin_node_id;
    this.destination_node_id = destination_node_id;
    this.value = value2;
  }
};
var LocationResult = class extends CustomType {
  constructor(lat, lon, name2) {
    super();
    this.lat = lat;
    this.lon = lon;
    this.name = name2;
  }
};
var NewNodeForm = class extends CustomType {
};
var EditNodeForm = class extends CustomType {
  constructor(node_id) {
    super();
    this.node_id = node_id;
  }
};
var NewPathForm = class extends CustomType {
};
var EditPathForm = class extends CustomType {
  constructor(node_id) {
    super();
    this.node_id = node_id;
  }
};
var NoForm = class extends CustomType {
};
var NodeFormData = class extends CustomType {
  constructor(lat, lon, node_label) {
    super();
    this.lat = lat;
    this.lon = lon;
    this.node_label = node_label;
  }
};
var PathFormData = class extends CustomType {
  constructor(origin_node_id, destination_node_id, value2) {
    super();
    this.origin_node_id = origin_node_id;
    this.destination_node_id = destination_node_id;
    this.value = value2;
  }
};
var EmptyForm = class extends CustomType {
};
var NewNode = class extends CustomType {
  constructor(node) {
    super();
    this.node = node;
  }
};
var EditNode = class extends CustomType {
  constructor(new$9, previous) {
    super();
    this.new = new$9;
    this.previous = previous;
  }
};
var RemoveNode = class extends CustomType {
  constructor(node, deleted_paths) {
    super();
    this.node = node;
    this.deleted_paths = deleted_paths;
  }
};
var NewPath = class extends CustomType {
  constructor(path2) {
    super();
    this.path = path2;
  }
};
var EditPath = class extends CustomType {
  constructor(new$9, previous) {
    super();
    this.new = new$9;
    this.previous = previous;
  }
};
var RemovePath = class extends CustomType {
  constructor(path2) {
    super();
    this.path = path2;
  }
};
var GenerateMap = class extends CustomType {
  constructor(previous_model) {
    super();
    this.previous_model = previous_model;
  }
};
var ResetMap = class extends CustomType {
  constructor(previous_model) {
    super();
    this.previous_model = previous_model;
  }
};
function element4() {
  return element2("flow-map", toList([]), toList([]));
}
function get_node_by_id(model, node_id) {
  return find2(model.nodes, (node) => {
    return node.node_id === node_id;
  });
}
function create_new_node(model, lat, lon, node_label) {
  let node_id = "node-id-" + to_string(model.next_node_id);
  let node = new Node(node_id, lat, lon, node_label);
  let updated_model = new Model(
    model.form,
    model.current_form,
    prepend(new NewNode(node), model.actions),
    model.next_node_id + 1,
    model.next_path_id,
    prepend(node, model.nodes),
    model.paths,
    new None(),
    model.selected_node
  );
  return [updated_model, node];
}
function update_existing_node(model, node_id, lat, lon, node_label) {
  return try$(
    get_node_by_id(model, node_id),
    (original_node) => {
      let updated_node = new Node(node_id, lat, lon, node_label);
      let updated_nodes = map(
        model.nodes,
        (node) => {
          let $ = node.node_id === node_id;
          if ($) {
            return updated_node;
          } else {
            return node;
          }
        }
      );
      let updated_model = new Model(
        model.form,
        model.current_form,
        prepend(new EditNode(original_node, updated_node), model.actions),
        model.next_node_id,
        model.next_path_id,
        updated_nodes,
        model.paths,
        new None(),
        model.selected_node
      );
      return new Ok(updated_model);
    }
  );
}
function node_decoder() {
  return field(
    "node_id",
    string2,
    (node_id) => {
      return field(
        "lat",
        float2,
        (lat) => {
          return field(
            "lon",
            float2,
            (lon) => {
              return field(
                "node_label",
                string2,
                (node_label) => {
                  return success(
                    new Node(node_id, lat, lon, node_label)
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function create_new_path(model, origin_node_id, destination_node_id, value2) {
  let path_id = "path-id-" + to_string(model.next_path_id);
  let path2 = new Path(path_id, origin_node_id, destination_node_id, value2);
  let updated_model = new Model(
    model.form,
    model.current_form,
    prepend(new NewPath(path2), model.actions),
    model.next_node_id,
    model.next_path_id + 1,
    model.nodes,
    prepend(path2, model.paths),
    model.selected_coords,
    model.selected_node
  );
  return [updated_model, path2];
}
function get_path_by_id(model, path_id) {
  return find2(model.paths, (path2) => {
    return path2.path_id === path_id;
  });
}
function get_paths_for_node(model, node_id) {
  return filter(
    model.paths,
    (path2) => {
      return path2.origin_node_id === node_id || path2.destination_node_id === node_id;
    }
  );
}
function update_existing_path(model, path_id, origin_node_id, destination_node_id, value2) {
  return try$(
    get_path_by_id(model, path_id),
    (original_path) => {
      let updated_path = new Path(
        path_id,
        origin_node_id,
        destination_node_id,
        value2
      );
      let updated_paths = map(
        model.paths,
        (path2) => {
          let $ = path2.path_id === path_id;
          if ($) {
            return updated_path;
          } else {
            return path2;
          }
        }
      );
      let updated_model = new Model(
        model.form,
        model.current_form,
        prepend(new EditPath(original_path, updated_path), model.actions),
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        updated_paths,
        new None(),
        model.selected_node
      );
      return new Ok(updated_model);
    }
  );
}
function path_decoder() {
  return field(
    "path_id",
    string2,
    (path_id) => {
      return field(
        "origin_node_id",
        string2,
        (origin_node_id) => {
          return field(
            "destination_node_id",
            string2,
            (destination_node_id) => {
              return field(
                "value",
                float2,
                (value2) => {
                  return success(
                    new Path(
                      path_id,
                      origin_node_id,
                      destination_node_id,
                      value2
                    )
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function decode_location_result() {
  return field(
    "features",
    list2(
      subfield(
        toList(["properties", "name"]),
        string2,
        (name2) => {
          return subfield(
            toList(["geometry", "coordinates"]),
            (() => {
              let _pipe = list2(float2);
              return map2(
                _pipe,
                (coords) => {
                  if (coords instanceof Empty) {
                    return new LocationResult(0, 0, name2);
                  } else {
                    let $ = coords.tail;
                    if ($ instanceof Empty) {
                      return new LocationResult(0, 0, name2);
                    } else {
                      let $1 = $.tail;
                      if ($1 instanceof Empty) {
                        let lon = coords.head;
                        let lat = $.head;
                        return new LocationResult(lat, lon, name2);
                      } else {
                        return new LocationResult(0, 0, name2);
                      }
                    }
                  }
                }
              );
            })(),
            (coords) => {
              return success(coords);
            }
          );
        }
      )
    ),
    (features) => {
      let $ = first(features);
      if ($ instanceof Ok) {
        let coords = $[0];
        return success(coords);
      } else {
        return failure(new LocationResult(0, 0, ""), "Coordinates");
      }
    }
  );
}
function empty_form() {
  let _pipe = success2(new EmptyForm());
  return new$8(_pipe);
}
function empty_model() {
  return new Model(
    empty_form(),
    new NoForm(),
    toList([]),
    1,
    1,
    toList([]),
    toList([]),
    new None(),
    new None()
  );
}
function model_decoder() {
  return field(
    "nodes",
    list2(node_decoder()),
    (nodes2) => {
      return field(
        "paths",
        list2(path_decoder()),
        (paths) => {
          return field(
            "next_node_id",
            int2,
            (next_node_id) => {
              return field(
                "next_path_id",
                int2,
                (next_path_id) => {
                  return success(
                    new Model(
                      empty_form(),
                      new NoForm(),
                      toList([]),
                      next_node_id,
                      next_path_id,
                      nodes2,
                      paths,
                      new None(),
                      new None()
                    )
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function reset_form(model) {
  return new Model(
    empty_form(),
    new NoForm(),
    model.actions,
    model.next_node_id,
    model.next_path_id,
    model.nodes,
    model.paths,
    model.selected_coords,
    model.selected_node
  );
}
function new_node_form() {
  return new$8(
    field2(
      "lat",
      parse_float2,
      (lat) => {
        return field2(
          "lon",
          parse_float2,
          (lon) => {
            return field2(
              "node_label",
              parse_string,
              (node_label) => {
                return success2(new NodeFormData(lat, lon, node_label));
              }
            );
          }
        );
      }
    )
  );
}
function edit_node_form(node) {
  let _pipe = new_node_form();
  return set_values(
    _pipe,
    toList([
      ["lat", float_to_string(node.lat)],
      ["lon", float_to_string(node.lon)],
      ["node_label", node.node_label]
    ])
  );
}
function new_path_form() {
  return new$8(
    field2(
      "origin_node_id",
      (() => {
        let _pipe = parse_string;
        return check_not_empty(_pipe);
      })(),
      (origin_node_id) => {
        let check_if_is_origin = (id2) => {
          let $ = id2 === origin_node_id;
          if ($) {
            return new Error("must not be origin");
          } else {
            return new Ok(id2);
          }
        };
        return field2(
          "destination_node_id",
          (() => {
            let _pipe = parse_string;
            let _pipe$1 = check_not_empty(_pipe);
            return check(_pipe$1, check_if_is_origin);
          })(),
          (destination_node_id) => {
            return field2(
              "value",
              parse_float2,
              (value2) => {
                return success2(
                  new PathFormData(origin_node_id, destination_node_id, value2)
                );
              }
            );
          }
        );
      }
    )
  );
}
function edit_path_form(path2) {
  let _pipe = new_path_form();
  return set_values(
    _pipe,
    toList([
      ["origin_node_id", path2.origin_node_id],
      ["destination_node_id", path2.destination_node_id],
      ["value", float_to_string(path2.value)]
    ])
  );
}
function render_search_location() {
  return div(
    toList([class$("mt-2")]),
    toList([
      label(
        toList([for$("location-search")]),
        toList([text2("Search for location: ")])
      ),
      div(
        toList([class$("flex mt-2 gap-2")]),
        toList([
          input(
            toList([
              class$(
                "flex-1 min-w-0 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"
              ),
              id("location-search"),
              type_("text"),
              name("location-search")
            ])
          ),
          button(
            toList([
              class$(
                "flex bg-gray-600 hover:bg-gray-400 px-1 py-1 rounded-sm cursor-pointer"
              )
            ]),
            toList([
              svg(
                toList([
                  attribute2("stroke-width", "1.5"),
                  attribute2("stroke", "currentColor"),
                  attribute2("fill", "none"),
                  class$("size-6")
                ]),
                toList([
                  path(
                    toList([
                      attribute2("stroke-linecap", "round"),
                      attribute2("stroke-linejoin", "round"),
                      attribute2(
                        "d",
                        "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      )
                    ])
                  )
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function render_input_field(form3, name2, label2) {
  let errors = field_error_messages(form3, name2);
  return div(
    toList([]),
    prepend(
      div(
        toList([class$("py-2")]),
        toList([
          label(
            toList([for$(name2)]),
            toList([text2(label2 + ": ")])
          )
        ])
      ),
      prepend(
        input(
          toList([
            class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
            id(name2),
            type_("text"),
            name(name2),
            value(field_value(form3, name2))
          ])
        ),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      )
    )
  );
}
function render_undo(model) {
  let $ = model.actions;
  if ($ instanceof Empty) {
    return none2();
  } else {
    return button(
      toList([
        class$(
          "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer"
        ),
        on_click(new Undo()),
        title("Undo")
      ]),
      toList([
        svg(
          toList([
            attribute2("stroke-width", "1.5"),
            attribute2("stroke", "currentColor"),
            attribute2("fill", "none"),
            class$("size-6")
          ]),
          toList([
            path(
              toList([
                attribute2("stroke-linecap", "round"),
                attribute2("stroke-linejoin", "round"),
                attribute2("d", "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3")
              ])
            )
          ])
        )
      ])
    );
  }
}
function render_node_select_field(form3, name2, label2, nodes2) {
  let errors = field_error_messages(form3, name2);
  return div(
    toList([]),
    prepend(
      div(
        toList([class$("py-2")]),
        toList([
          label(
            toList([for$(name2)]),
            toList([text2(label2 + ": ")])
          )
        ])
      ),
      prepend(
        select(
          toList([
            class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
            id(name2),
            name(name2)
          ]),
          prepend(
            option(
              toList([
                value(""),
                selected(field_value(form3, name2) === "")
              ]),
              "Select a node..."
            ),
            map(
              nodes2,
              (node) => {
                let is_selected = field_value(form3, name2) === node.node_id;
                return option(
                  toList([
                    value(node.node_id),
                    selected(is_selected)
                  ]),
                  (() => {
                    let $ = node.node_label;
                    let $1 = node.node_id;
                    if ($1.startsWith("node-id-") && $ === "") {
                      let id$1 = $1.slice(8);
                      return "Node " + id$1;
                    } else {
                      return node.node_label;
                    }
                  })()
                );
              }
            )
          )
        ),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      )
    )
  );
}
function render_submit_button(current_form) {
  let _block;
  if (current_form instanceof NewNodeForm) {
    _block = "Add Node";
  } else if (current_form instanceof EditNodeForm) {
    _block = "Edit Node";
  } else if (current_form instanceof NewPathForm) {
    _block = "Add Path";
  } else if (current_form instanceof EditPathForm) {
    _block = "Edit Path";
  } else {
    _block = "Submit";
  }
  let button_text = _block;
  return div(
    toList([class$("pt-4")]),
    toList([
      button(
        toList([
          class$(
            "w-full bg-pink-600 hover:bg-pink-400 px-3 py-2 rounded-sm cursor-pointer"
          )
        ]),
        toList([text2(button_text)])
      )
    ])
  );
}
function render_node_form(form3, current_form) {
  let handle_submit = (values3) => {
    let _pipe = form3;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new NodeFormSubmit(_pipe$2);
  };
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      div(
        toList([class$("text-sm")]),
        toList([
          text2(
            "Select a location on the map, search for a location, or manually enter coordinates."
          )
        ])
      ),
      form2(
        toList([
          on_submit((var0) => {
            return new LocationSearch(var0);
          })
        ]),
        toList([render_search_location()])
      ),
      form2(
        toList([on_submit(handle_submit)]),
        toList([
          render_input_field(form3, "lat", "Latitude"),
          render_input_field(form3, "lon", "Longitude"),
          render_input_field(form3, "node_label", "Label"),
          render_submit_button(current_form)
        ])
      )
    ])
  );
}
function render_path_form(form3, nodes2, current_form) {
  let handle_submit = (values3) => {
    let _pipe = form3;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new PathFormSubmit(_pipe$2);
  };
  let nodes$1 = reverse(nodes2);
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form2(
        toList([on_submit(handle_submit)]),
        toList([
          render_node_select_field(form3, "origin_node_id", "Origin", nodes$1),
          render_node_select_field(
            form3,
            "destination_node_id",
            "Destination",
            nodes$1
          ),
          render_input_field(form3, "value", "Value"),
          render_submit_button(current_form)
        ])
      )
    ])
  );
}
function render_form(model) {
  let $ = model.current_form;
  if ($ instanceof NewNodeForm) {
    return render_node_form(model.form, model.current_form);
  } else if ($ instanceof EditNodeForm) {
    return render_node_form(model.form, model.current_form);
  } else if ($ instanceof NewPathForm) {
    return render_path_form(model.form, model.nodes, model.current_form);
  } else if ($ instanceof EditPathForm) {
    return render_path_form(model.form, model.nodes, model.current_form);
  } else {
    return none2();
  }
}
function render_delete_button(current_form) {
  let _block;
  if (current_form instanceof EditNodeForm) {
    let node_id = current_form.node_id;
    _block = [new DeleteNode(node_id), "Delete Node"];
  } else if (current_form instanceof EditPathForm) {
    let path_id = current_form.node_id;
    _block = [new DeletePath(path_id), "Delete Path"];
  } else {
    _block = [new DeleteNode(""), ""];
  }
  let $ = _block;
  let message;
  let label2;
  message = $[0];
  label2 = $[1];
  if (label2 === "") {
    return none2();
  } else {
    return button(
      toList([
        class$(
          "w-full bg-red-600 hover:bg-red-800 px-3 py-2 rounded-sm cursor-pointer"
        ),
        on_click(message)
      ]),
      toList([text2(label2)])
    );
  }
}
function render_import_export_buttons(model) {
  return div(
    toList([class$("flex gap-2 mb-2")]),
    toList([
      button(
        toList([
          class$(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          title("Download File"),
          on_click(new DownloadModel())
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  )
                ])
              )
            ])
          )
        ])
      ),
      label(
        toList([
          class$(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer inline-block"
          ),
          title("Load File"),
          for$("import-file"),
          attribute2("tabindex", "0")
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  )
                ])
              )
            ])
          ),
          input(
            toList([
              id("import-file"),
              type_("file"),
              accept(toList([".json"])),
              class$("hidden")
            ])
          )
        ])
      ),
      button(
        toList([
          class$(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          title("Export as PNG"),
          on_click(new ExportMap())
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  )
                ])
              )
            ])
          )
        ])
      ),
      render_undo(model)
    ])
  );
}
function render_controls(model) {
  return div(
    toList([
      class$(
        "flex-1 bg-gray-700 text-gray-200 p-4 rounded-lg transition-all duration-300 ease-in-out"
      )
    ]),
    toList([
      div(
        toList([class$("text-sm mb-2")]),
        toList([
          text2(
            "Hover over buttons for their descriptions. Selecting nodes and paths on the map allows you to edit or delete them. Zoom and pan on the map to modify the view extent."
          )
        ])
      ),
      render_import_export_buttons(model),
      button(
        toList([
          class$(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          title("Add Node"),
          on_click(new StartNodeForm(""))
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
                  )
                ])
              )
            ])
          )
        ])
      ),
      button(
        toList([
          class$(
            "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          title("Add Path"),
          on_click(new StartPathForm(""))
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M4 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M20 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M5 10Q12 3 19 10"
                  )
                ])
              )
            ])
          )
        ])
      ),
      button(
        toList([
          class$(
            "bg-purple-600 hover:bg-purple-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          title("Generate Random Map"),
          on_click(new GenerateRandomMap())
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2(
                    "d",
                    "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                  )
                ])
              )
            ])
          )
        ])
      ),
      button(
        toList([
          class$(
            "bg-red-600 hover:bg-red-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          title("Reset Map"),
          on_click(new ClearMap())
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              attribute2("fill", "none"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("d", "M6 18 18 6M6 6l12 12")
                ])
              )
            ])
          )
        ])
      ),
      div(
        toList([
          class$("transition-all duration-300 ease-in-out"),
          (() => {
            let $ = model.current_form;
            if ($ instanceof NoForm) {
              return class$("max-h-0 opacity-0");
            } else {
              return class$("max-h-256 opacity-100");
            }
          })()
        ]),
        toList([render_form(model)])
      ),
      render_delete_button(model.current_form)
    ])
  );
}
function view(model) {
  return div(
    toList([class$("flex flex-1")]),
    toList([
      div(
        toList([class$("flex-col w-2/3 p-4")]),
        toList([
          h1(
            toList([class$("text-4xl font-extrabold mb-6")]),
            toList([text2("Flow map")])
          ),
          div(
            toList([
              class$(
                "flex-1 border-2 border-solid border-gray-900 rounded-lg p-1"
              ),
              id("flow-map")
            ]),
            toList([])
          )
        ])
      ),
      div(
        toList([class$("flex-col w-1/3 p-4")]),
        toList([render_controls(model)])
      )
    ])
  );
}
function parse_coords(coords) {
  let $ = split2(coords, ",");
  if ($ instanceof Empty) {
    return new Error("Invalid coordinate string");
  } else {
    let $1 = $.tail;
    if ($1 instanceof Empty) {
      return new Error("Invalid coordinate string");
    } else {
      let $2 = $1.tail;
      if ($2 instanceof Empty) {
        let lat_str = $.head;
        let lon_str = $1.head;
        return try$(
          (() => {
            let _pipe = parse_float(lat_str);
            return map_error(
              _pipe,
              (_) => {
                return "Invalid latitude";
              }
            );
          })(),
          (lat) => {
            return try$(
              (() => {
                let _pipe = parse_float(lon_str);
                return map_error(
                  _pipe,
                  (_) => {
                    return "Invalid longitude";
                  }
                );
              })(),
              (lon) => {
                return new Ok([lat, lon]);
              }
            );
          }
        );
      } else {
        return new Error("Invalid coordinate string");
      }
    }
  }
}
function serialise_node(node) {
  return object2(
    toList([
      ["node_id", string3(node.node_id)],
      ["lat", float3(node.lat)],
      ["lon", float3(node.lon)],
      ["node_label", string3(node.node_label)]
    ])
  );
}
function serialise_path(path2) {
  return object2(
    toList([
      ["path_id", string3(path2.path_id)],
      ["origin_node_id", string3(path2.origin_node_id)],
      ["destination_node_id", string3(path2.destination_node_id)],
      ["value", float3(path2.value)]
    ])
  );
}
function serialise_model(model) {
  let _pipe = object2(
    toList([
      ["nodes", array2(model.nodes, serialise_node)],
      ["paths", array2(model.paths, serialise_path)],
      ["next_node_id", int3(model.next_node_id)],
      ["next_path_id", int3(model.next_path_id)]
    ])
  );
  return to_string2(_pipe);
}
function deserialise_model(json_data) {
  return parse(json_data, model_decoder());
}
function generate_random_map() {
  let num_nodes = 5 + random(6);
  let cities = take(
    toList([
      ["London", 51.5074, -0.1278],
      ["Lagos", 6.455, 3.3945],
      ["New York", 40.7128, -74.006],
      ["S\xE3o Paulo", -23.5505, -46.6333],
      ["Tokyo", 35.6762, 139.6503],
      ["Sydney", -33.8688, 151.2093],
      ["Tunis", 36.8002, 10.1857757],
      ["Singapore", 1.3521, 103.8198],
      ["Mumbai", 19.076, 72.8777],
      ["Cape Town", -33.9249, 18.4241],
      ["Paris", 48.8566, 2.3522]
    ]),
    num_nodes
  );
  let $ = map_fold(
    cities,
    1,
    (i, city) => {
      return [
        i + 1,
        new Node("node-id-" + to_string(i), city[1], city[2], city[0])
      ];
    }
  );
  let next_node_id;
  let nodes2;
  next_node_id = $[0];
  nodes2 = $[1];
  let $1 = map_fold(
    range(1, num_nodes),
    1,
    (i, node_idx_1) => {
      return map_fold(
        range(1, num_nodes),
        i,
        (j, node_idx_2) => {
          let $2 = node_idx_1 === node_idx_2;
          if ($2) {
            return [j, new Path("", "", "", 0)];
          } else {
            let flow_value = random(3e3);
            let $3 = flow_value > 1e3;
            if ($3) {
              return [j, new Path("", "", "", 0)];
            } else {
              return [
                j + 1,
                new Path(
                  "path-id-" + to_string(j),
                  "node-id-" + to_string(node_idx_1),
                  "node-id-" + to_string(node_idx_2),
                  identity(flow_value)
                )
              ];
            }
          }
        }
      );
    }
  );
  let next_path_id;
  let paths;
  next_path_id = $1[0];
  paths = $1[1];
  let _record = empty_model();
  return new Model(
    _record.form,
    _record.current_form,
    _record.actions,
    next_node_id,
    next_path_id,
    nodes2,
    (() => {
      let _pipe = flatten(paths);
      return filter(_pipe, (path2) => {
        return path2.path_id !== "";
      });
    })(),
    _record.selected_coords,
    _record.selected_node
  );
}
function init(_) {
  let init_effect = from(
    (dispatch) => {
      initFlowMap();
      let dispatch_wrapper = (message) => {
        if (message.startsWith("node_id:")) {
          let node_id = message.slice(8);
          return dispatch(new NodeSelected(node_id));
        } else if (message.startsWith("path_id:")) {
          let path_id = message.slice(8);
          return dispatch(new StartPathForm(path_id));
        } else if (message.startsWith("coords:")) {
          let coords = message.slice(7);
          let $ = parse_coords(coords);
          if ($ instanceof Ok) {
            let lat = $[0][0];
            let lon = $[0][1];
            return dispatch(new SelectCoords(lat, lon));
          } else {
            return void 0;
          }
        } else if (message.startsWith("import:")) {
          let json_data = message.slice(7);
          return dispatch(new ImportModel(json_data));
        } else {
          return void 0;
        }
      };
      setDispatch(dispatch_wrapper);
      setupFileImport(dispatch_wrapper);
      let _pipe = dispatch;
      return install_keyboard_shortcuts(
        _pipe,
        new KeyDown(),
        toList([
          new Shortcut(
            toList([new Key2("Escape")]),
            new ResetForm(),
            toList([new PreventDefault()])
          ),
          new Shortcut(
            toList([new Modifier(), new Key2("z")]),
            new Undo(),
            toList([new PreventDefault()])
          )
        ])
      );
    }
  );
  return [empty_model(), init_effect];
}
function update2(model, message) {
  if (message instanceof SelectCoords) {
    let lat = message.lat;
    let lon = message.lon;
    let updated_model = new Model(
      model.form,
      model.current_form,
      model.actions,
      model.next_node_id,
      model.next_path_id,
      model.nodes,
      model.paths,
      new Some([lat, lon]),
      model.selected_node
    );
    let $ = model.current_form;
    if ($ instanceof NewNodeForm) {
      let node_label = field_value(model.form, "node_label");
      let _block;
      let _pipe = model.form;
      _block = set_values(
        _pipe,
        toList([
          ["lat", float_to_string(lat)],
          ["lon", float_to_string(lon)],
          ["node_label", node_label]
        ])
      );
      let updated_form = _block;
      let updated_model$1 = new Model(
        updated_form,
        updated_model.current_form,
        updated_model.actions,
        updated_model.next_node_id,
        updated_model.next_path_id,
        updated_model.nodes,
        updated_model.paths,
        updated_model.selected_coords,
        updated_model.selected_node
      );
      return [updated_model$1, none()];
    } else if ($ instanceof EditNodeForm) {
      let node_label = field_value(model.form, "node_label");
      let _block;
      let _pipe = model.form;
      _block = set_values(
        _pipe,
        toList([
          ["lat", float_to_string(lat)],
          ["lon", float_to_string(lon)],
          ["node_label", node_label]
        ])
      );
      let updated_form = _block;
      let updated_model$1 = new Model(
        updated_form,
        updated_model.current_form,
        updated_model.actions,
        updated_model.next_node_id,
        updated_model.next_path_id,
        updated_model.nodes,
        updated_model.paths,
        updated_model.selected_coords,
        updated_model.selected_node
      );
      return [updated_model$1, none()];
    } else {
      return [updated_model, none()];
    }
  } else if (message instanceof NodeSelected) {
    let node_id = message.node_id;
    let $ = model.current_form;
    if ($ instanceof NewPathForm) {
      let origin_node_id = field_value(model.form, "origin_node_id");
      let destination_node_id = field_value(
        model.form,
        "destination_node_id"
      );
      let value2 = field_value(model.form, "value");
      let _block;
      if (origin_node_id === "") {
        let _pipe = model.form;
        _block = set_values(
          _pipe,
          toList([
            ["origin_node_id", node_id],
            ["destination_node_id", destination_node_id],
            ["value", value2]
          ])
        );
      } else if (destination_node_id === "") {
        focusRootById("flow-map", "value");
        let _pipe = model.form;
        _block = set_values(
          _pipe,
          toList([
            ["origin_node_id", origin_node_id],
            ["destination_node_id", node_id],
            ["value", value2]
          ])
        );
      } else {
        _block = model.form;
      }
      let updated_form = _block;
      return [
        new Model(
          updated_form,
          model.current_form,
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          new None()
        ),
        none()
      ];
    } else if ($ instanceof EditPathForm) {
      let origin_node_id = field_value(model.form, "origin_node_id");
      let destination_node_id = field_value(
        model.form,
        "destination_node_id"
      );
      let value2 = field_value(model.form, "value");
      let _block;
      if (origin_node_id === "") {
        let _pipe = model.form;
        _block = set_values(
          _pipe,
          toList([
            ["origin_node_id", node_id],
            ["destination_node_id", destination_node_id],
            ["value", value2]
          ])
        );
      } else if (destination_node_id === "") {
        focusRootById("flow-map", "value");
        let _pipe = model.form;
        _block = set_values(
          _pipe,
          toList([
            ["origin_node_id", origin_node_id],
            ["destination_node_id", node_id],
            ["value", value2]
          ])
        );
      } else {
        _block = model.form;
      }
      let updated_form = _block;
      return [
        new Model(
          updated_form,
          model.current_form,
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          new None()
        ),
        none()
      ];
    } else {
      return [
        new Model(
          model.form,
          model.current_form,
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          new Some(node_id)
        ),
        from(
          (dispatch) => {
            return dispatch(new StartNodeForm(node_id));
          }
        )
      ];
    }
  } else if (message instanceof StartNodeForm) {
    let $ = message.node_id;
    if ($ === "") {
      let $1 = model.selected_coords;
      if ($1 instanceof Some) {
        let lat = $1[0][0];
        let lon = $1[0][1];
        let $2 = create_new_node(model, lat, lon, "");
        let updated_model;
        let node;
        updated_model = $2[0];
        node = $2[1];
        let final_model = new Model(
          edit_node_form(node),
          new EditNodeForm(node.node_id),
          updated_model.actions,
          updated_model.next_node_id,
          updated_model.next_path_id,
          updated_model.nodes,
          updated_model.paths,
          updated_model.selected_coords,
          new Some(node.node_id)
        );
        addNode(node.node_id, lat, lon, "");
        focusRootById("flow-map", "node_label");
        return [final_model, none()];
      } else {
        let updated_model = new Model(
          new_node_form(),
          new NewNodeForm(),
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        return [updated_model, none()];
      }
    } else {
      let node_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_node_by_id(_pipe, node_id);
      _block = unwrap2(_pipe$1, new Node("default", 0, 0, ""));
      let node = _block;
      let $1 = node.node_id;
      if ($1 === "default") {
        return [model, none()];
      } else {
        let updated_model = new Model(
          edit_node_form(node),
          new EditNodeForm(node.node_id),
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          new Some(node.node_id)
        );
        return [updated_model, none()];
      }
    }
  } else if (message instanceof NodeFormSubmit) {
    let $ = message[0];
    if ($ instanceof Ok) {
      let $1 = $[0];
      if ($1 instanceof NodeFormData) {
        let lat = $1.lat;
        let lon = $1.lon;
        let node_label = $1.node_label;
        let $2 = model.current_form;
        if ($2 instanceof NewNodeForm) {
          let $3 = create_new_node(model, lat, lon, node_label);
          let updated_model;
          let node;
          updated_model = $3[0];
          node = $3[1];
          addNode(node.node_id, lat, lon, node_label);
          let final_model = reset_form(updated_model);
          return [final_model, none()];
        } else if ($2 instanceof EditNodeForm) {
          let node_id = $2.node_id;
          let $3 = update_existing_node(model, node_id, lat, lon, node_label);
          if ($3 instanceof Ok) {
            let updated_model = $3[0];
            editNode(node_id, lat, lon, node_label);
            if (node_label === "") {
              focusRootById("flow-map", "node_label");
              return [
                new Model(
                  updated_model.form,
                  updated_model.current_form,
                  updated_model.actions,
                  updated_model.next_node_id,
                  updated_model.next_path_id,
                  updated_model.nodes,
                  updated_model.paths,
                  updated_model.selected_coords,
                  new Some(node_id)
                ),
                none()
              ];
            } else {
              return [reset_form(updated_model), none()];
            }
          } else {
            return [model, none()];
          }
        } else {
          return [model, none()];
        }
      } else {
        return [model, none()];
      }
    } else {
      let form3 = $[0];
      let updated_model = new Model(
        form3,
        model.current_form,
        model.actions,
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        model.paths,
        model.selected_coords,
        model.selected_node
      );
      return [updated_model, none()];
    }
  } else if (message instanceof StartPathForm) {
    let $ = message.path_id;
    if ($ === "") {
      let $1 = model.selected_node;
      if ($1 instanceof Some) {
        let node_id = $1[0];
        let _block;
        let _pipe = new_path_form();
        _block = set_values(_pipe, toList([["origin_node_id", node_id]]));
        let path_with_origin_node_id = _block;
        let updated_model = new Model(
          path_with_origin_node_id,
          new NewPathForm(),
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        return [updated_model, none()];
      } else {
        let updated_model = new Model(
          new_path_form(),
          new NewPathForm(),
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        return [updated_model, none()];
      }
    } else {
      let path_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_path_by_id(_pipe, path_id);
      _block = unwrap2(_pipe$1, new Path("default", "", "", 0));
      let path2 = _block;
      let $1 = path2.path_id;
      if ($1 === "default") {
        return [model, none()];
      } else {
        let updated_model = new Model(
          edit_path_form(path2),
          new EditPathForm(path2.path_id),
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        return [updated_model, none()];
      }
    }
  } else if (message instanceof PathFormSubmit) {
    let $ = message[0];
    if ($ instanceof Ok) {
      let $1 = $[0];
      if ($1 instanceof PathFormData) {
        let origin_node_id = $1.origin_node_id;
        let destination_node_id = $1.destination_node_id;
        let value2 = $1.value;
        let $2 = model.current_form;
        if ($2 instanceof NewPathForm) {
          let $3 = create_new_path(
            model,
            origin_node_id,
            destination_node_id,
            value2
          );
          let updated_model;
          let path2;
          updated_model = $3[0];
          path2 = $3[1];
          let final_model = reset_form(updated_model);
          addPath(path2.path_id, origin_node_id, destination_node_id, value2);
          return [final_model, none()];
        } else if ($2 instanceof EditPathForm) {
          let path_id = $2.node_id;
          let $3 = update_existing_path(
            model,
            path_id,
            origin_node_id,
            destination_node_id,
            value2
          );
          if ($3 instanceof Ok) {
            let updated_model = $3[0];
            let final_model = reset_form(updated_model);
            editPath(path_id, origin_node_id, destination_node_id, value2);
            return [final_model, none()];
          } else {
            return [model, none()];
          }
        } else {
          return [model, none()];
        }
      } else {
        return [model, none()];
      }
    } else {
      let form3 = $[0];
      let updated_model = new Model(
        form3,
        model.current_form,
        model.actions,
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        model.paths,
        model.selected_coords,
        model.selected_node
      );
      return [updated_model, none()];
    }
  } else if (message instanceof LocationSearch) {
    let $ = message.query;
    if ($ instanceof Empty) {
      return [model, none()];
    } else {
      let $1 = $.tail;
      if ($1 instanceof Empty) {
        let $2 = $.head[0];
        if ($2 === "location-search") {
          let query = $.head[1];
          return [
            model,
            get2(
              "https://photon.komoot.io/api/?q=" + query + "&limit=1",
              expect_json(
                decode_location_result(),
                (var0) => {
                  return new LocationSearchResult(var0);
                }
              )
            )
          ];
        } else {
          return [model, none()];
        }
      } else {
        return [model, none()];
      }
    }
  } else if (message instanceof LocationSearchResult) {
    let $ = message.result;
    if ($ instanceof Ok) {
      let result = $[0];
      let _block;
      let _pipe = model.form;
      _block = set_values(
        _pipe,
        toList([
          ["lat", float_to_string(result.lat)],
          ["lon", float_to_string(result.lon)],
          ["node_label", result.name]
        ])
      );
      let updated_form = _block;
      showTempNodeAtCoords(result.lat, result.lon);
      return [
        new Model(
          updated_form,
          model.current_form,
          model.actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          model.paths,
          new Some([result.lat, result.lon]),
          model.selected_node
        ),
        none()
      ];
    } else {
      return [model, none()];
    }
  } else if (message instanceof DeleteNode) {
    let node_id = message.node_id;
    let $ = get_node_by_id(model, node_id);
    if ($ instanceof Ok) {
      let node = $[0];
      let connected_paths = get_paths_for_node(model, node_id);
      let updated_nodes = filter(
        model.nodes,
        (node2) => {
          return node2.node_id !== node_id;
        }
      );
      let updated_paths = filter(
        model.paths,
        (path2) => {
          return path2.origin_node_id !== node_id && path2.destination_node_id !== node_id;
        }
      );
      let updated_model = new Model(
        empty_form(),
        new NoForm(),
        prepend(new RemoveNode(node, connected_paths), model.actions),
        model.next_node_id,
        model.next_path_id,
        updated_nodes,
        updated_paths,
        model.selected_coords,
        model.selected_node
      );
      deleteNode(node.node_id);
      each(
        connected_paths,
        (path2) => {
          return deletePath(path2.path_id);
        }
      );
      return [updated_model, none()];
    } else {
      return [model, none()];
    }
  } else if (message instanceof DeletePath) {
    let path_id = message.path_id;
    let $ = get_path_by_id(model, path_id);
    if ($ instanceof Ok) {
      let path2 = $[0];
      let updated_paths = filter(
        model.paths,
        (path3) => {
          return path3.path_id !== path_id;
        }
      );
      let updated_model = new Model(
        empty_form(),
        new NoForm(),
        prepend(new RemovePath(path2), model.actions),
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        updated_paths,
        model.selected_coords,
        model.selected_node
      );
      deletePath(path2.path_id);
      return [updated_model, none()];
    } else {
      return [model, none()];
    }
  } else if (message instanceof Undo) {
    let $ = model.actions;
    if ($ instanceof Empty) {
      return [model, none()];
    } else {
      let $1 = $.head;
      if ($1 instanceof NewNode) {
        let rest_actions = $.tail;
        let node = $1.node;
        let updated_nodes = filter(
          model.nodes,
          (n) => {
            return n.node_id !== node.node_id;
          }
        );
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          updated_nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        deleteNode(node.node_id);
        return [updated_model, none()];
      } else if ($1 instanceof EditNode) {
        let rest_actions = $.tail;
        let original = $1.new;
        let updated_nodes = map(
          model.nodes,
          (node) => {
            let $2 = node.node_id === original.node_id;
            if ($2) {
              return original;
            } else {
              return node;
            }
          }
        );
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          updated_nodes,
          model.paths,
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        editNode(
          original.node_id,
          original.lat,
          original.lon,
          original.node_label
        );
        return [updated_model, none()];
      } else if ($1 instanceof RemoveNode) {
        let rest_actions = $.tail;
        let node = $1.node;
        let deleted_paths = $1.deleted_paths;
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          prepend(node, model.nodes),
          append(deleted_paths, model.paths),
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        addNode(node.node_id, node.lat, node.lon, node.node_label);
        each(
          deleted_paths,
          (path2) => {
            return addPath(
              path2.path_id,
              path2.origin_node_id,
              path2.destination_node_id,
              path2.value
            );
          }
        );
        return [updated_model, none()];
      } else if ($1 instanceof NewPath) {
        let rest_actions = $.tail;
        let path2 = $1.path;
        let updated_paths = filter(
          model.paths,
          (p2) => {
            return p2.path_id !== path2.path_id;
          }
        );
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          updated_paths,
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        deletePath(path2.path_id);
        return [updated_model, none()];
      } else if ($1 instanceof EditPath) {
        let rest_actions = $.tail;
        let original = $1.new;
        let updated_paths = map(
          model.paths,
          (p2) => {
            let $2 = p2.path_id === original.path_id;
            if ($2) {
              return original;
            } else {
              return p2;
            }
          }
        );
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          updated_paths,
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        editPath(
          original.path_id,
          original.origin_node_id,
          original.destination_node_id,
          original.value
        );
        return [updated_model, none()];
      } else if ($1 instanceof RemovePath) {
        let rest_actions = $.tail;
        let path2 = $1.path;
        let _block;
        let _pipe = new Model(
          model.form,
          model.current_form,
          rest_actions,
          model.next_node_id,
          model.next_path_id,
          model.nodes,
          prepend(path2, model.paths),
          model.selected_coords,
          model.selected_node
        );
        _block = reset_form(_pipe);
        let updated_model = _block;
        addPath(
          path2.path_id,
          path2.origin_node_id,
          path2.destination_node_id,
          path2.value
        );
        return [updated_model, none()];
      } else if ($1 instanceof GenerateMap) {
        let previous_model = $1.previous_model;
        let recreation_effect = from(
          (_) => {
            return restoreD3State(previous_model.nodes, previous_model.paths);
          }
        );
        return [previous_model, recreation_effect];
      } else {
        let previous_model = $1.previous_model;
        let recreation_effect = from(
          (_) => {
            return restoreD3State(previous_model.nodes, previous_model.paths);
          }
        );
        return [previous_model, recreation_effect];
      }
    }
  } else if (message instanceof ResetForm) {
    let _block;
    let _pipe = new Model(
      model.form,
      model.current_form,
      model.actions,
      model.next_node_id,
      model.next_path_id,
      model.nodes,
      model.paths,
      model.selected_coords,
      new None()
    );
    _block = reset_form(_pipe);
    let updated_model = _block;
    removeTempNode();
    return [updated_model, none()];
  } else if (message instanceof DownloadModel) {
    let model_data = serialise_model(model);
    downloadModelData(model_data);
    return [model, none()];
  } else if (message instanceof ImportModel) {
    let json_data = message.json_data;
    let $ = deserialise_model(json_data);
    if ($ instanceof Ok) {
      let imported_model = $[0];
      let recreation_effect = from(
        (_) => {
          return restoreD3State(imported_model.nodes, imported_model.paths);
        }
      );
      return [imported_model, recreation_effect];
    } else {
      return [model, none()];
    }
  } else if (message instanceof ExportMap) {
    exportMapAsPNG();
    return [model, none()];
  } else if (message instanceof ClearMap) {
    let _block;
    let _record = empty_model();
    _block = new Model(
      _record.form,
      _record.current_form,
      prepend(new ResetMap(model), model.actions),
      _record.next_node_id,
      _record.next_path_id,
      _record.nodes,
      _record.paths,
      _record.selected_coords,
      _record.selected_node
    );
    let updated_model = _block;
    let recreation_effect = from(
      (_) => {
        return restoreD3State(toList([]), toList([]));
      }
    );
    return [updated_model, recreation_effect];
  } else {
    let random_model = generate_random_map();
    let recreation_effect = from(
      (_) => {
        return restoreD3State(random_model.nodes, random_model.paths);
      }
    );
    return [
      new Model(
        random_model.form,
        random_model.current_form,
        prepend(new GenerateMap(model), model.actions),
        random_model.next_node_id,
        random_model.next_path_id,
        random_model.nodes,
        random_model.paths,
        random_model.selected_coords,
        random_model.selected_node
      ),
      recreation_effect
    ];
  }
}
function register() {
  let component = application(init, update2, view);
  return make_component(component, "flow-map");
}

// build/dev/javascript/viz/components/resource_pooling.ffi.mjs
var ENTITY_COLOURS = {
  Consumer: {
    fill: "#fecaca",
    stroke: "#dc2626"
  },
  Producer: {
    fill: "#bbf7d0",
    stroke: "#16a34a"
  },
  Scavenger: {
    fill: "#bfdbfe",
    stroke: "#2563eb"
  },
  Decomposer: {
    fill: "#fef3c7",
    stroke: "#d97706"
  }
};
var FLOW_COLORS = {
  Material: "#16a34a",
  Financial: "#dc2626",
  Information: "#2563eb"
};
var CONFIG2 = {
  minWidth: 150,
  minHeight: 100,
  maxWidth: 600,
  maxHeight: 300,
  maxAspectRatio: 3,
  padding: 15,
  nameHeight: 25,
  nameXPadding: 25,
  nameFontSize: "14px",
  badgeHeight: 20,
  badgeSpacing: 7.5,
  materialSpacing: 18,
  columnGap: 20,
  itemsPerActivityColumn: 3,
  itemsPerMaterialColumn: 5,
  entityMargin: 40,
  flowHoverWidth: 8
};
var resourcePooling = {
  svg: null,
  g: null,
  initialised: false
};
var messageDispatch2 = null;
var forceSimulation = null;
var nodes = [];
var links = [];
function initResourcePooling() {
  if (resourcePooling.initialised) return null;
  requestAnimationFrame(() => {
    const resourcePoolingElement = document.querySelector("resource-pooling");
    const isHidden = resourcePoolingElement.closest(".hidden") !== null;
    if (isHidden) {
      initResourcePooling();
      return;
    }
    const element6 = resourcePoolingElement.shadowRoot?.getElementById("resource-pooling");
    if (element6) {
      createResourcePooling();
      resourcePooling.initialised = true;
    } else {
      initResourcePooling();
    }
  });
  return null;
}
function setDispatch2(dispatch) {
  messageDispatch2 = dispatch;
  return null;
}
function createEntity(entity, materials, x = null, y = null) {
  if (!resourcePooling.g) return;
  const entityId = entity.entity_id;
  const valueActivities = entity.value_activities.toArray();
  const entityMaterials = entity.materials.toArray();
  const materialsArray = materials.toArray();
  if (x == null && y == null) {
    const position = calculateNewEntityPosition(CONFIG2.entityMargin);
    x = position.x;
    y = position.y;
  }
  const entityGroup = createEntityGroup(entityId, x, y);
  const { width, height } = buildEntityContent(
    entityGroup,
    entity,
    valueActivities,
    entityMaterials,
    materialsArray
  );
  setupEntityInteraction(entityGroup, entityId, x, y, width, height);
  addEntityToSimulation(entityId, entity, x, y, width, height);
  return entityGroup;
}
function editEntity(entity, materials) {
  if (!resourcePooling.g) return;
  const entityId = entity.entity_id;
  const existingEntity = resourcePooling.g.select(`#${entityId}`);
  if (existingEntity.empty()) {
    console.warn(`Entity with ID ${entityId} not found`);
    return;
  }
  const existingNode = nodes.find((n) => n.id === entityId);
  const currentX = existingNode ? existingNode.x : 0;
  const currentY = existingNode ? existingNode.y : 0;
  existingEntity.remove();
  createEntity(entity, materials, currentX, currentY);
  updateLinkReferences(entityId);
}
function deleteEntity(entityId) {
  if (!resourcePooling.g) return;
  resourcePooling.g.select(`#${entityId}`).remove();
  const nodeIndex = nodes.findIndex((n) => n.id === entityId);
  if (nodeIndex >= 0) {
    nodes.splice(nodeIndex, 1);
    updateSimulation();
  }
}
function updateMaterial(name2, materialId) {
  if (!resourcePooling.g) return;
  resourcePooling.g.selectAll(".entity").each(function() {
    const entityGroup = d3.select(this);
    const materialItems = entityGroup.selectAll(".material-item").filter(function() {
      return d3.select(this).attr("data-material-id") === materialId;
    });
    materialItems.each(function() {
      const materialGroup = d3.select(this);
      const textElement = materialGroup.select("text");
      textElement.text(name2);
    });
  });
}
function createFlow(flow) {
  if (!resourcePooling.g) return;
  const flowId = flow.flow_id;
  const [entityId1, entityId2] = flow.entity_ids;
  const flowTypes = flow.flow_types.toArray();
  const entity1 = resourcePooling.g.select(`#${entityId1}`);
  const entity2 = resourcePooling.g.select(`#${entityId2}`);
  if (entity1.empty() || entity2.empty()) {
    console.warn(`One or both entities not found: ${entityId1}, ${entityId2}`);
    return;
  }
  const flowGroup = resourcePooling.g.select(".flows-group").append("g").attr("class", "flow").attr("id", flowId);
  const entity1Bounds = getEntityBounds(entity1);
  const entity2Bounds = getEntityBounds(entity2);
  flowTypes.forEach((flowType, index5) => {
    createSingleFlow(flowGroup, entity1Bounds, entity2Bounds, flowType, index5);
  });
  setupFlowInteraction(flowGroup, flowId);
  addFlowToSimulation(flowId, entityId1, entityId2, flow);
  return flowGroup;
}
function editFlow(flow) {
  if (!resourcePooling.g) return;
  deleteFlow(flow.flow_id);
  createFlow(flow);
}
function deleteFlow(flowId) {
  if (!resourcePooling.g) return;
  resourcePooling.g.select(`#${flowId}`).remove();
  const linkIndex = links.findIndex((l) => l.id === flowId);
  if (linkIndex >= 0) {
    links.splice(linkIndex, 1);
    updateSimulation();
  }
}
function downloadModelData2(gleamJsonData) {
  const gleamState = JSON.parse(gleamJsonData);
  const d3State = {
    nodes: nodes.map((node) => ({
      id: node.id,
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 150,
      height: node.height || 100
    })),
    links: links.map((link) => ({
      id: link.id,
      source: typeof link.source === "object" ? link.source.id : link.source,
      target: typeof link.target === "object" ? link.target.id : link.target
    }))
  };
  const combinedData = {
    gleam_state: gleamState,
    d3_state: d3State
  };
  const jsonData = JSON.stringify(combinedData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement("a");
  a2.href = url;
  a2.download = `resource-pooling-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a2);
  a2.click();
  document.body.removeChild(a2);
  URL.revokeObjectURL(url);
}
function setupFileImport2(dispatch) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("resource-pooling").shadowRoot;
    const fileInput = shadowRoot.querySelector("#import-file");
    if (!fileInput) {
      setupFileImport2(dispatch);
      return;
    }
    fileInput.addEventListener("change", (event4) => {
      const file = event4.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const combinedData = JSON.parse(e.target.result);
            if (combinedData.d3_state && combinedData.gleam_state) {
              window.pendingD3State = combinedData.d3_state;
              dispatch(`import:${JSON.stringify(combinedData.gleam_state)}`);
            } else {
              console.error("Invalid file format");
            }
          } catch (error) {
            console.error("Failed to parse import file:", error);
          }
        };
        reader.readAsText(file);
      }
    });
  });
}
function restoreD3StateAfterImport(entities, materials, flows) {
  if (!window.pendingD3State) return;
  const d3State = window.pendingD3State;
  clearResourcePooling();
  entities.toArray().forEach((entity) => {
    const nodeState = d3State.nodes.find((n) => n.id === entity.entity_id);
    if (nodeState) {
      createEntity(entity, materials, nodeState.x, nodeState.y);
    } else {
      createEntity(entity, materials);
    }
  });
  flows.toArray().forEach((flow) => {
    createFlow(flow);
  });
  delete window.pendingD3State;
}
function createEntityGroup(entityId, x, y) {
  return resourcePooling.g.select(".entities-group").append("g").attr("class", "entity").attr("id", entityId).attr("transform", `translate(${x}, ${y})`);
}
function buildEntityContent(entityGroup, entity, valueActivities, entityMaterials, materialsArray) {
  const mainRect = entityGroup.append("rect").attr("class", "main-rect");
  const headerRect = entityGroup.append("rect").attr("class", "header-rect");
  const titleText = createEntityTitle(entityGroup, entity.name);
  const titleWidth = calculateTitleWidth(titleText);
  const { activityElements, maxActivityWidth } = createActivityBadges(
    entityGroup,
    valueActivities
  );
  const { materialElements, maxMaterialWidth } = createMaterialElements(
    entityGroup,
    entityMaterials,
    materialsArray
  );
  const dimensions = calculateEntityDimensions(
    titleWidth,
    maxActivityWidth,
    maxMaterialWidth,
    valueActivities.length,
    entityMaterials.length
  );
  positionMaterialElements(materialElements, maxActivityWidth);
  styleEntityRectangles(mainRect, headerRect, dimensions, entity.entity_type);
  if (maxActivityWidth > 0 && maxMaterialWidth > 0) {
    createContentDivider(
      entityGroup,
      maxActivityWidth,
      dimensions,
      entity.entity_type
    );
  }
  return dimensions;
}
function createEntityTitle(entityGroup, name2) {
  return entityGroup.append("text").attr("x", CONFIG2.nameXPadding).attr("y", CONFIG2.nameHeight).attr("text-anchor", "left").style("font-size", CONFIG2.nameFontSize).style("font-weight", "bold").style("fill", "#e5e7eb").text(name2);
}
function calculateTitleWidth(titleText) {
  const titleBBox = titleText.node().getBBox();
  return titleBBox.width + CONFIG2.padding * 2 + CONFIG2.nameXPadding;
}
function createActivityBadges(entityGroup, valueActivities) {
  let activityElements = [];
  let maxActivityWidth = 0;
  if (valueActivities && valueActivities.length > 0) {
    const numColumns = Math.ceil(
      valueActivities.length / CONFIG2.itemsPerActivityColumn
    );
    let columnWidths = [];
    for (let col = 0; col < numColumns; col++) {
      let columnMaxWidth = 0;
      const startIdx = col * CONFIG2.itemsPerActivityColumn;
      const endIdx = Math.min(
        startIdx + CONFIG2.itemsPerActivityColumn,
        valueActivities.length
      );
      for (let i = startIdx; i < endIdx; i++) {
        const activity = valueActivities[i];
        const rowInColumn = i - startIdx;
        const xOffset = col > 0 ? columnWidths.reduce((sum, w) => sum + w + CONFIG2.columnGap, 0) : 0;
        const badge = createActivityBadge(
          entityGroup,
          activity,
          xOffset,
          rowInColumn
        );
        const badgeWidth = styleActivityBadge(badge, activity);
        columnMaxWidth = Math.max(columnMaxWidth, badgeWidth);
        activityElements.push({ badge, width: badgeWidth, column: col });
      }
      columnWidths.push(columnMaxWidth);
    }
    maxActivityWidth = columnWidths.reduce((sum, w) => sum + w, 0) + (numColumns - 1) * CONFIG2.columnGap;
  }
  return { activityElements, maxActivityWidth };
}
function createActivityBadge(entityGroup, activity, xOffset, rowInColumn) {
  return entityGroup.append("g").attr("class", "activity-badge").attr(
    "transform",
    `translate(${CONFIG2.padding + xOffset}, ${CONFIG2.nameHeight + CONFIG2.padding + 20 + rowInColumn * (CONFIG2.badgeHeight + CONFIG2.badgeSpacing)})`
  );
}
function styleActivityBadge(badge, activity) {
  const text4 = badge.append("text").attr("x", 0).attr("y", CONFIG2.badgeHeight / 2 + 4).style("font-size", "12px").style("fill", "#000000").text(activity);
  const bbox = text4.node().getBBox();
  const badgeWidth = bbox.width + 16;
  badge.insert("rect", "text").attr("width", badgeWidth).attr("height", CONFIG2.badgeHeight).attr("rx", 10).style("fill", "#ffffff").style("fill-opacity", "0.7").style("stroke", "#000000").style("stroke-width", 1);
  text4.attr("x", badgeWidth / 2).attr("text-anchor", "middle");
  return badgeWidth;
}
function createMaterialElements(entityGroup, entityMaterials, materialsArray) {
  let materialElements = [];
  let maxMaterialWidth = 0;
  if (entityMaterials && entityMaterials.length > 0) {
    const materialObjects = entityMaterials.map(
      (materialId) => materialsArray.find((m) => m.material_id === materialId)
    ).filter(Boolean);
    const numColumns = Math.ceil(
      materialObjects.length / CONFIG2.itemsPerMaterialColumn
    );
    let columnWidths = [];
    for (let col = 0; col < numColumns; col++) {
      let columnMaxWidth = 0;
      const startIdx = col * CONFIG2.itemsPerMaterialColumn;
      const endIdx = Math.min(
        startIdx + CONFIG2.itemsPerMaterialColumn,
        materialObjects.length
      );
      for (let i = startIdx; i < endIdx; i++) {
        const material = materialObjects[i];
        const rowInColumn = i - startIdx;
        const xOffset = col > 0 ? columnWidths.reduce((sum, w) => sum + w + CONFIG2.columnGap, 0) : 0;
        const materialGroup = createMaterialItem(
          entityGroup,
          material,
          xOffset,
          rowInColumn
        );
        const materialWidth = getMaterialWidth(materialGroup);
        columnMaxWidth = Math.max(columnMaxWidth, materialWidth);
        materialElements.push({
          group: materialGroup,
          width: materialWidth,
          column: col
        });
      }
      columnWidths.push(columnMaxWidth);
    }
    maxMaterialWidth = columnWidths.reduce((sum, w) => sum + w, 0) + (numColumns - 1) * CONFIG2.columnGap;
  }
  return { materialElements, maxMaterialWidth };
}
function createMaterialItem(entityGroup, material, xOffset, rowInColumn) {
  const materialGroup = entityGroup.append("g").attr("class", "material-item").attr("data-material-id", material.material_id).attr(
    "transform",
    `translate(${xOffset}, ${CONFIG2.nameHeight + CONFIG2.padding + 20 + rowInColumn * CONFIG2.materialSpacing})`
  );
  materialGroup.append("circle").attr("cx", 0).attr("cy", 10).attr("r", 2).style("fill", "#374151");
  materialGroup.append("text").attr("x", 10).attr("y", 12).style("font-size", "13px").style("fill", "#374151").text(material.name);
  return materialGroup;
}
function getMaterialWidth(materialGroup) {
  const bbox = materialGroup.select("text").node().getBBox();
  return bbox.width + 25;
}
function calculateEntityDimensions(titleWidth, maxActivityWidth, maxMaterialWidth, numActivities, numMaterials) {
  const minWidthForTitle = Math.max(CONFIG2.minWidth, titleWidth);
  const contentWidth = maxActivityWidth + maxMaterialWidth + (maxActivityWidth > 0 && maxMaterialWidth > 0 ? CONFIG2.columnGap : 0);
  const width = Math.max(minWidthForTitle, contentWidth + CONFIG2.padding * 2);
  const maxActivityRows = Math.min(
    CONFIG2.itemsPerActivityColumn,
    numActivities
  );
  const maxMaterialRows = Math.min(CONFIG2.itemsPerMaterialColumn, numMaterials);
  const activitiesHeight = maxActivityRows > 0 ? maxActivityRows * (CONFIG2.badgeHeight + CONFIG2.badgeSpacing) : 0;
  const materialsHeight = maxMaterialRows > 0 ? maxMaterialRows * CONFIG2.materialSpacing : 0;
  const contentHeight = Math.max(activitiesHeight, materialsHeight);
  const height = Math.max(
    CONFIG2.minHeight,
    CONFIG2.nameHeight + CONFIG2.padding * 2 + contentHeight + 20
  );
  return { width, height };
}
function positionMaterialElements(materialElements, maxActivityWidth) {
  materialElements.forEach(({ group }) => {
    const currentTransform = group.attr("transform");
    const yPos = currentTransform.match(/translate\(0, ([\d.]+)\)/)[1];
    group.attr(
      "transform",
      `translate(${CONFIG2.padding + maxActivityWidth + CONFIG2.columnGap}, ${yPos})`
    );
  });
}
function styleEntityRectangles(mainRect, headerRect, dimensions, entityType) {
  const rectColours = ENTITY_COLOURS[entityType];
  mainRect.attr("width", dimensions.width).attr("height", dimensions.height).style("fill", rectColours.fill).style("stroke", rectColours.stroke).style("stroke-width", 1.5).style("cursor", "move");
  headerRect.attr("width", dimensions.width).attr("height", CONFIG2.nameHeight + 14).style("fill", rectColours.stroke).style("cursor", "move");
}
function createContentDivider(entityGroup, maxActivityWidth, dimensions, entityType) {
  const dividerX = CONFIG2.padding + maxActivityWidth + CONFIG2.columnGap / 2;
  const dividerStartY = CONFIG2.nameHeight + 10;
  const dividerEndY = dimensions.height;
  const rectColours = ENTITY_COLOURS[entityType];
  entityGroup.append("line").attr("class", "content-divider").attr("x1", dividerX).attr("y1", dividerStartY).attr("x2", dividerX).attr("y2", dividerEndY).style("stroke", rectColours.stroke).style("stroke-width", 2).style("opacity", 0.5);
}
function setupEntityInteraction(entityGroup, entityId, x, y, width, height) {
  let dragStartX, dragStartY;
  entityGroup.call(
    d3.drag().on("start", function(event4) {
      if (!event4.active && forceSimulation) {
        forceSimulation.alphaTarget(0.3).restart();
      }
      const node = nodes.find((n) => n.id === entityId);
      if (node) {
        dragStartX = event4.x - node.x;
        dragStartY = event4.y - node.y;
        node.fx = node.x;
        node.fy = node.y;
      }
    }).on("drag", function(event4) {
      const node = nodes.find((n) => n.id === entityId);
      if (node) {
        node.fx = event4.x - dragStartX;
        node.fy = event4.y - dragStartY;
      }
    }).on("end", function(event4) {
      if (!event4.active && forceSimulation) {
        forceSimulation.alphaTarget(0);
      }
      const node = nodes.find((n) => n.id === entityId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    })
  ).on("click", function(event4) {
    event4.stopPropagation();
    if (messageDispatch2) {
      messageDispatch2("entity_id:" + entityId);
    }
  });
}
function calculateNewEntityPosition(margin = 40) {
  if (!resourcePooling.g) return { x: 100, y: 100 };
  const existingEntities = resourcePooling.g.selectAll(".entity");
  if (existingEntities.empty()) return { x: 100, y: 100 };
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let avgX = 0, avgY = 0, count = 0;
  existingEntities.each(function() {
    const transform = d3.select(this).attr("transform");
    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    const x = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const y = translateMatch ? parseFloat(translateMatch[2]) : 0;
    const rect = d3.select(this).select(".main-rect");
    const width = parseFloat(rect.attr("width")) || 150;
    const height = parseFloat(rect.attr("height")) || 100;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);
    avgX += x;
    avgY += y;
    count++;
  });
  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;
  const isGroupWide = groupWidth / groupHeight > 1.5;
  if (isGroupWide) {
    return { x: avgX / count, y: maxY + margin };
  } else {
    return { x: maxX + margin, y: avgY / count };
  }
}
function getEntityBounds(entityElement) {
  const transform = entityElement.attr("transform");
  const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
  const x = translateMatch ? parseFloat(translateMatch[1]) : 0;
  const y = translateMatch ? parseFloat(translateMatch[2]) : 0;
  const rect = entityElement.select(".main-rect");
  const width = parseFloat(rect.attr("width")) || 150;
  const height = parseFloat(rect.attr("height")) || 100;
  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    right: x + width,
    bottom: y + height
  };
}
function createSingleFlow(flowGroup, entity1Bounds, entity2Bounds, flowType, index5) {
  const entity1Center = { x: entity1Bounds.centerX, y: entity1Bounds.centerY };
  const entity2Center = { x: entity2Bounds.centerX, y: entity2Bounds.centerY };
  const startPoint = getEntityBorderPoint(
    entity1Bounds,
    entity2Center.x,
    entity2Center.y,
    flowType,
    index5
  );
  const endPoint = getEntityBorderPoint(
    entity2Bounds,
    entity1Center.x,
    entity1Center.y,
    flowType,
    index5
  );
  const pathData = createCurvedPath(startPoint, endPoint);
  const color = FLOW_COLORS[flowType.flow_category] || "#666";
  const hoverPath = flowGroup.append("path").attr("class", "flow-hover").attr("d", pathData).style("fill", "none").style("stroke", "transparent").style("stroke-width", CONFIG2.flowHoverWidth).style("cursor", "pointer");
  const flowPath = flowGroup.append("path").attr("class", "flow-path").attr("d", pathData).style("fill", "none").style("stroke", color).style("stroke-width", 1).style("stroke-dasharray", flowType.is_future ? "5,5" : "none").style("pointer-events", "none");
  setupFlowArrows(flowPath, flowType);
  flowPath.datum({ flowType, index: index5 });
  hoverPath.datum({ flowType, index: index5 });
  return { hoverPath, flowPath };
}
function setupFlowInteraction(flowGroup, flowId) {
  flowGroup.on("click", function(event4) {
    event4.stopPropagation();
    if (messageDispatch2) {
      messageDispatch2("flow_id:" + flowId);
    }
  });
}
function setupFlowArrows(flowPath, flowType) {
  const defs = getOrCreateDefs();
  const color = FLOW_COLORS[flowType.flow_category] || "#666";
  const category = flowType.flow_category.toLowerCase();
  createArrowMarker(defs, `arrow-${category}`, color, false);
  createArrowMarker(defs, `arrow-reverse-${category}`, color, true);
  if (flowType.direction === 1) {
    flowPath.attr("marker-end", `url(#arrow-${category})`);
  } else if (flowType.direction === -1) {
    flowPath.attr("marker-start", `url(#arrow-reverse-${category})`);
  } else if (flowType.direction === 0) {
    flowPath.attr("marker-start", `url(#arrow-reverse-${category})`).attr("marker-end", `url(#arrow-${category})`);
  }
}
function getOrCreateDefs() {
  let defs = resourcePooling.svg.select("defs");
  if (defs.empty()) {
    defs = resourcePooling.svg.append("defs");
  }
  return defs;
}
function createArrowMarker(defs, id2, color, isReverse) {
  if (!defs.select(`#${id2}`).empty()) return;
  const marker = defs.append("marker").attr("id", id2).attr("viewBox", "0 -5 10 10").attr("refX", isReverse ? 2 : 8).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto");
  const path2 = isReverse ? "M10,-5L0,0L10,5" : "M0,-5L10,0L0,5";
  marker.append("path").attr("d", path2).attr("fill", color);
}
function getEntityBorderPoint(entityBounds, targetX, targetY, flowType = null, index5 = 0) {
  const centerX = entityBounds.x + entityBounds.width / 2;
  const centerY = entityBounds.y + entityBounds.height / 2;
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const halfWidth = entityBounds.width / 2;
  const halfHeight = entityBounds.height / 2;
  const slope = Math.abs(dy / dx);
  const rectSlope = halfHeight / halfWidth;
  let intersectX, intersectY;
  if (slope <= rectSlope) {
    intersectX = dx > 0 ? centerX + halfWidth : centerX - halfWidth;
    intersectY = centerY + dy / dx * halfWidth * Math.sign(dx);
  } else {
    intersectY = dy > 0 ? centerY + halfHeight : centerY - halfHeight;
    intersectX = centerX + dx / dy * halfHeight * Math.sign(dy);
  }
  if (flowType) {
    const offset = getConnectionOffset(flowType);
    if (slope <= rectSlope) {
      intersectY += offset;
      intersectY = Math.max(
        entityBounds.y + 5,
        Math.min(entityBounds.y + entityBounds.height - 5, intersectY)
      );
    } else {
      intersectX += offset;
      intersectX = Math.max(
        entityBounds.x + 5,
        Math.min(entityBounds.x + entityBounds.width - 5, intersectX)
      );
    }
  }
  return { x: intersectX, y: intersectY };
}
function getConnectionOffset(flowType) {
  const offsets = {
    Material: -12,
    Financial: 0,
    Information: 12
  };
  return offsets[flowType.flow_category] || 0;
}
function createCurvedPath(startPoint, endPoint) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.1, 20);
  const controlX = midX + (Math.abs(dy) > Math.abs(dx) ? curvature : 0);
  const controlY = midY + (Math.abs(dx) > Math.abs(dy) ? curvature : 0);
  return `M${startPoint.x},${startPoint.y} Q${controlX},${controlY} ${endPoint.x},${endPoint.y}`;
}
function addEntityToSimulation(entityId, entity, x, y, width, height) {
  const node = { id: entityId, x, y, width, height, entity };
  const existingNodeIndex = nodes.findIndex((n) => n.id === entityId);
  if (existingNodeIndex >= 0) {
    nodes[existingNodeIndex] = node;
  } else {
    nodes.push(node);
  }
  if (forceSimulation) {
    forceSimulation.nodes(nodes);
    forceSimulation.alpha(0.3).restart();
  }
}
function addFlowToSimulation(flowId, entityId1, entityId2, flow) {
  const link = { id: flowId, source: entityId1, target: entityId2, flow };
  const existingLinkIndex = links.findIndex((l) => l.id === flowId);
  if (existingLinkIndex >= 0) {
    links[existingLinkIndex] = link;
  } else {
    links.push(link);
  }
  if (forceSimulation) {
    forceSimulation.force("link").links(links);
    forceSimulation.alpha(0.3).restart();
  }
}
function updateSimulation() {
  if (forceSimulation) {
    forceSimulation.nodes(nodes);
    forceSimulation.force("link").links(links);
    forceSimulation.alpha(0.3).restart();
  }
}
function initForceSimulation() {
  forceSimulation = d3.forceSimulation().force("charge", d3.forceManyBody().strength(-50)).force(
    "link",
    d3.forceLink().id((d) => d.id).distance(100).strength(0.1)
  ).force(
    "collision",
    d3.forceCollide().radius((d) => {
      return Math.sqrt(d.width * d.width + d.height * d.height) / 2 + 10;
    })
  ).on("tick", updateEntityPositions);
  return forceSimulation;
}
function updateEntityPositions() {
  if (!resourcePooling.g) return;
  resourcePooling.g.selectAll(".entity").each(function() {
    const entityElement = d3.select(this);
    const entityId = entityElement.attr("id");
    const node = nodes.find((n) => n.id === entityId);
    if (node) {
      entityElement.attr("transform", `translate(${node.x}, ${node.y})`);
    }
  });
  updateAllFlowPaths();
}
function updateAllFlowPaths() {
  if (!resourcePooling.g) return;
  resourcePooling.g.selectAll(".flow").each(function() {
    const flowElement = d3.select(this);
    const flowId = flowElement.attr("id");
    const link = links.find((l) => l.id === flowId);
    if (link && link.source && link.target) {
      const sourceNode = typeof link.source === "object" ? link.source : nodes.find((n) => n.id === link.source);
      const targetNode = typeof link.target === "object" ? link.target : nodes.find((n) => n.id === link.target);
      if (sourceNode && targetNode) {
        updateFlowPath(flowElement, sourceNode, targetNode);
      }
    }
  });
}
function updateFlowPath(flowElement, sourceNode, targetNode) {
  const sourceBounds = {
    x: sourceNode.x,
    y: sourceNode.y,
    width: sourceNode.width || 150,
    height: sourceNode.height || 100,
    centerX: sourceNode.x + (sourceNode.width || 150) / 2,
    centerY: sourceNode.y + (sourceNode.height || 100) / 2
  };
  const targetBounds = {
    x: targetNode.x,
    y: targetNode.y,
    width: targetNode.width || 150,
    height: targetNode.height || 100,
    centerX: targetNode.x + (targetNode.width || 150) / 2,
    centerY: targetNode.y + (targetNode.height || 100) / 2
  };
  flowElement.selectAll(".flow-path, .flow-hover").each(function(d, i) {
    const pathElement = d3.select(this);
    const flowData = pathElement.datum();
    const flowType = flowData?.flowType || null;
    const startPoint = getEntityBorderPoint(
      sourceBounds,
      targetBounds.centerX,
      targetBounds.centerY,
      flowType,
      i
    );
    const endPoint = getEntityBorderPoint(
      targetBounds,
      sourceBounds.centerX,
      sourceBounds.centerY,
      flowType,
      i
    );
    const pathData = createCurvedPath(startPoint, endPoint);
    pathElement.attr("d", pathData);
  });
}
function updateLinkReferences(entityId) {
  const updatedNode = nodes.find((n) => n.id === entityId);
  if (!updatedNode) return;
  links.forEach((link) => {
    if (typeof link.source === "object" && link.source.id === entityId) {
      link.source = updatedNode;
    } else if (link.source === entityId) {
      link.source = updatedNode;
    }
    if (typeof link.target === "object" && link.target.id === entityId) {
      link.target = updatedNode;
    } else if (link.target === entityId) {
      link.target = updatedNode;
    }
  });
  if (forceSimulation) {
    forceSimulation.force("link").links(links);
    forceSimulation.nodes(nodes);
    forceSimulation.alpha(0.3).restart();
  }
}
function createResourcePooling() {
  const shadowRoot = document.querySelector("resource-pooling").shadowRoot;
  const resourcePoolingDiv = shadowRoot.getElementById("resource-pooling");
  const width = resourcePoolingDiv.clientWidth;
  const height = window.innerHeight * 0.6;
  resourcePooling.svg = d3.select(shadowRoot.getElementById("resource-pooling")).append("svg").attr("width", "100%").style("width", width).attr("height", height).style("cursor", "crosshair");
  resourcePooling.g = resourcePooling.svg.append("g");
  resourcePooling.g.append("g").attr("class", "flows-group");
  resourcePooling.g.append("g").attr("class", "entities-group");
  setupZoomBehavior2();
  resourcePooling.svg.append("defs");
  initForceSimulation();
  window.addEventListener("resize", () => {
    const newWidth = resourcePoolingDiv.clientWidth;
    const newHeight = window.innerHeight * 0.6;
    resourcePooling.svg.style("width", newWidth).attr("height", newHeight);
  });
}
function setupZoomBehavior2() {
  const zoom = d3.zoom().scaleExtent([0.1, 200]).on("zoom", (event4) => {
    resourcePooling.g.attr("transform", event4.transform);
  }).on("end", (event4) => {
    resourcePooling.g.attr("transform", `${event4.transform} translate(0, 0)`);
    requestAnimationFrame(() => {
      resourcePooling.g.attr("transform", event4.transform);
    });
  });
  resourcePooling.svg.call(zoom);
}
function clearResourcePooling() {
  if (resourcePooling.g) {
    resourcePooling.g.selectAll(".entity").remove();
    resourcePooling.g.selectAll(".flow").remove();
    nodes = [];
    links = [];
    if (forceSimulation) {
      forceSimulation.nodes([]);
      forceSimulation.force("link").links([]);
    }
  }
}

// build/dev/javascript/viz/components/resource_pooling.mjs
var Model2 = class extends CustomType {
  constructor(materials, entities, flows, form3, current_form, next_material_id, next_entity_id, next_flow_id, selected_material_ids, value_activities) {
    super();
    this.materials = materials;
    this.entities = entities;
    this.flows = flows;
    this.form = form3;
    this.current_form = current_form;
    this.next_material_id = next_material_id;
    this.next_entity_id = next_entity_id;
    this.next_flow_id = next_flow_id;
    this.selected_material_ids = selected_material_ids;
    this.value_activities = value_activities;
  }
};
var StartEntityForm = class extends CustomType {
  constructor(entity_id) {
    super();
    this.entity_id = entity_id;
  }
};
var StartMaterialsForm = class extends CustomType {
};
var StartFlowForm = class extends CustomType {
  constructor(flow_id) {
    super();
    this.flow_id = flow_id;
  }
};
var FlowFormSubmit = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var DeleteMaterial = class extends CustomType {
  constructor(material_id) {
    super();
    this.material_id = material_id;
  }
};
var NewMaterialSubmit = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var EditMaterial = class extends CustomType {
  constructor(name2, material_id) {
    super();
    this.name = name2;
    this.material_id = material_id;
  }
};
var EntityFormSubmit = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var SelectMaterial = class extends CustomType {
  constructor(material_id) {
    super();
    this.material_id = material_id;
  }
};
var RemoveSelectedMaterial = class extends CustomType {
  constructor(material_id) {
    super();
    this.material_id = material_id;
  }
};
var NewValueActivity = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var EditValueActivity = class extends CustomType {
  constructor(activity, activity_id) {
    super();
    this.activity = activity;
    this.activity_id = activity_id;
  }
};
var DeleteValueActivity = class extends CustomType {
  constructor(activity) {
    super();
    this.activity = activity;
  }
};
var DeleteEntity = class extends CustomType {
  constructor(entity_id) {
    super();
    this.entity_id = entity_id;
  }
};
var ToggleFlowType = class extends CustomType {
  constructor(flow_type) {
    super();
    this.flow_type = flow_type;
  }
};
var ToggleFutureState = class extends CustomType {
  constructor(flow_type) {
    super();
    this.flow_type = flow_type;
  }
};
var DeleteFlow = class extends CustomType {
  constructor(flow_id) {
    super();
    this.flow_id = flow_id;
  }
};
var DownloadModel2 = class extends CustomType {
};
var ImportModel2 = class extends CustomType {
  constructor(json_data) {
    super();
    this.json_data = json_data;
  }
};
var Entity = class extends CustomType {
  constructor(name2, entity_id, value_activities, materials, entity_type) {
    super();
    this.name = name2;
    this.entity_id = entity_id;
    this.value_activities = value_activities;
    this.materials = materials;
    this.entity_type = entity_type;
  }
};
var Material = class extends CustomType {
  constructor(name2, material_id) {
    super();
    this.name = name2;
    this.material_id = material_id;
  }
};
var Flow = class extends CustomType {
  constructor(flow_id, entity_ids, flow_types) {
    super();
    this.flow_id = flow_id;
    this.entity_ids = entity_ids;
    this.flow_types = flow_types;
  }
};
var FlowType = class extends CustomType {
  constructor(flow_category, direction, is_future) {
    super();
    this.flow_category = flow_category;
    this.direction = direction;
    this.is_future = is_future;
  }
};
var NewEntityForm = class extends CustomType {
};
var EditEntityForm = class extends CustomType {
  constructor(entity_id) {
    super();
    this.entity_id = entity_id;
  }
};
var MaterialsForm = class extends CustomType {
};
var NewFlowForm = class extends CustomType {
};
var EditFlowForm = class extends CustomType {
  constructor(flow_id) {
    super();
    this.flow_id = flow_id;
  }
};
var NoForm2 = class extends CustomType {
};
var MaterialsFormData = class extends CustomType {
  constructor(name2) {
    super();
    this.name = name2;
  }
};
var EntityFormData = class extends CustomType {
  constructor(name2, entity_type) {
    super();
    this.name = name2;
    this.entity_type = entity_type;
  }
};
var FlowFormData = class extends CustomType {
  constructor(entity_id_1, entity_id_2, material_flow, material_direction, material_future, financial_flow, financial_direction, financial_future, information_flow, information_direction, information_future) {
    super();
    this.entity_id_1 = entity_id_1;
    this.entity_id_2 = entity_id_2;
    this.material_flow = material_flow;
    this.material_direction = material_direction;
    this.material_future = material_future;
    this.financial_flow = financial_flow;
    this.financial_direction = financial_direction;
    this.financial_future = financial_future;
    this.information_flow = information_flow;
    this.information_direction = information_direction;
    this.information_future = information_future;
  }
};
var EmptyForm2 = class extends CustomType {
};
function inspect3(thing) {
  let _pipe = inspect2(thing);
  return console_log(_pipe);
}
function element5() {
  return element2("resource-pooling", toList([]), toList([]));
}
function entity_types() {
  return toList(["Consumer", "Producer", "Scavenger", "Decomposer"]);
}
function get_entity_by_id(model, entity_id) {
  return find2(
    model.entities,
    (entity) => {
      return entity.entity_id === entity_id;
    }
  );
}
function update_existing_entity(model, entity_id, name2, entity_type) {
  return try$(
    get_entity_by_id(model, entity_id),
    (original_entity) => {
      let updated_entity = new Entity(
        name2,
        original_entity.entity_id,
        model.value_activities,
        model.selected_material_ids,
        entity_type
      );
      let updated_entities = map(
        model.entities,
        (entity) => {
          let $ = entity.entity_id === entity_id;
          if ($) {
            return updated_entity;
          } else {
            return entity;
          }
        }
      );
      let updated_model = new Model2(
        model.materials,
        updated_entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      return new Ok([updated_entity, updated_model]);
    }
  );
}
function entity_decoder() {
  return field(
    "name",
    string2,
    (name2) => {
      return field(
        "entity_id",
        string2,
        (entity_id) => {
          return field(
            "value_activities",
            list2(string2),
            (value_activities) => {
              return field(
                "materials",
                list2(string2),
                (materials) => {
                  return field(
                    "entity_type",
                    string2,
                    (entity_type) => {
                      return success(
                        new Entity(
                          name2,
                          entity_id,
                          value_activities,
                          materials,
                          entity_type
                        )
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function get_materials_by_ids(model, material_ids) {
  return filter_map(
    material_ids,
    (id2) => {
      return find2(
        model.materials,
        (material) => {
          return material.material_id === id2;
        }
      );
    }
  );
}
function material_decoder() {
  return field(
    "name",
    string2,
    (name2) => {
      return field(
        "material_id",
        string2,
        (material_id) => {
          return success(new Material(name2, material_id));
        }
      );
    }
  );
}
function get_flow_by_id(model, flow_id) {
  return find2(model.flows, (flow) => {
    return flow.flow_id === flow_id;
  });
}
function update_existing_flow(model, flow_id, entity_id_1, entity_id_2, material_flow, material_direction, material_future, financial_flow, financial_direction, financial_future, information_flow, information_direction, information_future) {
  return try$(
    get_flow_by_id(model, flow_id),
    (original_flow) => {
      let updated_flow = new Flow(
        original_flow.flow_id,
        [entity_id_1, entity_id_2],
        (() => {
          let _pipe = filter(
            toList([
              [material_flow, material_direction, material_future, "Material"],
              [
                financial_flow,
                financial_direction,
                financial_future,
                "Financial"
              ],
              [
                information_flow,
                information_direction,
                information_future,
                "Information"
              ]
            ]),
            (t) => {
              return t[0] === "on";
            }
          );
          return map(
            _pipe,
            (t) => {
              return new FlowType(t[3], t[1], t[2]);
            }
          );
        })()
      );
      let updated_flows = map(
        model.flows,
        (flow) => {
          let $ = flow.flow_id === flow_id;
          if ($) {
            return updated_flow;
          } else {
            return flow;
          }
        }
      );
      let updated_model = new Model2(
        model.materials,
        model.entities,
        updated_flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      return new Ok([updated_flow, updated_model]);
    }
  );
}
function flow_type_decoder() {
  return field(
    "flow_category",
    string2,
    (flow_category) => {
      return field(
        "direction",
        int2,
        (direction) => {
          return field(
            "is_future",
            bool,
            (is_future) => {
              return success(
                new FlowType(flow_category, direction, is_future)
              );
            }
          );
        }
      );
    }
  );
}
function flow_decoder() {
  return field(
    "flow_id",
    string2,
    (flow_id) => {
      return field(
        "entity_ids",
        list2(string2),
        (entity_ids_list) => {
          return field(
            "flow_types",
            list2(flow_type_decoder()),
            (flow_types) => {
              if (entity_ids_list instanceof Empty) {
                return failure(
                  new Flow("", ["", ""], toList([])),
                  "entity_ids must be an array of exactly 2 strings"
                );
              } else {
                let $ = entity_ids_list.tail;
                if ($ instanceof Empty) {
                  return failure(
                    new Flow("", ["", ""], toList([])),
                    "entity_ids must be an array of exactly 2 strings"
                  );
                } else {
                  let $1 = $.tail;
                  if ($1 instanceof Empty) {
                    let first2 = entity_ids_list.head;
                    let second = $.head;
                    return success(
                      new Flow(flow_id, [first2, second], flow_types)
                    );
                  } else {
                    return failure(
                      new Flow("", ["", ""], toList([])),
                      "entity_ids must be an array of exactly 2 strings"
                    );
                  }
                }
              }
            }
          );
        }
      );
    }
  );
}
function new_material_form() {
  return new$8(
    field2(
      "new-material",
      (() => {
        let _pipe = parse_string;
        return check_not_empty(_pipe);
      })(),
      (name2) => {
        return success2(new MaterialsFormData(name2));
      }
    )
  );
}
function new_entity_form() {
  let check_valid_entity_type = (entity_type) => {
    let $ = contains(prepend("", entity_types()), entity_type);
    if ($) {
      return new Ok(entity_type);
    } else {
      return new Error("invalid entity type");
    }
  };
  return new$8(
    field2(
      "name",
      (() => {
        let _pipe = parse_string;
        return check_not_empty(_pipe);
      })(),
      (name2) => {
        return field2(
          "entity-type",
          (() => {
            let _pipe = parse_string;
            let _pipe$1 = check_not_empty(_pipe);
            return check(_pipe$1, check_valid_entity_type);
          })(),
          (entity_type) => {
            return success2(new EntityFormData(name2, entity_type));
          }
        );
      }
    )
  );
}
function new_flow_form(model) {
  let validate_direction = (direction) => {
    if (direction === -1) {
      return new Ok(direction);
    } else if (direction === 0) {
      return new Ok(direction);
    } else if (direction === 1) {
      return new Ok(direction);
    } else {
      return new Error("invalid direction");
    }
  };
  return new$8(
    field2(
      "entity-id-1",
      (() => {
        let _pipe = parse_string;
        return check_not_empty(_pipe);
      })(),
      (entity_id_1) => {
        let validate_not_entity_id_1 = (entity_id_2) => {
          let $ = entity_id_2 === entity_id_1;
          if ($) {
            return new Error("entities must be separate");
          } else {
            return new Ok(entity_id_2);
          }
        };
        let validate_combination_does_not_exist = (entity_id_2) => {
          let $ = model.current_form;
          let $1 = (() => {
            let _pipe = filter(
              model.flows,
              (flow) => {
                return isEqual(flow.entity_ids, [entity_id_1, entity_id_2]) || isEqual(
                  flow.entity_ids,
                  [entity_id_2, entity_id_1]
                );
              }
            );
            return length(_pipe);
          })();
          if ($ instanceof EditFlowForm) {
            return new Ok(entity_id_2);
          } else if ($1 === 0) {
            return new Ok(entity_id_2);
          } else {
            return new Error("entity combination exists");
          }
        };
        return field2(
          "entity-id-2",
          (() => {
            let _pipe = parse_string;
            let _pipe$1 = check_not_empty(_pipe);
            let _pipe$2 = check(_pipe$1, validate_not_entity_id_1);
            return check(_pipe$2, validate_combination_does_not_exist);
          })(),
          (entity_id_2) => {
            return field2(
              "material-direction",
              (() => {
                let _pipe = parse_int2;
                return check(_pipe, validate_direction);
              })(),
              (material_direction) => {
                return field2(
                  "material-future",
                  parse_checkbox,
                  (material_future) => {
                    return field2(
                      "financial-flow",
                      parse_string,
                      (financial_flow) => {
                        return field2(
                          "financial-direction",
                          (() => {
                            let _pipe = parse_int2;
                            return check(_pipe, validate_direction);
                          })(),
                          (financial_direction) => {
                            return field2(
                              "financial-future",
                              parse_checkbox,
                              (financial_future) => {
                                return field2(
                                  "information-flow",
                                  parse_string,
                                  (information_flow) => {
                                    return field2(
                                      "information-direction",
                                      (() => {
                                        let _pipe = parse_int2;
                                        return check(
                                          _pipe,
                                          validate_direction
                                        );
                                      })(),
                                      (information_direction) => {
                                        return field2(
                                          "information-future",
                                          parse_checkbox,
                                          (information_future) => {
                                            let validate_one_flow_exists = (material_flow) => {
                                              let $ = contains(
                                                toList([
                                                  material_flow,
                                                  financial_flow,
                                                  information_flow
                                                ]),
                                                "on"
                                              );
                                              if ($) {
                                                return new Ok(material_flow);
                                              } else {
                                                return new Error(
                                                  "select at least one flow"
                                                );
                                              }
                                            };
                                            return field2(
                                              "material-flow",
                                              (() => {
                                                let _pipe = parse_string;
                                                return check(
                                                  _pipe,
                                                  validate_one_flow_exists
                                                );
                                              })(),
                                              (material_flow) => {
                                                return success2(
                                                  new FlowFormData(
                                                    entity_id_1,
                                                    entity_id_2,
                                                    material_flow,
                                                    material_direction,
                                                    material_future,
                                                    financial_flow,
                                                    financial_direction,
                                                    financial_future,
                                                    information_flow,
                                                    information_direction,
                                                    information_future
                                                  )
                                                );
                                              }
                                            );
                                          }
                                        );
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    )
  );
}
function edit_entity_form(entity) {
  let _pipe = new_entity_form();
  return set_values(
    _pipe,
    toList([["name", entity.name], ["entity-type", entity.entity_type]])
  );
}
function edit_flow_form(flow, model) {
  let model$1 = new Model2(
    model.materials,
    model.entities,
    model.flows,
    model.form,
    new EditFlowForm(flow.flow_id),
    model.next_material_id,
    model.next_entity_id,
    model.next_flow_id,
    model.selected_material_ids,
    model.value_activities
  );
  let _block;
  let $ = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Material";
    }
  );
  if ($ instanceof Ok) {
    _block = "on";
  } else {
    _block = "";
  }
  let material_flow = _block;
  let _block$1;
  let $1 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Financial";
    }
  );
  if ($1 instanceof Ok) {
    _block$1 = "on";
  } else {
    _block$1 = "";
  }
  let financial_flow = _block$1;
  let _block$2;
  let $2 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Information";
    }
  );
  if ($2 instanceof Ok) {
    _block$2 = "on";
  } else {
    _block$2 = "";
  }
  let information_flow = _block$2;
  let _block$3;
  let $3 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Material";
    }
  );
  if ($3 instanceof Ok) {
    let ft = $3[0];
    _block$3 = to_string(ft.direction);
  } else {
    _block$3 = "1";
  }
  let material_direction = _block$3;
  let _block$4;
  let $4 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Material";
    }
  );
  if ($4 instanceof Ok) {
    let ft = $4[0];
    let $52 = ft.is_future;
    if ($52) {
      _block$4 = "on";
    } else {
      _block$4 = "";
    }
  } else {
    _block$4 = "";
  }
  let material_future = _block$4;
  let _block$5;
  let $5 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Financial";
    }
  );
  if ($5 instanceof Ok) {
    let ft = $5[0];
    _block$5 = to_string(ft.direction);
  } else {
    _block$5 = "1";
  }
  let financial_direction = _block$5;
  let _block$6;
  let $6 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Financial";
    }
  );
  if ($6 instanceof Ok) {
    let ft = $6[0];
    let $72 = ft.is_future;
    if ($72) {
      _block$6 = "on";
    } else {
      _block$6 = "";
    }
  } else {
    _block$6 = "";
  }
  let financial_future = _block$6;
  let _block$7;
  let $7 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Information";
    }
  );
  if ($7 instanceof Ok) {
    let ft = $7[0];
    _block$7 = to_string(ft.direction);
  } else {
    _block$7 = "1";
  }
  let information_direction = _block$7;
  let _block$8;
  let $8 = find2(
    flow.flow_types,
    (ft) => {
      return ft.flow_category === "Information";
    }
  );
  if ($8 instanceof Ok) {
    let ft = $8[0];
    let $9 = ft.is_future;
    if ($9) {
      _block$8 = "on";
    } else {
      _block$8 = "";
    }
  } else {
    _block$8 = "";
  }
  let information_future = _block$8;
  let base_values = toList([
    ["entity-id-1", flow.entity_ids[0]],
    ["entity-id-2", flow.entity_ids[1]],
    ["material-direction", material_direction],
    ["financial-direction", financial_direction],
    ["information-direction", information_direction]
  ]);
  let checkbox_values = filter(
    toList([
      ["material-flow", material_flow],
      ["financial-flow", financial_flow],
      ["information-flow", information_flow],
      ["material-future", material_future],
      ["financial-future", financial_future],
      ["information-future", information_future]
    ]),
    (pair) => {
      return pair[1] === "on";
    }
  );
  let _pipe = new_flow_form(model$1);
  return set_values(_pipe, append(base_values, checkbox_values));
}
function render_input_field2(form3, name2, label2) {
  let errors = field_error_messages(form3, name2);
  return div(
    toList([]),
    prepend(
      div(
        toList([class$("py-2")]),
        toList([
          label(
            toList([for$(name2)]),
            toList([text2(label2 + ": ")])
          )
        ])
      ),
      prepend(
        input(
          toList([
            class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
            id(name2),
            type_("text"),
            name(name2),
            value(field_value(form3, name2))
          ])
        ),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      )
    )
  );
}
function render_entity_select_field(form3, name2, label2, entities) {
  let errors = field_error_messages(form3, name2);
  return div(
    toList([]),
    prepend(
      div(
        toList([class$("py-2")]),
        toList([
          label(
            toList([for$(name2)]),
            toList([text2(label2 + ": ")])
          )
        ])
      ),
      prepend(
        select(
          toList([
            class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
            id(name2),
            name(name2)
          ]),
          prepend(
            option(
              toList([
                value(""),
                selected(field_value(form3, name2) === "")
              ]),
              "Select an entity..."
            ),
            map(
              entities,
              (entity) => {
                let is_selected = field_value(form3, name2) === entity.entity_id;
                return option(
                  toList([
                    value(entity.entity_id),
                    selected(is_selected)
                  ]),
                  (() => {
                    let $ = entity.name;
                    let $1 = entity.entity_id;
                    if ($1.startsWith("entity-id-") && $ === "") {
                      let id$1 = $1.slice(10);
                      return "Entity " + id$1;
                    } else {
                      return entity.name;
                    }
                  })()
                );
              }
            )
          )
        ),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      )
    )
  );
}
function render_new_item_field(name2, input_id) {
  return div(
    toList([class$("flex py-2")]),
    toList([
      input(
        toList([
          class$("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
          id(input_id),
          type_("text"),
          name(name2),
          value("")
        ])
      ),
      button(
        toList([
          class$(
            "w-1/8 bg-green-600 hover:bg-green-400 rounded-sm p-1 ml-2 flex items-center justify-center"
          )
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("d", "M12 4.5v15m7.5-7.5h-15")
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function render_existing_material_field(material) {
  let edit_material = (name2) => {
    return new EditMaterial(name2, material.material_id);
  };
  return div(
    toList([class$("flex py-2")]),
    toList([
      input(
        toList([
          class$("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
          id(material.material_id),
          type_("text"),
          name(material.material_id),
          value(material.name),
          on_change(edit_material)
        ])
      ),
      button(
        toList([
          class$(
            "w-1/8 bg-red-600 hover:bg-red-400 rounded-sm p-1 ml-2 flex items-center justify-center"
          ),
          type_("button"),
          on_click(new DeleteMaterial(material.material_id))
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("d", "M6 18 18 6M6 6l12 12")
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function render_materials_form(form3, model) {
  let handle_submit = (values3) => {
    let _pipe = form3;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new NewMaterialSubmit(_pipe$2);
  };
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form2(
        toList([on_submit(handle_submit)]),
        prepend(
          render_new_item_field(
            "new-material",
            "material-id-" + to_string(model.next_material_id)
          ),
          (() => {
            let _pipe = model.materials;
            let _pipe$1 = map(
              _pipe,
              (material) => {
                return render_existing_material_field(material);
              }
            );
            return reverse(_pipe$1);
          })()
        )
      )
    ])
  );
}
function render_existing_value_activity(activity, activity_id) {
  let edit_value_activity = (name2) => {
    return new EditValueActivity(name2, activity_id);
  };
  return div(
    toList([class$("flex py-2")]),
    toList([
      input(
        toList([
          class$("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
          id("activity-id-" + to_string(activity_id)),
          type_("text"),
          name("activity-" + activity),
          value(activity),
          on_change(edit_value_activity)
        ])
      ),
      button(
        toList([
          class$(
            "w-1/8 bg-red-600 hover:bg-red-400 rounded-sm p-1 ml-2 flex items-center justify-center"
          ),
          type_("button"),
          on_click(new DeleteValueActivity(activity))
        ]),
        toList([
          svg(
            toList([
              attribute2("stroke-width", "1.5"),
              attribute2("stroke", "currentColor"),
              class$("size-6")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("d", "M6 18 18 6M6 6l12 12")
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function render_entity_type_selection(form3) {
  let errors = field_error_messages(form3, "entity-type");
  let current_entity_type = field_value(form3, "entity-type");
  return div(
    toList([class$("py-2")]),
    prepend(
      label(toList([]), toList([text2("Select Type:")])),
      prepend(
        select(
          toList([
            class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1 mt-2"),
            name("entity-type"),
            value(field_value(form3, "entity-type"))
          ]),
          prepend(
            option(
              (() => {
                if (current_entity_type === "") {
                  return toList([
                    value(""),
                    selected(true)
                  ]);
                } else {
                  return toList([value("")]);
                }
              })(),
              "Select entity type..."
            ),
            map(
              entity_types(),
              (entity_type) => {
                return option(
                  (() => {
                    let $ = current_entity_type === entity_type;
                    if ($) {
                      return toList([
                        value(entity_type),
                        selected(true)
                      ]);
                    } else {
                      return toList([value(entity_type)]);
                    }
                  })(),
                  entity_type
                );
              }
            )
          )
        ),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      )
    )
  );
}
function render_flow_options(form3, flow_type) {
  let errors = field_error_messages(form3, flow_type + "-flow");
  let flow_type_options_class = "flex-1 px-2 py-1 mt-1 bg-gray-600 rounded-sm " + (() => {
    let $ = field_value(form3, flow_type + "-flow");
    if ($ === "") {
      return "hidden";
    } else {
      return "";
    }
  })();
  return div(
    toList([class$("py-2")]),
    toList([
      label(
        toList([class$("mr-2")]),
        toList([text2(capitalise(flow_type) + " Flow")])
      ),
      input(
        toList([
          type_("checkbox"),
          name(flow_type + "-flow"),
          checked(
            field_value(form3, flow_type + "-flow") === "on"
          ),
          on_click(new ToggleFlowType(flow_type))
        ])
      ),
      div(
        toList([class$("w-full")]),
        map(
          errors,
          (error_message) => {
            return p(
              toList([class$("mt-0.5 text-xs text-red-300")]),
              toList([text3(error_message)])
            );
          }
        )
      ),
      div(
        toList([class$(flow_type_options_class)]),
        toList([
          div(
            toList([class$("w-full text-sm")]),
            toList([
              label(
                toList([for$(flow_type + "-direction")]),
                toList([text2("Direction: ")])
              ),
              select(
                toList([
                  class$(
                    "ml-2 w-1/2 bg-gray-200 text-gray-700 rounded-sm px-2 mt-2"
                  ),
                  name(flow_type + "-direction")
                ]),
                toList([
                  option(
                    toList([
                      value("1"),
                      selected(
                        field_value(form3, flow_type + "-direction") === "1"
                      )
                    ]),
                    "1 \u2192 2"
                  ),
                  option(
                    toList([
                      value("-1"),
                      selected(
                        field_value(form3, flow_type + "-direction") === "-1"
                      )
                    ]),
                    "2 \u2192 1"
                  ),
                  option(
                    toList([
                      value("0"),
                      selected(
                        field_value(form3, flow_type + "-direction") === "0"
                      )
                    ]),
                    "Bidirectional"
                  )
                ])
              )
            ])
          ),
          div(
            toList([class$("w-full mt-2 text-sm")]),
            toList([
              label(
                toList([for$(flow_type + "-future")]),
                toList([text2("Future State? ")])
              ),
              input(
                toList([
                  type_("checkbox"),
                  name(flow_type + "-future"),
                  class$("ml-2"),
                  checked(
                    field_value(form3, flow_type + "-future") === "on"
                  ),
                  on_click(new ToggleFutureState(flow_type))
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function render_materials_selection(model, materials, selected_material_ids) {
  let selected_materials = get_materials_by_ids(model, selected_material_ids);
  return div(
    toList([class$("py-2")]),
    toList([
      label(toList([]), toList([text2("Select Materials:")])),
      div(
        toList([]),
        map(
          selected_materials,
          (material) => {
            return span(
              toList([
                class$(
                  "inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20 cursor-pointer mr-2"
                ),
                on_click(
                  new RemoveSelectedMaterial(material.material_id)
                )
              ]),
              toList([
                text2(material.name),
                svg(
                  toList([
                    attribute2("viewBox", "0 0 24 24"),
                    attribute2("fill", "none"),
                    attribute2("stroke", "currentColor"),
                    attribute2("stroke-width", "1.5"),
                    class$("ml-1 size-4")
                  ]),
                  toList([
                    path(
                      toList([
                        attribute2("stroke-linecap", "round"),
                        attribute2("stroke-linejoin", "round"),
                        attribute2("d", "M6 18 18 6M6 6l12 12")
                      ])
                    )
                  ])
                )
              ])
            );
          }
        )
      ),
      select(
        toList([
          class$("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1 mt-2"),
          on_change((var0) => {
            return new SelectMaterial(var0);
          }),
          name("select-material"),
          value("")
        ]),
        prepend(
          option(toList([value("")]), "Select a material..."),
          (() => {
            let _pipe = map(
              materials,
              (material) => {
                return option(
                  toList([value(material.material_id)]),
                  material.name
                );
              }
            );
            return reverse(_pipe);
          })()
        )
      )
    ])
  );
}
function render_submit_button2(current_form, form_id) {
  let _block;
  if (current_form instanceof NewEntityForm) {
    _block = "Add Entity";
  } else if (current_form instanceof EditEntityForm) {
    _block = "Edit Entity";
  } else if (current_form instanceof NewFlowForm) {
    _block = "Add Flow";
  } else if (current_form instanceof EditFlowForm) {
    _block = "Edit Flow";
  } else {
    _block = "";
  }
  let button_text = _block;
  return div(
    toList([class$("py-2")]),
    toList([
      button(
        toList([
          class$(
            "w-full bg-pink-600 hover:bg-pink-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          form(form_id)
        ]),
        toList([text2(button_text)])
      )
    ])
  );
}
function render_delete_button2(current_form) {
  let _block;
  if (current_form instanceof EditEntityForm) {
    let entity_id = current_form.entity_id;
    _block = [new DeleteEntity(entity_id), "Delete Entity"];
  } else if (current_form instanceof EditFlowForm) {
    let flow_id = current_form.flow_id;
    _block = [new DeleteFlow(flow_id), "Delete Flow"];
  } else {
    _block = [new DeleteEntity(""), ""];
  }
  let $ = _block;
  let message;
  let label2;
  message = $[0];
  label2 = $[1];
  if (label2 === "") {
    return none2();
  } else {
    return button(
      toList([
        class$(
          "w-full bg-red-600 hover:bg-red-800 px-3 py-2 rounded-sm cursor-pointer"
        ),
        on_click(message)
      ]),
      toList([text2(label2)])
    );
  }
}
function render_entity_form(form3, model) {
  let handle_submit = (values3) => {
    let _pipe = form3;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new EntityFormSubmit(_pipe$2);
  };
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form2(
        toList([on_submit(handle_submit), id("main-entity-form")]),
        toList([
          render_input_field2(form3, "name", "Name"),
          render_entity_type_selection(form3),
          render_materials_selection(
            model,
            model.materials,
            model.selected_material_ids
          )
        ])
      ),
      form2(
        toList([
          on_submit((var0) => {
            return new NewValueActivity(var0);
          })
        ]),
        prepend(
          label(toList([]), toList([text2("Value Activities:")])),
          prepend(
            render_new_item_field("new-value-activity", "new-value-activity"),
            (() => {
              let _pipe = map_fold(
                model.value_activities,
                0,
                (acc, activity) => {
                  return [
                    acc + 1,
                    render_existing_value_activity(activity, acc)
                  ];
                }
              )[1];
              return reverse(_pipe);
            })()
          )
        )
      ),
      render_submit_button2(model.current_form, "main-entity-form"),
      render_delete_button2(model.current_form)
    ])
  );
}
function render_flow_form(form3, model) {
  let handle_submit = (values3) => {
    let _pipe = form3;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new FlowFormSubmit(_pipe$2);
  };
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form2(
        toList([id("flow-form"), on_submit(handle_submit)]),
        toList([
          render_entity_select_field(
            form3,
            "entity-id-1",
            "Entity 1",
            model.entities
          ),
          render_entity_select_field(
            form3,
            "entity-id-2",
            "Entity 2",
            model.entities
          ),
          render_flow_options(form3, "material"),
          render_flow_options(form3, "financial"),
          render_flow_options(form3, "information"),
          render_submit_button2(model.current_form, "flow-form"),
          render_delete_button2(model.current_form)
        ])
      )
    ])
  );
}
function render_form2(model) {
  let $ = model.current_form;
  if ($ instanceof NewEntityForm) {
    return render_entity_form(model.form, model);
  } else if ($ instanceof EditEntityForm) {
    return render_entity_form(model.form, model);
  } else if ($ instanceof MaterialsForm) {
    return render_materials_form(model.form, model);
  } else if ($ instanceof NewFlowForm) {
    return render_flow_form(model.form, model);
  } else if ($ instanceof EditFlowForm) {
    return render_flow_form(model.form, model);
  } else {
    return none2();
  }
}
function render_import_export_buttons2() {
  return div(
    toList([class$("flex-1 mb-2")]),
    toList([
      button(
        toList([
          class$(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          on_click(new DownloadModel2())
        ]),
        toList([text2("Download")])
      ),
      label(
        toList([
          class$(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer ml-2 inline-block"
          ),
          for$("import-file")
        ]),
        toList([
          text2("Import"),
          input(
            toList([
              id("import-file"),
              type_("file"),
              accept(toList([".json"])),
              class$("hidden")
            ])
          )
        ])
      )
    ])
  );
}
function render_controls2(model) {
  return div(
    toList([
      class$(
        "flex-1 bg-gray-700 text-gray-200 p-4 rounded-lg transition-all duration-300 ease-in-out"
      )
    ]),
    toList([
      render_import_export_buttons2(),
      button(
        toList([
          class$(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          on_click(new StartEntityForm(""))
        ]),
        toList([text2("Entity")])
      ),
      button(
        toList([
          class$(
            "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          on_click(new StartMaterialsForm())
        ]),
        toList([text2("Materials")])
      ),
      button(
        toList([
          class$(
            "bg-amber-600 hover:bg-amber-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          on_click(new StartFlowForm(""))
        ]),
        toList([text2("Flow")])
      ),
      render_form2(model)
    ])
  );
}
function view2(model) {
  return div(
    toList([class$("flex flex-1")]),
    toList([
      div(
        toList([class$("flex-col w-2/3 p-4")]),
        toList([
          h1(
            toList([class$("text-4xl font-extrabold mb-6")]),
            toList([text2("Resource Pooling")])
          ),
          div(
            toList([
              class$(
                "flex-1 border-2 border-solid border-gray-900 rounded-lg p-1"
              ),
              id("resource-pooling")
            ]),
            toList([])
          )
        ])
      ),
      div(
        toList([class$("flex-col w-1/3 p-4")]),
        toList([render_controls2(model)])
      )
    ])
  );
}
function empty_form2() {
  let _pipe = success2(new EmptyForm2());
  return new$8(_pipe);
}
function model_decoder2() {
  return field(
    "materials",
    list2(material_decoder()),
    (materials) => {
      return field(
        "entities",
        list2(entity_decoder()),
        (entities) => {
          return field(
            "flows",
            list2(flow_decoder()),
            (flows) => {
              return field(
                "next_material_id",
                int2,
                (next_material_id) => {
                  return field(
                    "next_entity_id",
                    int2,
                    (next_entity_id) => {
                      return field(
                        "next_flow_id",
                        int2,
                        (next_flow_id) => {
                          return success(
                            new Model2(
                              materials,
                              entities,
                              flows,
                              empty_form2(),
                              new NoForm2(),
                              next_material_id,
                              next_entity_id,
                              next_flow_id,
                              toList([]),
                              toList([])
                            )
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function reset_form2(model) {
  return new Model2(
    model.materials,
    model.entities,
    model.flows,
    empty_form2(),
    new NoForm2(),
    model.next_material_id,
    model.next_entity_id,
    model.next_flow_id,
    model.selected_material_ids,
    model.value_activities
  );
}
function serialise_material(material) {
  return object2(
    toList([
      ["name", string3(material.name)],
      ["material_id", string3(material.material_id)]
    ])
  );
}
function serialise_entity(entity) {
  return object2(
    toList([
      ["name", string3(entity.name)],
      ["entity_id", string3(entity.entity_id)],
      ["value_activities", array2(entity.value_activities, string3)],
      ["materials", array2(entity.materials, string3)],
      ["entity_type", string3(entity.entity_type)]
    ])
  );
}
function serialise_flow_type(flow_type) {
  return object2(
    toList([
      ["flow_category", string3(flow_type.flow_category)],
      ["direction", int3(flow_type.direction)],
      ["is_future", bool2(flow_type.is_future)]
    ])
  );
}
function serialise_flow(flow) {
  return object2(
    toList([
      ["flow_id", string3(flow.flow_id)],
      [
        "entity_ids",
        array2(
          toList([flow.entity_ids[0], flow.entity_ids[1]]),
          string3
        )
      ],
      ["flow_types", array2(flow.flow_types, serialise_flow_type)]
    ])
  );
}
function serialise_model2(model) {
  let _pipe = object2(
    toList([
      ["materials", array2(model.materials, serialise_material)],
      ["entities", array2(model.entities, serialise_entity)],
      ["flows", array2(model.flows, serialise_flow)],
      ["next_material_id", int3(model.next_material_id)],
      ["next_entity_id", int3(model.next_entity_id)],
      ["next_flow_id", int3(model.next_flow_id)]
    ])
  );
  return to_string2(_pipe);
}
function deserialise_model2(json_data) {
  return parse(json_data, model_decoder2());
}
function init2(_) {
  let init_effect = from(
    (dispatch) => {
      initResourcePooling();
      let dispatch_wrapper = (message) => {
        if (message.startsWith("entity_id:")) {
          let entity_id = message.slice(10);
          return dispatch(new StartEntityForm(entity_id));
        } else if (message.startsWith("import:")) {
          let json_data = message.slice(7);
          return dispatch(new ImportModel2(json_data));
        } else if (message.startsWith("flow_id:")) {
          let flow_id = message.slice(8);
          return dispatch(new StartFlowForm(flow_id));
        } else {
          return void 0;
        }
      };
      setDispatch2(dispatch_wrapper);
      return setupFileImport2(dispatch_wrapper);
    }
  );
  return [
    new Model2(
      toList([]),
      toList([]),
      toList([]),
      empty_form2(),
      new NoForm2(),
      1,
      1,
      1,
      toList([]),
      toList([])
    ),
    init_effect
  ];
}
function update3(model, message) {
  inspect3(message);
  if (message instanceof StartEntityForm) {
    let $ = message.entity_id;
    if ($ === "") {
      return [
        new Model2(
          model.materials,
          model.entities,
          model.flows,
          new_entity_form(),
          new NewEntityForm(),
          model.next_material_id,
          model.next_entity_id,
          model.next_flow_id,
          toList([]),
          toList([])
        ),
        none()
      ];
    } else {
      let entity_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_entity_by_id(_pipe, entity_id);
      _block = unwrap2(
        _pipe$1,
        new Entity("default", "", toList([]), toList([]), "")
      );
      let entity = _block;
      let $1 = entity.entity_id;
      if ($1 === "default") {
        return [model, none()];
      } else {
        return [
          new Model2(
            model.materials,
            model.entities,
            model.flows,
            edit_entity_form(entity),
            new EditEntityForm(entity.entity_id),
            model.next_material_id,
            model.next_entity_id,
            model.next_flow_id,
            entity.materials,
            entity.value_activities
          ),
          none()
        ];
      }
    }
  } else if (message instanceof StartMaterialsForm) {
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        new_material_form(),
        new MaterialsForm(),
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof StartFlowForm) {
    let $ = message.flow_id;
    if ($ === "") {
      return [
        new Model2(
          model.materials,
          model.entities,
          model.flows,
          new_flow_form(model),
          new NewFlowForm(),
          model.next_material_id,
          model.next_entity_id,
          model.next_flow_id,
          toList([]),
          toList([])
        ),
        none()
      ];
    } else {
      let flow_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_flow_by_id(_pipe, flow_id);
      _block = unwrap2(
        _pipe$1,
        new Flow("default", ["", ""], toList([]))
      );
      let flow = _block;
      let $1 = flow.flow_id;
      if ($1 === "default") {
        return [model, none()];
      } else {
        return [
          new Model2(
            model.materials,
            model.entities,
            model.flows,
            edit_flow_form(flow, model),
            new EditFlowForm(flow.flow_id),
            model.next_material_id,
            model.next_entity_id,
            model.next_flow_id,
            model.selected_material_ids,
            model.value_activities
          ),
          none()
        ];
      }
    }
  } else if (message instanceof FlowFormSubmit) {
    let $ = message[0];
    if ($ instanceof Ok) {
      let $1 = $[0];
      if ($1 instanceof FlowFormData) {
        let entity_id_1 = $1.entity_id_1;
        let entity_id_2 = $1.entity_id_2;
        let material_flow = $1.material_flow;
        let material_direction = $1.material_direction;
        let material_future = $1.material_future;
        let financial_flow = $1.financial_flow;
        let financial_direction = $1.financial_direction;
        let financial_future = $1.financial_future;
        let information_flow = $1.information_flow;
        let information_direction = $1.information_direction;
        let information_future = $1.information_future;
        let $2 = model.current_form;
        if ($2 instanceof NewFlowForm) {
          let new_flow = new Flow(
            "flow-id-" + to_string(model.next_flow_id),
            [entity_id_1, entity_id_2],
            (() => {
              let _pipe = filter(
                toList([
                  [
                    material_flow,
                    material_direction,
                    material_future,
                    "Material"
                  ],
                  [
                    financial_flow,
                    financial_direction,
                    financial_future,
                    "Financial"
                  ],
                  [
                    information_flow,
                    information_direction,
                    information_future,
                    "Information"
                  ]
                ]),
                (t) => {
                  return t[0] === "on";
                }
              );
              return map(
                _pipe,
                (t) => {
                  return new FlowType(t[3], t[1], t[2]);
                }
              );
            })()
          );
          createFlow(new_flow);
          return [
            new Model2(
              model.materials,
              model.entities,
              prepend(new_flow, model.flows),
              empty_form2(),
              new NoForm2(),
              model.next_material_id,
              model.next_entity_id,
              model.next_flow_id + 1,
              toList([]),
              toList([])
            ),
            none()
          ];
        } else if ($2 instanceof EditFlowForm) {
          let flow_id = $2.flow_id;
          let $3 = update_existing_flow(
            model,
            flow_id,
            entity_id_1,
            entity_id_2,
            material_flow,
            material_direction,
            material_future,
            financial_flow,
            financial_direction,
            financial_future,
            information_flow,
            information_direction,
            information_future
          );
          if ($3 instanceof Ok) {
            let flow = $3[0][0];
            let updated_model = $3[0][1];
            editFlow(flow);
            return [reset_form2(updated_model), none()];
          } else {
            return [model, none()];
          }
        } else {
          return [model, none()];
        }
      } else {
        return [model, none()];
      }
    } else {
      let form3 = $[0];
      let updated_model = new Model2(
        model.materials,
        model.entities,
        model.flows,
        form3,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      return [updated_model, none()];
    }
  } else if (message instanceof DeleteMaterial) {
    let material_id = message.material_id;
    let updated_materials = filter(
      model.materials,
      (material) => {
        return material.material_id !== material_id;
      }
    );
    return [
      new Model2(
        updated_materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof NewMaterialSubmit) {
    let $ = message[0];
    if ($ instanceof Ok) {
      let $1 = $[0];
      if ($1 instanceof MaterialsFormData) {
        let name2 = $1.name;
        return [
          new Model2(
            (() => {
              let _pipe = prepend(
                new Material(
                  name2,
                  "material-id-" + to_string(model.next_material_id)
                ),
                model.materials
              );
              return unique(_pipe);
            })(),
            model.entities,
            model.flows,
            model.form,
            model.current_form,
            model.next_material_id + 1,
            model.next_entity_id,
            model.next_flow_id,
            toList([]),
            toList([])
          ),
          none()
        ];
      } else {
        return [model, none()];
      }
    } else {
      let form3 = $[0];
      let updated_model = new Model2(
        model.materials,
        model.entities,
        model.flows,
        form3,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      return [updated_model, none()];
    }
  } else if (message instanceof EditMaterial) {
    let name2 = message.name;
    let material_id = message.material_id;
    let updated_materials = map(
      model.materials,
      (material) => {
        let $ = material.material_id === material_id;
        if ($) {
          return new Material(name2, material.material_id);
        } else {
          return material;
        }
      }
    );
    updateMaterial(name2, material_id);
    return [
      new Model2(
        updated_materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof EntityFormSubmit) {
    let $ = message[0];
    if ($ instanceof Ok) {
      let $1 = $[0];
      if ($1 instanceof EntityFormData) {
        let name2 = $1.name;
        let entity_type = $1.entity_type;
        let $2 = model.current_form;
        if ($2 instanceof NewEntityForm) {
          let new_entity = new Entity(
            name2,
            "entity-id-" + to_string(model.next_entity_id),
            model.value_activities,
            model.selected_material_ids,
            entity_type
          );
          createEntity(new_entity, model.materials);
          return [
            new Model2(
              model.materials,
              prepend(new_entity, model.entities),
              model.flows,
              empty_form2(),
              new NoForm2(),
              model.next_material_id,
              model.next_entity_id + 1,
              model.next_flow_id,
              toList([]),
              toList([])
            ),
            none()
          ];
        } else if ($2 instanceof EditEntityForm) {
          let entity_id = $2.entity_id;
          let $3 = update_existing_entity(model, entity_id, name2, entity_type);
          if ($3 instanceof Ok) {
            let entity = $3[0][0];
            let updated_model = $3[0][1];
            editEntity(entity, model.materials);
            return [reset_form2(updated_model), none()];
          } else {
            return [model, none()];
          }
        } else {
          return [model, none()];
        }
      } else {
        return [model, none()];
      }
    } else {
      let form3 = $[0];
      let updated_model = new Model2(
        model.materials,
        model.entities,
        model.flows,
        form3,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      return [updated_model, none()];
    }
  } else if (message instanceof SelectMaterial) {
    let material_id = message.material_id;
    let _block;
    let _pipe = prepend(material_id, model.selected_material_ids);
    let _pipe$1 = sort(_pipe, compare3);
    _block = unique(_pipe$1);
    let updated_selected_material_ids = _block;
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        updated_selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof RemoveSelectedMaterial) {
    let material_id = message.material_id;
    let updated_selected_material_ids = filter(
      model.selected_material_ids,
      (m_id) => {
        return m_id !== material_id;
      }
    );
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        updated_selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof NewValueActivity) {
    let $ = message[0];
    if ($ instanceof Empty) {
      return [model, none()];
    } else {
      let $1 = $.head[1];
      if ($1 === "") {
        return [model, none()];
      } else {
        let new_value_activity = $1;
        return [
          new Model2(
            model.materials,
            model.entities,
            model.flows,
            model.form,
            model.current_form,
            model.next_material_id,
            model.next_entity_id,
            model.next_flow_id,
            model.selected_material_ids,
            unique(
              prepend(new_value_activity, model.value_activities)
            )
          ),
          none()
        ];
      }
    }
  } else if (message instanceof EditValueActivity) {
    let activity = message.activity;
    let id$1 = message.activity_id;
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        (() => {
          let _pipe = model.value_activities;
          return index_map(
            _pipe,
            (act, i) => {
              let $ = i === id$1;
              if ($) {
                return activity;
              } else {
                return act;
              }
            }
          );
        })()
      ),
      none()
    ];
  } else if (message instanceof DeleteValueActivity) {
    let activity = message.activity;
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        filter(
          model.value_activities,
          (act) => {
            return act !== activity;
          }
        )
      ),
      none()
    ];
  } else if (message instanceof DeleteEntity) {
    let entity_id = message.entity_id;
    let $ = get_entity_by_id(model, entity_id);
    if ($ instanceof Ok) {
      let entity = $[0];
      let updated_entities = filter(
        model.entities,
        (entity2) => {
          return entity2.entity_id !== entity_id;
        }
      );
      let connected_flows = filter(
        model.flows,
        (flow) => {
          return flow.entity_ids[0] === entity_id || flow.entity_ids[1] === entity_id;
        }
      );
      let updated_flows = filter(
        model.flows,
        (flow) => {
          return flow.entity_ids[0] !== entity_id && flow.entity_ids[1] !== entity_id;
        }
      );
      let _block;
      let _pipe = new Model2(
        model.materials,
        updated_entities,
        updated_flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      _block = reset_form2(_pipe);
      let updated_model = _block;
      deleteEntity(entity.entity_id);
      each(
        connected_flows,
        (flow) => {
          return deleteFlow(flow.flow_id);
        }
      );
      return [updated_model, none()];
    } else {
      return [model, none()];
    }
  } else if (message instanceof ToggleFlowType) {
    let flow_type = message.flow_type;
    let all_flow_types = toList(["material", "financial", "information"]);
    let flow_field = flow_type + "-flow";
    let is_currently_checked = field_value(model.form, flow_field) === "on";
    let new_form = new_flow_form(model);
    let base_values = toList([
      ["entity-id-1", field_value(model.form, "entity-id-1")],
      ["entity-id-2", field_value(model.form, "entity-id-2")]
    ]);
    let flow_values = flat_map(
      all_flow_types,
      (t) => {
        let flow_field_name = t + "-flow";
        let direction_field = t + "-direction";
        let future_field_name = t + "-future";
        let future_value = field_value(model.form, future_field_name);
        let _block;
        let $ = t === flow_type;
        if ($) {
          if (is_currently_checked) {
            _block = toList([]);
          } else {
            _block = toList([[flow_field_name, "on"]]);
          }
        } else {
          let $1 = field_value(model.form, flow_field_name);
          if ($1 === "on") {
            _block = toList([[flow_field_name, "on"]]);
          } else {
            _block = toList([]);
          }
        }
        let flow_checkbox_value = _block;
        let direction_values = toList([
          [direction_field, field_value(model.form, direction_field)]
        ]);
        let _block$1;
        if (future_value === "on") {
          _block$1 = toList([[future_field_name, "on"]]);
        } else {
          _block$1 = toList([]);
        }
        let future_values = _block$1;
        return flatten(
          toList([flow_checkbox_value, direction_values, future_values])
        );
      }
    );
    let all_values = append(base_values, flow_values);
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        (() => {
          let _pipe = new_form;
          return set_values(_pipe, all_values);
        })(),
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof ToggleFutureState) {
    let flow_type = message.flow_type;
    let all_flow_types = toList(["material", "financial", "information"]);
    let future_field = flow_type + "-future";
    let is_currently_checked = field_value(model.form, future_field) === "on";
    let new_form = new_flow_form(model);
    let base_values = toList([
      ["entity-id-1", field_value(model.form, "entity-id-1")],
      ["entity-id-2", field_value(model.form, "entity-id-2")]
    ]);
    let flow_values = flat_map(
      all_flow_types,
      (t) => {
        let flow_field = t + "-flow";
        let direction_field = t + "-direction";
        let future_field_name = t + "-future";
        let future_value = field_value(model.form, future_field_name);
        let base_flow_values = toList([
          [flow_field, field_value(model.form, flow_field)],
          [direction_field, field_value(model.form, direction_field)]
        ]);
        let _block;
        let $ = t === flow_type;
        if ($) {
          if (is_currently_checked) {
            _block = toList([]);
          } else {
            _block = toList([[future_field_name, "on"]]);
          }
        } else {
          if (future_value === "on") {
            _block = toList([[future_field_name, "on"]]);
          } else {
            _block = toList([]);
          }
        }
        let future_values = _block;
        return append(base_flow_values, future_values);
      }
    );
    let all_values = append(base_values, flow_values);
    return [
      new Model2(
        model.materials,
        model.entities,
        model.flows,
        (() => {
          let _pipe = new_form;
          return set_values(_pipe, all_values);
        })(),
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      ),
      none()
    ];
  } else if (message instanceof DeleteFlow) {
    let flow_id = message.flow_id;
    let $ = get_flow_by_id(model, flow_id);
    if ($ instanceof Ok) {
      let flow = $[0];
      let updated_flows = filter(
        model.flows,
        (f) => {
          return flow.flow_id !== f.flow_id;
        }
      );
      let _block;
      let _pipe = new Model2(
        model.materials,
        model.entities,
        updated_flows,
        model.form,
        model.current_form,
        model.next_material_id,
        model.next_entity_id,
        model.next_flow_id,
        model.selected_material_ids,
        model.value_activities
      );
      _block = reset_form2(_pipe);
      let updated_model = _block;
      deleteFlow(flow.flow_id);
      return [updated_model, none()];
    } else {
      return [model, none()];
    }
  } else if (message instanceof DownloadModel2) {
    let model_data = serialise_model2(model);
    downloadModelData2(model_data);
    return [model, none()];
  } else {
    let json_data = message.json_data;
    let $ = deserialise_model2(json_data);
    if ($ instanceof Ok) {
      let imported_model = $[0];
      let recreation_effect = from(
        (_) => {
          return restoreD3StateAfterImport(
            imported_model.entities,
            imported_model.materials,
            imported_model.flows
          );
        }
      );
      return [imported_model, recreation_effect];
    } else {
      return [model, none()];
    }
  }
}
function register2() {
  let component = application(init2, update3, view2);
  return make_component(component, "resource-pooling");
}

// build/dev/javascript/viz/viz.mjs
var FILEPATH = "src/viz.gleam";
var Model3 = class extends CustomType {
  constructor(page, show_menu) {
    super();
    this.page = page;
    this.show_menu = show_menu;
  }
};
var FlowMap = class extends CustomType {
};
var ResourcePooling = class extends CustomType {
};
var ToggleMenu = class extends CustomType {
};
function init3(_) {
  return new Model3("Flow Map", true);
}
function update4(model, message) {
  if (message instanceof FlowMap) {
    return new Model3("Flow Map", model.show_menu);
  } else if (message instanceof ResourcePooling) {
    return new Model3("Resource Pooling", model.show_menu);
  } else {
    return new Model3(model.page, !model.show_menu);
  }
}
function nav_class(model) {
  let base_class = "bg-gray-900 text-gray-200 flex flex-col py-12 transition-all duration-300 ease-in-out flex-shrink-0";
  return class$(
    (() => {
      let $ = model.show_menu;
      if ($) {
        return base_class + " w-64 px-4";
      } else {
        return base_class + " w-16 px-2";
      }
    })()
  );
}
function menu_items_class(model) {
  return class$(
    (() => {
      let $ = model.show_menu;
      if ($) {
        return "flex flex-col";
      } else {
        return "hidden";
      }
    })()
  );
}
function link_class(label2, model) {
  let base_class = "rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white cursor-pointer";
  return class$(
    (() => {
      let $ = label2 === model.page;
      if ($) {
        return base_class + " bg-gray-950";
      } else {
        return base_class;
      }
    })()
  );
}
function content_class(model, component) {
  return class$(
    (() => {
      let $ = model.page === component;
      if ($) {
        return "w-full h-full";
      } else {
        return "hidden";
      }
    })()
  );
}
function view3(model) {
  return div(
    toList([class$("min-h-screen flex bg-gray-200 overflow-auto")]),
    toList([
      nav(
        toList([nav_class(model)]),
        toList([
          a(
            toList([
              class$(
                "rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white cursor-pointer mb-4"
              ),
              on_click(new ToggleMenu())
            ]),
            toList([
              svg(
                toList([
                  attribute2("stroke-width", "1.5"),
                  attribute2("stroke", "currentColor"),
                  class$("size-6")
                ]),
                toList([
                  path(
                    toList([
                      attribute2("stroke-linecap", "round"),
                      attribute2("stroke-linejoin", "round"),
                      attribute2(
                        "d",
                        "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      )
                    ])
                  )
                ])
              )
            ])
          ),
          div(
            toList([menu_items_class(model)]),
            toList([
              a(
                toList([
                  link_class("Flow Map", model),
                  on_click(new FlowMap())
                ]),
                toList([text2("Flow Map")])
              ),
              a(
                toList([
                  link_class("Resource Pooling", model),
                  on_click(new ResourcePooling())
                ]),
                toList([text2("Resource Pooling")])
              )
            ])
          )
        ])
      ),
      div(
        toList([class$("flex flex-col px-12 flex-1 min-w-0")]),
        toList([
          div(
            toList([class$("flex-1 w-full py-4")]),
            toList([
              div(
                toList([content_class(model, "Flow Map")]),
                toList([element4()])
              ),
              div(
                toList([content_class(model, "Resource Pooling")]),
                toList([element5()])
              )
            ])
          )
        ])
      )
    ])
  );
}
function main() {
  let app = simple(init3, update4, view3);
  let $ = register();
  if (!($ instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "viz",
      14,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $, start: 295, end: 333, pattern_start: 306, pattern_end: 311 }
    );
  }
  let $1 = register2();
  if (!($1 instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "viz",
      15,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $1, start: 336, end: 382, pattern_start: 347, pattern_end: 352 }
    );
  }
  let $2 = start3(app, "body", void 0);
  if (!($2 instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "viz",
      16,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $2, start: 385, end: 434, pattern_start: 396, pattern_end: 401 }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
