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
    let length3 = 0;
    while (current) {
      current = current.tail;
      length3++;
    }
    return length3 - 1;
  }
};
function prepend(element5, tail) {
  return new NonEmpty(element5, tail);
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
  byteAt(index4) {
    if (index4 < 0 || index4 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index4);
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
function bitArrayByteAt(buffer, bitOffset, index4) {
  if (bitOffset === 0) {
    return buffer[index4] ?? 0;
  } else {
    const a2 = buffer[index4] << bitOffset & 255;
    const b = buffer[index4 + 1] >> 8 - bitOffset;
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
    let [keys2, get2] = getters(a2);
    const ka = keys2(a2);
    const kb = keys2(b);
    if (ka.length !== kb.length) return false;
    for (let k of ka) {
      values3.push(get2(a2, k), get2(b, k));
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
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
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

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
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
function append_loop(loop$first, loop$second) {
  while (true) {
    let first = loop$first;
    let second = loop$second;
    if (first instanceof Empty) {
      return second;
    } else {
      let first$1 = first.head;
      let rest$1 = first.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first, second) {
  return append_loop(reverse(first), second);
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
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare4 = loop$compare;
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
      let $ = compare4(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare4;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare4;
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
            let $1 = compare4(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = new Ascending();
            } else if ($1 instanceof Eq) {
              _block$1 = new Ascending();
            } else {
              _block$1 = new Descending();
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare4;
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
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
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
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare4;
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
    let compare4 = loop$compare;
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
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
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
          compare4,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare4;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
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
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
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
          compare4,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare4;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare4 = loop$compare;
    if (sequences2 instanceof Empty) {
      return sequences2;
    } else if (direction instanceof Ascending) {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences2, compare4, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Descending();
        loop$compare = compare4;
      }
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences2, compare4, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Ascending();
        loop$compare = compare4;
      }
    }
  }
}
function sort(list4, compare4) {
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
      let $1 = compare4(x, y);
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
        compare4,
        toList([x]),
        direction,
        y,
        toList([])
      );
      return merge_all(sequences$1, new Ascending(), compare4);
    }
  }
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
function one_of(first, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first.function(dynamic_data);
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
var bool = /* @__PURE__ */ new Decoder(decode_bool);
var int2 = /* @__PURE__ */ new Decoder(decode_int);
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
function lowercase(string5) {
  return string5.toLowerCase();
}
function split(xs, pattern) {
  return List.fromArray(xs.split(pattern));
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
function float_to_string(float2) {
  const string5 = float2.toString().replace("+", "");
  if (string5.indexOf(".") >= 0) {
    return string5;
  } else {
    const index4 = string5.indexOf("e");
    if (index4 >= 0) {
      return string5.slice(0, index4) + ".0" + string5.slice(index4);
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
  #dict(map4) {
    let body = "dict.from_list([";
    let first = true;
    map4.forEach((value2, key) => {
      if (!first) body = body + ", ";
      body = body + "#(" + this.inspect(key) + ", " + this.inspect(value2) + ")";
      first = false;
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
      let element5 = current.head;
      current = current.tail;
      if (list_out !== "[") {
        list_out += ", ";
      }
      list_out += this.inspect(element5);
      if (char_out) {
        if (Number.isInteger(element5) && element5 >= 32 && element5 <= 126) {
          char_out += String.fromCharCode(element5);
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
function list(data, decode2, pushPath, index4, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError("List", classify_dynamic(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }
  const decoded = [];
  for (const element5 of data) {
    const layer = decode2(element5);
    const [out, errors] = layer;
    if (errors instanceof NonEmpty) {
      const [_, errors2] = pushPath(layer, index4.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index4++;
  }
  return [List.fromArray(decoded), emptyList];
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
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
function unwrap(result, default$) {
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
function identity3(x) {
  return x;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
function bool2(input2) {
  return identity3(input2);
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
function compare3(a2, b) {
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
        return compare3(b, a2);
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
function for$(id2) {
  return attribute2("for", id2);
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
function get(map4, key) {
  const value2 = map4?.get(key);
  if (value2 != null) {
    return new Ok(value2);
  } else {
    return new Error(void 0);
  }
}
function has_key2(map4, key) {
  return map4 && map4.has(key);
}
function insert2(map4, key, value2) {
  map4 ??= /* @__PURE__ */ new Map();
  map4.set(key, value2);
  return map4;
}
function remove(map4, key) {
  map4?.delete(key);
  return map4;
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
  constructor(index4, parent) {
    super();
    this.index = index4;
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
function add2(parent, index4, key) {
  if (key === "") {
    return new Index(index4, parent);
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
      let index4 = path2.index;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_element,
        prepend(to_string(index4), acc)
      );
    }
  }
}
function to_string2(path2) {
  return do_to_string(path2, toList([]));
}
function matches(path2, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string2(path2), candidates);
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
  let index4 = a2.length;
  if (index4 !== b.length) {
    return false;
  }
  while (index4--) {
    if (!isEqual2(a2[index4], b[index4])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a2, b) => {
  const properties = Object.keys(a2);
  let index4 = properties.length;
  if (Object.keys(b).length !== index4) {
    return false;
  }
  while (index4--) {
    const property3 = properties[index4];
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
function add_child(events, mapper, parent, index4, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index4, child);
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
function button(attrs, children) {
  return element2("button", attrs, children);
}
function form(attrs, children) {
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
  constructor(index4, removed, changes, children) {
    super();
    this.index = index4;
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
  constructor(kind, index4, with$) {
    super();
    this.kind = kind;
    this.index = index4;
    this.with = with$;
  }
};
var Remove = class extends CustomType {
  constructor(kind, index4) {
    super();
    this.kind = kind;
    this.index = index4;
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
function new$5(index4, removed, changes, children) {
  return new Patch(index4, removed, changes, children);
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
function remove2(index4) {
  return new Remove(remove_kind, index4);
}
var replace_kind = 5;
function replace2(index4, with$) {
  return new Replace(replace_kind, index4, with$);
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
      let $ = compare3(prev, next);
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
            let index4 = node_index - moved_offset;
            let changes$1 = prepend(remove2(index4), changes);
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
var insertMetadataChild = (kind, parent, node, index4, key) => {
  const child = new MetadataNode(kind, parent, node, key);
  node[meta] = child;
  parent?.children.splice(index4, 0, child);
  return child;
};
var getPath = (node) => {
  let path2 = "";
  for (let current = node[meta]; current.parent; current = current.parent) {
    if (current.key) {
      path2 = `${separator_element}${current.key}${path2}`;
    } else {
      const index4 = current.parent.children.indexOf(current);
      path2 = `${separator_element}${index4}${path2}`;
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
  #replace(parent, { index: index4, with: child }) {
    this.#removeChildren(parent, index4 | 0, 1);
    const beforeEl = this.#getReference(parent, index4);
    this.#insertChild(parent.parentNode, beforeEl, parent, index4 | 0, child);
  }
  #getReference(node, index4) {
    index4 = index4 | 0;
    const { children } = node;
    const childCount = children.length;
    if (index4 < childCount) {
      return children[index4].node;
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
  #remove(parent, { index: index4 }) {
    this.#removeChildren(parent, index4, 1);
  }
  #removeChildren(parent, index4, count) {
    const { children, parentNode } = parent;
    const deleted = children.splice(index4, count);
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
  #insertChildren(domParent, beforeEl, metaParent, index4, children) {
    iterate(
      children,
      (child) => this.#insertChild(domParent, beforeEl, metaParent, index4++, child)
    );
  }
  #insertChild(domParent, beforeEl, metaParent, index4, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = this.#createElement(metaParent, index4, vnode);
        this.#insertChildren(node, null, node[meta], 0, vnode.children);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case text_kind: {
        const node = this.#createTextNode(metaParent, index4, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case fragment_kind: {
        const head = this.#createTextNode(metaParent, index4, vnode);
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
        const node = this.#createElement(metaParent, index4, vnode);
        this.#replaceInnerHtml({ node }, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
    }
  }
  #createElement(parent, index4, { kind, key, tag, namespace: namespace2, attributes }) {
    const node = createElementNS(namespace2 || NAMESPACE_HTML, tag);
    insertMetadataChild(kind, parent, node, index4, key);
    if (this.#exposeKeys && key) {
      setAttribute(node, "data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
    return node;
  }
  #createTextNode(parent, index4, { kind, key, content }) {
    const node = createTextNode(content ?? "");
    insertMetadataChild(kind, parent, node, index4, key);
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
  #updateDebounceThrottle(map4, name2, delay) {
    const debounceOrThrottle = map4.get(name2);
    if (delay > 0) {
      if (debounceOrThrottle) {
        debounceOrThrottle.delay = delay;
      } else {
        map4.set(name2, { delay });
      }
    } else if (debounceOrThrottle) {
      const { timeout } = debounceOrThrottle;
      if (timeout) {
        clearTimeout(timeout);
      }
      map4.delete(name2);
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
var virtualiseNode = (meta2, node, key, index4) => {
  if (!canVirtualiseNode(node)) {
    return null;
  }
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const childMeta = insertMetadataChild(element_kind, meta2, node, index4, key);
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
      insertMetadataChild(text_kind, meta2, node, index4, null);
      return text2(node.data);
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2) return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked;
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
  let index4 = 0;
  while (child) {
    const key = child.nodeType === ELEMENT_NODE ? child.getAttribute("data-lustre-key") : null;
    if (key != null) {
      child.removeAttribute("data-lustre-key");
    }
    const vnode = virtualiseNode(meta2, child, key, index4);
    const next = child.nextSibling;
    if (vnode) {
      const list_node = new NonEmpty([key ?? "", vnode], null);
      if (ptr) {
        ptr = ptr.tail = list_node;
      } else {
        ptr = children = list_node;
      }
      index4 += 1;
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
  let index4 = node.attributes.length;
  let attributes = empty_list;
  while (index4-- > 0) {
    const attr = node.attributes[index4];
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
  constructor(root3, [model, effects], view3, update4) {
    this.root = root3;
    this.#model = model;
    this.#view = view3;
    this.#update = update4;
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
      new Promise((resolve, reject) => {
        node.addEventListener("load", resolve);
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
var make_component = ({ init: init3, update: update4, view: view3, config }, name2) => {
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
  const [model, effects] = init3(void 0);
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
        view3,
        update4
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
  let init3 = new Config2(
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
    init3,
    (config, option2) => {
      return option2.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class {
  #runtime;
  constructor(root3, [init3, effects], update4, view3) {
    this.#runtime = new Runtime(root3, [init3, effects], view3, update4);
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
var start = ({ init: init3, update: update4, view: view3 }, selector, flags) => {
  if (!is_browser()) return new Error(new NotABrowser());
  const root3 = selector instanceof HTMLElement ? selector : document2().querySelector(selector);
  if (!root3) return new Error(new ElementNotFound(selector));
  return new Ok(new Spa(root3, init3(flags), update4, view3));
};

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update4, view3, config) {
    super();
    this.init = init3;
    this.update = update4;
    this.view = view3;
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
function application(init3, update4, view3) {
  return new App(init3, update4, view3, new$6(empty_list));
}
function simple(init3, update4, view3) {
  let init$1 = (start_args) => {
    return [init3(start_args), none()];
  };
  let update$1 = (model, msg) => {
    return [update4(model, msg), none()];
  };
  return application(init$1, update$1, view3);
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
function new$7(first, second) {
  return [first, second];
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
function field_value(form2, name2) {
  let _pipe = form2.values;
  let _pipe$1 = key_find(_pipe, name2);
  return unwrap(_pipe$1, "");
}
function run2(form2) {
  let $ = form2.run(form2.values, toList([]));
  let value2;
  let errors;
  value2 = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(value2);
  } else {
    return new Error(new Form(form2.translator, form2.values, errors, form2.run));
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
function add_values(form2, values3) {
  return new Form(
    form2.translator,
    append(values3, form2.values),
    form2.errors,
    form2.run
  );
}
function set_values(form2, values3) {
  return new Form(form2.translator, values3, form2.errors, form2.run);
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
function field_error_messages(form2, name2) {
  let _pipe = form2.errors;
  let _pipe$1 = key_filter(_pipe, name2);
  return flat_map(
    _pipe$1,
    (_capture) => {
      return map(_capture, form2.translator);
    }
  );
}
var parse_string = /* @__PURE__ */ new Parser(string_parser);
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

// build/dev/javascript/viz/components/flow_map.ffi.mjs
var flowMap = {
  svg: null,
  g: null,
  countries: null,
  nodesList: null,
  pathsList: null,
  projection: null,
  tempNode: null,
  initialised: false,
  bundleData: { nodes: [], links: [], paths: [] }
};
var messageDispatch = null;
var pathScales = {
  thickness: d3.scaleLinear().range([0.2, 1.2])
};
var scales = {
  segments: d3.scaleLinear().domain([0, 500]).range([1, 8])
};
var nodeRadius = 1.5;
var arrowOffset = nodeRadius + 1;
function initFlowMap() {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("flow-map")?.shadowRoot;
    const element5 = shadowRoot?.getElementById("flow-map");
    if (element5) {
      createMap();
      flowMap.initialised = true;
    } else if (!element5) {
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
  if (!flowMap.initialised || !flowMap.projection) {
    requestAnimationFrame(() => editNode(nodeId, lat, lon, nodeLabel));
    return null;
  }
  removeTempNode();
  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (existingNode && !existingNode.empty()) {
    existingNode.remove();
  }
  const [x, y] = flowMap.projection([lon, lat]);
  if (!flowMap.nodesList) {
    flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
  }
  const nodeGroup = flowMap.nodesList.append("g").attr("class", "node").attr("id", nodeId).attr("transform", `translate(${x}, ${y})`);
  nodeGroup.append("circle").attr("r", nodeRadius).attr("stroke", "#ffffff").attr("stroke-width", 0.5).attr("fill", "#ef4444").style("cursor", "pointer");
  const labelGroup = nodeGroup.append("g").attr("class", "label-group");
  const labelText = labelGroup.append("text").attr("dy", -6).attr("text-anchor", "middle").style("font-size", "4px").style("font-family", "Arial, sans-serif").style("fill", "#1f2937").style("cursor", "pointer").style("cursor", "move").text(nodeLabel);
  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();
    labelGroup.insert("rect", "text").attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2).attr("fill", "rgba(255, 255, 255, 0)").attr("rx", 2).style("cursor", "move");
  }
  const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
  labelText.call(dragBehavior);
  if (!labelGroup.select("rect").empty()) {
    labelGroup.select("rect").call(dragBehavior);
  }
  nodeGroup.on("mouseover", function() {
    d3.select(this).select("circle").transition().duration(200).attr("r", nodeRadius * 2);
    d3.select(this).select(".label-group").select("rect").transition().duration(200).attr("fill", "rgba(255, 255, 255, 0.5)");
  }).on("mouseout", function() {
    d3.select(this).select("circle").transition().duration(200).attr("r", nodeRadius);
    d3.select(this).select(".label-group").select("rect").transition().duration(200).attr("fill", "rgba(255, 255, 255, 0)");
  }).on("mousedown", function(event4) {
    if (event4.target.tagName === "circle") {
      event4.stopPropagation();
      if (messageDispatch) {
        messageDispatch("node_id:" + nodeId);
      }
    }
  });
  nodeGroup.style("opacity", 0).transition().duration(150).style("opacity", 1);
  return null;
}
function editNode(nodeId, lat, lon, nodeLabel) {
  if (!flowMap.initialised || !flowMap.projection) {
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
  existingNode.transition().duration(150).attr("transform", `translate(${x}, ${y})`);
  const labelGroup = existingNode.select(".label-group");
  const labelText = labelGroup.select("text");
  const currentDx = parseFloat(labelText.attr("dx")) || 0;
  const currentDy = parseFloat(labelText.attr("dy")) || -6;
  labelText.text(nodeLabel).attr("dx", currentDx).attr("dy", currentDy);
  let rectElement = labelGroup.select("rect");
  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();
    if (rectElement.empty()) {
      rectElement = labelGroup.insert("rect", "text").attr("fill", "rgba(255, 255, 255, 0)").attr("rx", 2).style("cursor", "move");
      const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
      rectElement.call(dragBehavior);
    }
    rectElement.attr("x", bbox.x - 1).attr("y", bbox.y - 1).attr("width", bbox.width + 2).attr("height", bbox.height + 2);
  } else {
    if (!rectElement.empty()) {
      rectElement.remove();
    }
  }
  if (nodeLabel && nodeLabel.trim() !== "" && !labelText.node().__on) {
    const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
    labelText.call(dragBehavior);
    if (!rectElement.empty()) {
      rectElement.call(dragBehavior);
    }
  }
  updatePathsForNode(nodeId, lat, lon);
  return null;
}
function deleteNode(nodeId) {
  if (!flowMap.initialised || !flowMap.nodesList) {
    console.warn(`Cannot delete node: map not initialized or no nodes exist`);
    return null;
  }
  const existingNode = flowMap.nodesList.select(`#${nodeId}`);
  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }
  existingNode.transition().duration(150).style("opacity", 0).remove();
  return null;
}
function addPath(pathId, originNodeId, destinationNodeId, value2) {
  if (!flowMap.initialised || !flowMap.projection || !flowMap.nodesList) {
    requestAnimationFrame(
      () => addPath(pathId, originNodeId, destinationNodeId, value2)
    );
    return null;
  }
  removeTempNode();
  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);
  if (originNode.empty() || destinationNode.empty()) {
    console.warn(
      `Cannot create path: nodes ${originNodeId} or ${destinationNodeId} not found`
    );
    return null;
  }
  if (!flowMap.pathsList) {
    flowMap.pathsList = flowMap.g.insert("g", ".nodes").attr("class", "paths");
  }
  const existingPath = flowMap.pathsList.select(`#${pathId}`);
  if (!existingPath.empty()) {
    existingPath.remove();
    removeBundleData(pathId);
  }
  const originTransform = originNode.attr("transform");
  const destinationTransform = destinationNode.attr("transform");
  const originCoords = parseTransform(originTransform);
  const destinationCoords = parseTransform(destinationTransform);
  if (!originCoords || !destinationCoords) {
    console.warn("Could not parse node positions");
    return null;
  }
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
  if (!flowMap.initialised || !flowMap.projection || !flowMap.nodesList) {
    return null;
  }
  removeTempNode();
  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);
  if (originNode.empty() || destinationNode.empty()) {
    console.warn(
      `Cannot edit path: nodes ${originNodeId} or ${destinationNodeId} not found`
    );
    return null;
  }
  const originCoords = parseTransform(originNode.attr("transform"));
  const destinationCoords = parseTransform(destinationNode.attr("transform"));
  const pathIndex = flowMap.bundleData.paths.findIndex((p2) => p2.id === pathId);
  if (pathIndex === -1) {
    console.warn(`Path ${pathId} not found for editing`);
    return null;
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
  regenerateBundling();
  return null;
}
function deletePath(pathId) {
  if (!flowMap.initialised || !flowMap.pathsList) {
    console.warn(`Cannot delete path: map not initialized or no paths exist`);
    return null;
  }
  removeTempNode();
  const existingPath = flowMap.pathsList.select(`#${pathId}`);
  if (!existingPath.empty()) {
    existingPath.transition().duration(150).style("opacity", 0).remove();
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
function createMap() {
  const shadowRoot = document.querySelector("flow-map").shadowRoot;
  const flowMapDiv = shadowRoot.getElementById("flow-map");
  const width = flowMapDiv.clientWidth;
  const height = window.innerHeight * 0.6;
  flowMap.svg = d3.select(shadowRoot.getElementById("flow-map")).append("svg").attr("width", "100%").style("width", width).attr("height", height);
  flowMap.g = flowMap.svg.append("g");
  flowMap.svg.style("cursor", "crosshair");
  const zoom = d3.zoom().scaleExtent([0.1, 200]).on("zoom", (event4) => {
    flowMap.g.attr("transform", event4.transform);
  }).on("end", (event4) => {
    flowMap.g.attr("transform", `${event4.transform} translate(0, 0)`);
    requestAnimationFrame(() => {
      flowMap.g.attr("transform", event4.transform);
    });
  });
  flowMap.svg.call(zoom);
  flowMap.svg.on("click", function(event4) {
    if (event4.target.tagName === "circle" || event4.target.tagName === "text" || event4.target.tagName === "rect") {
      return;
    }
    const [mouseX, mouseY] = d3.pointer(event4, flowMap.g.node());
    if (flowMap.projection) {
      const [lon, lat] = flowMap.projection.invert([mouseX, mouseY]);
      removeTempNode();
      if (!flowMap.nodesList) {
        flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
      }
      flowMap.tempNode = flowMap.nodesList.append("circle").attr("cx", mouseX).attr("cy", mouseY).attr("r", nodeRadius).attr("fill", "#6b7280").attr("stroke", "#ffffff").attr("stroke-width", 0.5).attr("opacity", 0.7);
      if (messageDispatch) {
        messageDispatch(`coords:${lat},${lon}`);
      }
    }
  });
  flowMap.projection = d3.geoNaturalEarth1();
  const path2 = d3.geoPath().projection(flowMap.projection);
  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  ).then((world) => {
    flowMap.countries = topojson.feature(world, world.objects.countries);
    flowMap.projection.fitSize([width, height], flowMap.countries);
    flowMap.g.selectAll("path").data(flowMap.countries.features).enter().append("path").attr("d", path2).attr("fill", "#9ca3af").attr("stroke", "#f3f4f6").attr("stroke-width", 0.25);
  });
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
function removeBundleData(pathId) {
  const pathIndex = flowMap.bundleData.paths.findIndex((p2) => p2.id === pathId);
  if (pathIndex !== -1) {
    const pathToRemove = flowMap.bundleData.paths[pathIndex];
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
    flowMap.bundleData.links = flowMap.bundleData.links.filter(
      (link) => !pathToRemove.segments.includes(link.source) && !pathToRemove.segments.includes(link.target)
    );
    flowMap.bundleData.paths.splice(pathIndex, 1);
  }
}
function generateSegments(pathData) {
  const length3 = distance(pathData.source, pathData.target);
  const total = Math.round(scales.segments(length3));
  const xscale = d3.scaleLinear().domain([0, total + 1]).range([pathData.source.x, pathData.target.x]);
  const yscale = d3.scaleLinear().domain([0, total + 1]).range([pathData.source.y, pathData.target.y]);
  let source = pathData.source;
  let target = null;
  const local = [source];
  const nodes = [];
  const links = [];
  for (let j = 1; j <= total; j++) {
    target = {
      x: xscale(j),
      y: yscale(j),
      generated: true
      // Mark as generated node
    };
    local.push(target);
    nodes.push(target);
    links.push({
      source,
      target
    });
    source = target;
  }
  local.push(pathData.target);
  links.push({
    source: target,
    target: pathData.target
  });
  return { local, nodes, links };
}
function regenerateBundling() {
  if (flowMap.bundleData.paths.length === 0) {
    if (flowMap.forceLayout) {
      flowMap.forceLayout.stop();
    }
    return;
  }
  const totalSum = flowMap.bundleData.paths.reduce(
    (sum, path2) => sum + path2.value,
    0
  );
  pathScales.thickness.domain([0, totalSum]);
  const line = d3.line().curve(d3.curveBundle.beta(0.85)).x((d) => d.x).y((d) => d.y);
  flowMap.pathsList.selectAll("path.flow").remove();
  flowMap.pathsList.selectAll("path.flow-hover").remove();
  const hoverAreas = flowMap.pathsList.selectAll("path.flow-hover").data(flowMap.bundleData.paths).enter().append("path").attr("d", (d) => line(d.segments)).attr("class", "flow-hover").attr("fill", "none").attr("stroke", "transparent").attr("stroke-width", 2.5).style("cursor", "pointer").on("mouseover", function(event4, d) {
    flowMap.pathsList.select(`path.flow#${d.id}`).transition().duration(200).attr("stroke-width", pathScales.thickness(d.value) + 1);
  }).on("mouseout", function(event4, d) {
    flowMap.pathsList.select(`path.flow#${d.id}`).transition().duration(200).attr("stroke-width", pathScales.thickness(d.value));
  }).on("click", function(event4, d) {
    event4.stopPropagation();
    removeTempNode();
    if (messageDispatch) {
      messageDispatch("path_id:" + d.id);
    }
  });
  const links = flowMap.pathsList.selectAll("path.flow").data(flowMap.bundleData.paths).enter().append("path").attr("d", (d) => line(d.segments)).attr("class", "flow").attr("id", (d) => d.id).attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", (d) => pathScales.thickness(d.value)).style("pointer-events", "none");
  if (flowMap.forceLayout) {
    flowMap.forceLayout.stop();
  }
  flowMap.forceLayout = d3.forceSimulation().alphaDecay(0.1).randomSource(d3.randomLcg(42)).force("charge", d3.forceManyBody().strength(0.5).distanceMax(50)).force("link", d3.forceLink().strength(0.5).distance(1)).on("tick", function() {
    links.attr("d", (d) => line(d.segments));
    hoverAreas.attr("d", (d) => line(d.segments));
  }).on("end", function() {
  });
  flowMap.forceLayout.nodes(flowMap.bundleData.nodes).force("link").links(flowMap.bundleData.links);
  const pathLength = links.nodes().map((node) => node.getTotalLength());
  links.attr("stroke-dasharray", (d, i) => pathLength[i] + " " + pathLength[i]).attr("stroke-dashoffset", (d, i) => pathLength[i]).transition().duration(300).attr("stroke-dashoffset", 0).on("end", function() {
    d3.select(this).attr("stroke-dasharray", "none");
  });
}
function updatePathsForNode(nodeId, lat, lon) {
  const connectedPaths = flowMap.bundleData.paths.filter(
    (path2) => path2.source.id === nodeId || path2.target.id === nodeId
  );
  if (connectedPaths.length === 0) {
    return;
  }
  const [x, y] = flowMap.projection([lon, lat]);
  const newCoords = { x, y };
  connectedPaths.forEach((pathData) => {
    const pathIndex = flowMap.bundleData.paths.findIndex(
      (p2) => p2.id === pathData.id
    );
    if (pathIndex !== -1) {
      const pathToRemove = flowMap.bundleData.paths[pathIndex];
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
      flowMap.bundleData.links = flowMap.bundleData.links.filter(
        (link) => !pathToRemove.segments.includes(link.source) && !pathToRemove.segments.includes(link.target)
      );
    }
    if (pathData.source.id === nodeId) {
      pathData.source = { ...newCoords, id: nodeId, fx: x, fy: y };
    }
    if (pathData.target.id === nodeId) {
      pathData.target = { ...newCoords, id: nodeId, fx: x, fy: y };
    }
    const segments = generateSegments({
      id: pathData.id,
      source: pathData.source,
      target: pathData.target
    });
    pathData.segments = segments.local;
    flowMap.bundleData.nodes.push(...segments.nodes);
    flowMap.bundleData.links.push(...segments.links);
  });
  regenerateBundling();
}
function createLabelDragBehavior(nodeId) {
  const drag = d3.drag().on("start", function(event4) {
    event4.sourceEvent.stopPropagation();
    d3.select(this.parentNode).select("rect").transition().duration(100).attr("fill", "rgba(255, 255, 255, 0.8)");
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
    d3.select(this.parentNode).select("rect").transition().duration(100).attr("fill", "rgba(255, 255, 255, 0)");
    const textElement = d3.select(this);
    const dx = parseFloat(textElement.attr("dx")) || 0;
    const dy = parseFloat(textElement.attr("dy")) || -6;
    if (messageDispatch) {
      messageDispatch(`label_moved:${nodeId}:${dx}:${dy}`);
    }
  });
  return drag;
}
function parseTransform(transform) {
  if (!transform) return null;
  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2])
    };
  }
  return null;
}
function distance(source, target) {
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);
  return Math.sqrt(dx2 + dy2);
}

// build/dev/javascript/viz/components/utils.ffi.mjs
function focusRootById(root3, element_id) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector(root3)?.shadowRoot;
    const element5 = shadowRoot?.getElementById(element_id);
    if (element5) {
      element5.focus();
    } else if (!element5) {
      focusRootById(root3, element_id);
    }
  });
  return null;
}

// build/dev/javascript/viz/components/flow_map.mjs
var Model = class extends CustomType {
  constructor(form2, current_form, actions, next_node_id, next_path_id, nodes, paths, selected_coords) {
    super();
    this.form = form2;
    this.current_form = current_form;
    this.actions = actions;
    this.next_node_id = next_node_id;
    this.next_path_id = next_path_id;
    this.nodes = nodes;
    this.paths = paths;
    this.selected_coords = selected_coords;
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
function inspect3(thing) {
  let _pipe = inspect2(thing);
  return console_log(_pipe);
}
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
    new None()
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
        new None()
      );
      return new Ok(updated_model);
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
    model.selected_coords
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
        new None()
      );
      return new Ok(updated_model);
    }
  );
}
function empty_form() {
  let _pipe = success2(new EmptyForm());
  return new$8(_pipe);
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
    model.selected_coords
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
function render_input_field(form2, name2, label2) {
  let errors = field_error_messages(form2, name2);
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
            value(field_value(form2, name2))
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
          "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
        ),
        on_click(new Undo())
      ]),
      toList([text2("Undo")])
    );
  }
}
function render_node_select_field(form2, name2, label2, nodes) {
  let errors = field_error_messages(form2, name2);
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
                selected(field_value(form2, name2) === "")
              ]),
              "Select a node..."
            ),
            map(
              nodes,
              (node) => {
                let is_selected = field_value(form2, name2) === node.node_id;
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
function render_node_form(form2, current_form) {
  let handle_submit = (values3) => {
    let _pipe = form2;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new NodeFormSubmit(_pipe$2);
  };
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form(
        toList([on_submit(handle_submit)]),
        toList([
          render_input_field(form2, "lat", "Latitude"),
          render_input_field(form2, "lon", "Longitude"),
          render_input_field(form2, "node_label", "Label"),
          render_submit_button(current_form)
        ])
      )
    ])
  );
}
function render_path_form(form2, nodes, current_form) {
  let handle_submit = (values3) => {
    let _pipe = form2;
    let _pipe$1 = add_values(_pipe, values3);
    let _pipe$2 = run2(_pipe$1);
    return new PathFormSubmit(_pipe$2);
  };
  let nodes$1 = reverse(nodes);
  return div(
    toList([class$("flex-1 py-2")]),
    toList([
      form(
        toList([on_submit(handle_submit)]),
        toList([
          render_node_select_field(form2, "origin_node_id", "Origin", nodes$1),
          render_node_select_field(
            form2,
            "destination_node_id",
            "Destination",
            nodes$1
          ),
          render_input_field(form2, "value", "Value"),
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
function render_controls(model) {
  return div(
    toList([
      class$(
        "flex-1 bg-gray-700 text-gray-200 p-4 rounded-lg transition-all duration-300 ease-in-out"
      )
    ]),
    toList([
      button(
        toList([
          class$(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer"
          ),
          on_click(new StartNodeForm(""))
        ]),
        toList([text2("Add Node")])
      ),
      button(
        toList([
          class$(
            "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2"
          ),
          on_click(new StartPathForm(""))
        ]),
        toList([text2("Add Path")])
      ),
      render_undo(model),
      div(
        toList([
          class$("transition-all duration-300 ease-in-out"),
          (() => {
            let $ = model.current_form;
            if ($ instanceof NoForm) {
              return class$("max-h-0 opacity-0");
            } else {
              return class$("max-h-96 opacity-100");
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
        } else {
          return void 0;
        }
      };
      setDispatch(dispatch_wrapper);
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
            toList([new Modifier(), new Key2("a")]),
            new StartNodeForm(""),
            toList([new PreventDefault()])
          ),
          new Shortcut(
            toList([new Modifier(), new Key2("p")]),
            new StartPathForm(""),
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
  return [
    new Model(
      empty_form(),
      new NoForm(),
      toList([]),
      1,
      1,
      toList([]),
      toList([]),
      new None()
    ),
    init_effect
  ];
}
function update2(model, message) {
  inspect3(message);
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
      new Some([lat, lon])
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
        updated_model.selected_coords
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
        updated_model.selected_coords
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
          model.selected_coords
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
          model.selected_coords
        ),
        none()
      ];
    } else {
      return [
        model,
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
          updated_model.selected_coords
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
          model.selected_coords
        );
        return [updated_model, none()];
      }
    } else {
      let node_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_node_by_id(_pipe, node_id);
      _block = unwrap(_pipe$1, new Node("default", 0, 0, ""));
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
          model.selected_coords
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
              return [updated_model, none()];
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
      let form2 = $[0];
      let updated_model = new Model(
        form2,
        model.current_form,
        model.actions,
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        model.paths,
        model.selected_coords
      );
      return [updated_model, none()];
    }
  } else if (message instanceof StartPathForm) {
    let $ = message.path_id;
    if ($ === "") {
      let updated_model = new Model(
        new_path_form(),
        new NewPathForm(),
        model.actions,
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        model.paths,
        model.selected_coords
      );
      return [updated_model, none()];
    } else {
      let path_id = $;
      let _block;
      let _pipe = model;
      let _pipe$1 = get_path_by_id(_pipe, path_id);
      _block = unwrap(_pipe$1, new Path("default", "", "", 0));
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
          model.selected_coords
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
      let form2 = $[0];
      let updated_model = new Model(
        form2,
        model.current_form,
        model.actions,
        model.next_node_id,
        model.next_path_id,
        model.nodes,
        model.paths,
        model.selected_coords
      );
      return [updated_model, none()];
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
        model.selected_coords
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
        model.selected_coords
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
          model.selected_coords
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
          (n) => {
            let $2 = n.node_id === original.node_id;
            if ($2) {
              return original;
            } else {
              return n;
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
          model.selected_coords
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
          model.selected_coords
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
          model.selected_coords
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
          model.selected_coords
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
      } else {
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
          model.selected_coords
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
      }
    }
  } else {
    let updated_model = reset_form(model);
    removeTempNode();
    return [updated_model, none()];
  }
}
function register() {
  let component = application(init, update2, view);
  return make_component(component, "flow-map");
}

// build/dev/javascript/viz/viz.mjs
var FILEPATH = "src/viz.gleam";
var Model2 = class extends CustomType {
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
function init2(_) {
  return new Model2("Flow Map", true);
}
function update3(model, message) {
  if (message instanceof FlowMap) {
    return new Model2("Flow Map", model.show_menu);
  } else if (message instanceof ResourcePooling) {
    return new Model2("Resource Pooling", model.show_menu);
  } else {
    return new Model2(model.page, !model.show_menu);
  }
}
function nav_class(model) {
  let base_class = "bg-gray-900 text-gray-200 flex flex-col py-12 transition-all duration-300 ease-in-out";
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
function render_content(model) {
  let $ = model.page;
  if ($ === "Flow Map") {
    return element4();
  } else if ($ === "Resource Pooling") {
    return text2("Resource Pooling component here");
  } else {
    return div(toList([]), toList([text2("Unknown component")]));
  }
}
function view2(model) {
  return div(
    toList([class$("h-screen flex bg-gray-200")]),
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
        toList([class$("flex flex-col p-12 flex-1 min-w-0")]),
        toList([
          h1(
            toList([class$("text-4xl font-extrabold")]),
            toList([text2(model.page)])
          ),
          div(
            toList([class$("flex-1 w-full py-4")]),
            toList([render_content(model)])
          )
        ])
      )
    ])
  );
}
function main() {
  let app = simple(init2, update3, view2);
  let $ = register();
  if (!($ instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "viz",
      13,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $, start: 260, end: 298, pattern_start: 271, pattern_end: 276 }
    );
  }
  let $1 = start3(app, "body", void 0);
  if (!($1 instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "viz",
      14,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $1, start: 301, end: 350, pattern_start: 312, pattern_end: 317 }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
