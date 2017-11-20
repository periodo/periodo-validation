"use strict";

const R = require('ramda')
    , { find, operation } = require('./utils')

const fixContext = R.concat(
  [ operation('add')(['$', '@context', 'broader'])('value')(
      {'@id': 'http://www.w3.org/2004/02/skos/core#broader', '@type': '@id'})
  , operation('add')(['$', '@context', 'narrower'])('value')(
      {'@id': 'http://www.w3.org/2004/02/skos/core#narrower', '@type': '@id'})
  ]
)

const addBroaderNarrower = periodLabels => ({path, value}) => {
  const editorialNote = R.propOr('', 'editorialNote', value)
     , match = editorialNote.match(/^Parent period: (.*)$/)
  if (match) {
    for (const label of match[1].split(', ')) {
      const period = periodLabels[label]
      if (period) {
        return [
          operation('add')(R.append('broader', path))('value')(period)
        ]
      }
    }
    console.error(`Could not find parent period of ${R.prop('@id', value)}`)
  }
  return []
}

const indexLabel = index => id => label => R.assoc(label, id, index)

const indexPeriodLabels = R.pipe(
  find('$.periodCollections[*].definitions[*]'),
  R.reduce((index, {value}) => {
    const id = R.prop('id', value)
        , labels = R.concat(
            [ R.prop('label', value) ],
            R.chain(R.identity, R.values(R.prop('localizedLabels', value)))
          )
    labels.forEach(label => { index = indexLabel(index)(id)(label) })
    return index
  }, {})
)

module.exports = periodoData => {

  const periodLabels = indexPeriodLabels(periodoData)

  return R.pipe(
    find('$.periodCollections[*].definitions[*]'),
    R.chain(addBroaderNarrower(periodLabels)),
    fixContext
  )(periodoData)
}
