"use strict";

const R = require('ramda')
    , concat = require('concat-stream')
    , fs = require('fs')
    , jsonpatch = require('fast-json-patch')
    , parseArgs = require('minimist')
    , request = require('request')

// Buffer => String
const toString = buf => buf.toString('utf8')

// () => Promise
const fetchCanonicalData = new Promise(
  (resolve, reject) => {
    request('http://n2t.net/ark:/99152/p0d.json')
      .on('error', reject)
      .pipe(concat(R.pipe(toString, JSON.parse, resolve)))
  }
)

// JSONPatch => JSONPatch
const validatePatch = patch => {
  const error = jsonpatch.validate(patch)
  if (error) {
    console.error(error)
    throw error
  }
  return patch
}

// Object => JSONPatch => Object
const applyPatch = doc => patch => jsonpatch.applyPatch(doc, patch).newDocument

// Object => String
const prettify = doc => JSON.stringify(doc, null, 2)

const argv = parseArgs(process.argv.slice(2), {boolean: ['a', 'apply']})

if (argv._.length === 0) {
  console.error(
    `Usage: node fix <proposed change> [ --apply ]

Outputs a patch implementing the proposed change.
--apply or -a applies the patch to the current canonical data.

<proposed change> should be one of:`
  )
  fs.readdirSync('changes/proposed').forEach(f => console.error(f))
  process.exit(1)
}

const createPatch = require(`./${argv._[0]}`)

fetchCanonicalData
  .then(doc => {
    R.pipe(
      createPatch,
      validatePatch,
      R.ifElse(
        () => argv.a || argv.apply,
        applyPatch(doc),
        R.identity
      ),
      prettify,
      console.log,
    )(doc)
  })
  .catch(console.error)
