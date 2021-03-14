/* don't remove this line */
if (typeof createSkeinModule === 'undefined') {
  createSkeinModule = Promise.reject(new Error('skein wasm module was not available'));
}

var skein = {
  internal: {
    module: null,
    bytesFromBuffer: function(internalBuffer, bufLen) {
      const resultView = new Uint8Array(this.module.HEAP8.buffer, internalBuffer, bufLen); // view, not a copy
      const result = new Uint8Array(resultView); // copy, not a view!
      return result;
    },

    bufferFromBytes: function(bytes) {
      var internalBuffer = this.create_buffer(bytes.length);
      this.applyBytesToBuffer(bytes, internalBuffer);
      return internalBuffer;
    },
    applyBytesToBuffer: function(bytes, internalBuffer) {
      this.module.HEAP8.set(bytes, internalBuffer);
    },
    toHex: function(bytes) {
      return Array.prototype.map.call(bytes, function(n) {
        return (n < 16 ? '0' : '') + n.toString(16)
      }).join('');
    },
    inputToBytes: function (input) {
      if (input instanceof Uint8Array)
        return input;
      else if (typeof input === 'string')
        return (new TextEncoder()).encode(input);
      else
        throw new Error('Input must be an string, Buffer or Uint8Array');
    }
  },

  /**
   * Checks if JH support is ready (WASM Module loaded)
   * @return {Boolean}
   */
  isReady: function() {
    return skein.internal.module !== null;
  },

  /**
   * Initializes a Hashing Context for Hash
   * @param {Number} digest_size the number of bits for the digest size. Should be positive
   * @return {Object} the context object for this hashing session. Should only be used to hash one data source.
   */
  init: function(digest_size) {
    if (digest_size === undefined || typeof digest_size !== 'number')
      digest_size = 512;

    return {
      'digest_size': digest_size,
      'context': skein.internal.init(digest_size)
    };
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Uint8Array} bytes an array of bytes to hash
   */
  update: function(contextObject, bytes) {
    var inputBuffer = skein.internal.bufferFromBytes(bytes);

    skein.internal.update(contextObject.context, inputBuffer, bytes.length * 8);

    skein.internal.destroy_buffer(inputBuffer);
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Object} value the value to use as bytes to update the hash calculation. Must be String or Uint8Array.
   */
   updateFromValue: function(contextObject, value) {
     skein.update(contextObject, skein.internal.inputToBytes(value));
   },

  /**
   * Finalizes the hashing session and produces digest ("hash") bytes.
   * Size of the returned array is always digest_size/8 bytes long.
   * This method does not clean up the hashing context - be sure to call cleanup(ctx) !
   * @param {Object} contextObject the context object for this hashing session
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  final: function(contextObject) {
    var digestByteLen = contextObject.digest_size / 8;
    var digestBuffer = skein.internal.create_buffer(digestByteLen);

    skein.internal.final(contextObject.context, digestBuffer);

    var digestBytes = skein.internal.bytesFromBuffer(digestBuffer, digestByteLen);
    skein.internal.destroy_buffer(digestBuffer);
    return digestBytes;
  },

  /**
   * Cleans up and releases the Context object for the (now ended) hashing session.
   * @param {Object} contextObject the context object for this hashing session
   */
  cleanup: function(contextObject) {
    skein.internal.cleanup(contextObject.context);
  },

  /**
   * Calculates the skein message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is default.
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  digest: function(input, digest_size) {
    input = skein.internal.inputToBytes(input);

    var ctx = skein.init(digest_size);
    skein.update(ctx, input);
    var bytes = skein.final(ctx);
    skein.cleanup(ctx);

    return bytes;
  },

  /**
   * Calculates the skein message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is the default
   * @return {String} a hexadecimal representation of the digest ("hash") bytes.
   */
  digestHex: function(input, digest_size) {
    var bytes = skein.digest(input, digest_size);
    return skein.internal.toHex(bytes);
  }
};

createSkeinModule().then(async module => {
  // Memory allocations helpers
  skein.internal.create_buffer  = module.cwrap('malloc', 'number', ['number']);
  skein.internal.destroy_buffer = module.cwrap('free',   '',       ['number']);

  skein.internal.init    = module.cwrap('skein_init',    'number', ['number']);
  skein.internal.update  = module.cwrap('skein_update',  '',       ['number','number','number']);
  skein.internal.final   = module.cwrap('skein_final',   '',       ['number','number']);
  skein.internal.cleanup = module.cwrap('skein_cleanup', '',       ['number']);
  skein.internal.module  = module;
});

