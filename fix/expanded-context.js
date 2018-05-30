const { operation } = require('./utils')

module.exports = () => [ operation('add')(['$', '@context'])('value')(
{
  "@base": "http://n2t.net/ark:/99152/",

  "bibo": "http://purl.org/ontology/bibo/",
  "dcelements": "http://purl.org/dc/elements/1.1/",
  "dcterms": "http://purl.org/dc/terms/",
  "foaf": "http://xmlns.com/foaf/0.1/",
  "lexvo": "http://lexvo.org/ontology#",
  "owl": "http://www.w3.org/2002/07/owl#",
  "periodo": "http://n2t.net/ark:/99152/p0v#",
  "prov": "http://www.w3.org/ns/prov#",
  "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "time": "http://www.w3.org/2006/time#",
  "void": "http://rdfs.org/ns/void#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",

  "PeriodCollection": "skos:ConceptScheme",
  "PeriodDefinition": "skos:Concept",

  "abstract": "dcterms:abstract",
  "agent": {"@id": "prov:agent", "@type": "@id"},
  "broader": {"@id": "skos:broader", "@type": "@id"},
  "by": {"@id": "prov:wasAssociatedWith", "@type": "@id"},
  "changes": {"@id": "dcterms:provenance", "@type": "@id"},
  "collection": {"@id": "skos:inScheme", "@type": "@id"},
  "contributors": {"@id": "dcterms:contributor", "@container": "@set"},
  "creator": {"@id": "dcterms:creator", "@type": "@id"},
  "creators": {"@id": "dcterms:creator", "@container": "@set"},
  "dateAccessed": {"@id": "dcterms:date", "@type": "xsd:date"},
  "definitions": {"@reverse": "skos:inScheme", "@container": "@index"},
  "derivedFrom": {"@id": "prov:wasDerivedFrom", "@type": "@id"},
  "earliestYear": {"@id": "periodo:earliestYear", "@type": "xsd:gYear"},
  "editorialNote": "skos:editorialNote",
  "generated": {"@id": "prov:generated", "@type": "@id"},
  "in": "time:hasDateTimeDescription",
  "inDataset": {"@id": "void:inDataset", "@type": "@id"},
  "initialDataLoad": {"@id": "rdf:first", "@type": "@id"},
  "items": {"@container": "@index", "@id": "rdfs:member"},
  "label": "skos:prefLabel",
  "language": {"@id": "dcterms:language", "@type": "@id"},
  "languageTag": "dcelements:language",
  "latestYear": {"@id": "periodo:latestYear", "@type": "xsd:gYear"},
  "localizedLabels": {"@id": "skos:altLabel", "@container": "@language"},
  "locator": "bibo:locator",
  "mergedAt": {"@id": "prov:endedAtTime", "@type": "xsd:dateTime"},
  "mergedPatches": {"@id": "rdf:rest"},
  "name": "foaf:name",
  "narrower": {"@id": "skos:narrower", "@type": "@id"},
  "note": "skos:note",
  "partOf": {"@id": "dcterms:isPartOf", "@type": "@id"},
  "periodCollections": {"@id": "rdfs:member", "@container": "@index"},
  "primaryTopicOf": {"@id": "foaf:isPrimaryTopicOf", "@type": "@id"},
  "role": {"@id": "prov:hadRole", "@type": "@id"},
  "roles": {"@id": "prov:qualifiedAssociation", "@type": "@id"},
  "sameAs": {"@id": "owl:sameAs", "@type": "@id"},
  "script": {"@id": "lexvo:inScript", "@type": "@id"},
  "source": "dcterms:source",
  "spatialCoverage": {"@id": "dcterms:spatial", "@container": "@set"},
  "spatialCoverageDescription": "periodo:spatialCoverageDescription",
  "specializationOf": {"@id": "prov:specializationOf", "@type": "@id"},
  "start": "time:intervalStartedBy",
  "stop": "time:intervalFinishedBy",
  "submittedAt": {"@id": "prov:startedAtTime", "@type": "xsd:dateTime"},
  "title": "dcterms:title",
  "url": {"@id": "foaf:page", "@type": "@id"},
  "used": {"@id": "prov:used", "@type": "@id"},
  "wasRevisionOf": {"@id": "prov:wasRevisionOf", "@type": "@id"},
  "year": {"@id": "time:year", "@type": "xsd:gYear"},
  "yearPublished": {"@id": "dcterms:issued", "@type": "xsd:gYear"},

  "id": "@id",
  "type": "@type",
  "history": "@graph"
}
) ]
