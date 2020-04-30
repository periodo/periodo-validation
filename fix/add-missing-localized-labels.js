"use strict";

const R = require('ramda')
    , { find, operation } = require('./utils')

const fixPeriod = ({path, value}) => {
  if (R.has('localizedLabels', value) && R.has('en', value.localizedLabels)) {
    return []
  }
  if (! R.propEq('languageTag', 'en', value)) {
    return []
  }
  return [
    operation('add')(R.append('localizedLabels', path))('value')({
      en: [ R.prop('label', value) ]
    })
  ]
}

// Object => Promise { Array<Operation> }
module.exports = R.pipe(
  find('$.authorities[*].periods[*]'),
  R.chain(fixPeriod),
  patch => Promise.resolve(patch)
)
