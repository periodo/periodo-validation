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
const fetchData = url => new Promise(
  (resolve, reject) => {
    request(url)
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

const argv = parseArgs(
  process.argv.slice(2),
  {boolean: 'apply',
   string: 'dataset',
   default: {dataset: 'http://n2t.net/ark:/99152/p0d.json'},
   alias: {a: 'apply', d: 'dataset'}
  }
)

if (argv._.length === 0) {
  console.error(
    `Usage: node fix <proposed change> [ --apply ] [ --dataset <url> ]

Outputs a patch implementing the proposed change.

--apply   or -a applies the patch to the current canonical data.
--dataset or -d specifies the URL of a dataset other than the canonical one.

<proposed change> should be one of:`
  )
  fs.readdirSync('changes/proposed').forEach(f => console.error(f))
  process.exit(1)
}

const createPatch = require(`./${argv._[0]}`)

fetchData(argv.dataset + '?inline-context')
  .then(doc => {
    R.pipe(
      createPatch,
      validatePatch,
      R.ifElse(
        () => argv.apply,
        applyPatch(doc),
        R.identity
      ),
      prettify,
      console.log,
    )(doc)
  })
  .catch(console.error)
