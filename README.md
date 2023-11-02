# PeriodO validation

[SHACL](https://www.w3.org/TR/shacl/) data shapes for validating
PeriodO data, and a CLI for running the validation against the
canonical or local development files.

## Usage

Validate the current canonical PeriodO data set
([http://n2t.net/ark:/99152/p0d.json](http://n2t.net/ark:/99152/p0d.json))
against the current published data shapes from the PeriodO vocabulary
([http://n2t.net/ark:/99152/p0v](http://n2t.net/ark:/99152/p0v)):

```sh
./validate
```

Validate a local data set against the current published data shapes
from the PeriodO vocabulary
([http://n2t.net/ark:/99152/p0v](http://n2t.net/ark:/99152/p0v)):

```sh
./validate data.ttl moredata.jsonld
```

Validate the current canonical PeriodO data set
([http://n2t.net/ark:/99152/p0d.json](http://n2t.net/ark:/99152/p0d.json))
against data shape files from a local directory:

```sh
./validate --shapes path/to/shapes_dir
```

Validate a local data set against data shape files from a local directory:

```sh
./validate --shapes path/to/shapes_dir data.ttl moredata.jsonld
```

Validate a remote data set against the current published data shapes
from the PeriodO vocabulary
([http://n2t.net/ark:/99152/p0v](http://n2t.net/ark:/99152/p0v)), but
ignoring the constraints listed in `removed.ttl`:

```sh
curl -s -L 'http://example.org/periodo-data.json' | ./validate - --remove removed.ttl
```

You can get JSON output using the `-json` option and group constraint
violations using [jq](https://stedolan.github.io/jq/) and the
`report.jq` script:

```sh
./validate --json | jq -f report.jq > report.json
```

## Typical workflow

1. Verify that the current dataset is valid with respect to the
   current shapes (in the
   [`periodo-server/shapes`](https://github.com/periodo/periodo-server/tree/master/shapes)
   directory). The following should produce no output:

   ```sh
   ./validate --shapes ../periodo-server/shapes
   ```
  
1. Add and/or remove some constraints to the current set. The
   following should produce a list of violations of the new
   constraints, if there are any:

   ```sh
   ./validate --shapes ../periodo-server/shapes --shapes added.ttl \
       --remove removed.ttl
   ```

1. Modify the dataset so that it no longer violates the new
   constraints. The following will produce no output, if the
   violations have all been resolved in `fixed-dataset.json`:

   ```sh
   cat fixed-dataset.json \
       | ./validate - --shapes ../periodo-server/shapes --shapes added.ttl \
       --remove removed.ttl
   ```

## Bash CLI

[try](try) is a Bash script for managing the canonical PeriodO data
using the workflow described above: ``` Usage: ./try
{new|without-patch|with-patch|accept} <proposed change> ``` `<proposed
change>` should be one of the [proposed changes](changes/proposed).
