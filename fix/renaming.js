const R = require('ramda')
    , { operation, find } = require('./utils')

const updateAuthority = ({path}) => [
  operation('replace')(
    R.append('type', path))('value')('Authority'),
  operation('move')(
    R.append('periods', path))('from')(R.append('definitions', path)),
]

const updatePeriod = ({path}) => [
  operation('replace')(
    R.append('type', path))('value')('Period'),
  operation('move')(
    R.append('authority', path))('from')(R.append('collection', path)),
]

// Object => Array<Operation>
module.exports = o => [

  // Update @context entries
  operation('move')(
    ['$', '@context', 'Authority'])('from')(
    ['$', '@context', 'PeriodCollection']),
  operation('move')(
    ['$', '@context', 'Period'])('from')(
    ['$', '@context', 'PeriodDefinition']),
  operation('move')(
    ['$', '@context', 'authorities'])('from')(
    ['$', '@context', 'periodCollections']),
  operation('move')(
    ['$', '@context', 'periods'])('from')(
    ['$', '@context', 'definitions']),
  operation('move')(
    ['$', '@context', 'authority'])('from')(
    ['$', '@context', 'collection']),

  // Update dataset ID
  operation('replace')(
    ['$', 'id'])('value')('p0d/#authorities'),

  // Update periods
  ...R.chain(updatePeriod)(find('$.periodCollections[*].definitions[*]')(o)),

  // Update authorities
  ...R.chain(updateAuthority)(find('$.periodCollections[*]')(o)),

  // Move /periodCollections -> /authorities
  operation('move')(
    ['$', 'authorities'])('from')(['$', 'periodCollections']),
]
