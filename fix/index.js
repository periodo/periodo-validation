"use strict";

const R = require('ramda')
    , fs = require('fs')
    , jsonpatch = require('fast-json-patch')
    , parseArgs = require('minimist')
    , request = require('request-promise-native')

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
    `Usage: node fix <proposed change> [ --dataset <url> ] [ --apply ]

Outputs a patch implementing the proposed change.

--dataset or -d specifies the URL of a dataset other than the canonical one.
--apply   or -a applies the patch to the dataset and outputs the result.

<proposed change> should be one of:`
  )
  fs.readdirSync('changes/proposed').forEach(f => console.error(f))
  process.exit(1)
}

const createPatch = require(`./${argv._[0]}`)

let finished = false

function finish(output) {
  console.log(output)
  finished = true
}

function error(e) {
  console.error(e)
  finished = true
}

function waitUntilFinished() {
  if (! finished) {
    setTimeout(waitUntilFinished, 1000)
  }
}

request(argv.dataset + '?inline-context')
  .then(
    data => {
      const doc = JSON.parse(data)
      createPatch(doc)
        .then(
          R.pipe(
            validatePatch,
            R.ifElse(
              () => argv.apply,
              applyPatch(doc),
              R.identity
            ),
            prettify,
            finish
          )
        )
        .catch(error)
    }
  )
  .catch(error)

waitUntilFinished()
