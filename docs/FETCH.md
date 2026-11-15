# Re-fetching full PSI records

`data/raw/det/*.json` holds trimmed copies of the PSI investigation detail records; `docs/DATA.md` lists the fields kept. To get a complete record, including the `added`/`removed` version-diff arrays, fetch it from the PSI web service:

```bash
mkdir -p /tmp/psi-det
for id in 10 20 21 22 23 25 26 39 47 60 62 68 69 98 99 100 101 102 106 107 115 117 142 159; do
  curl -sSf "https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-$id" -o "/tmp/psi-det/PSI-$id.json"
done
```

Fetch into a scratch directory, not straight into `data/raw/det/`. To refresh the vendored copies:

1. Copy the fetched files into `data/raw/det/`.
2. Run `cd pipeline && make trim-raw && make data && make test`.
3. Review the diff before committing.

The experimental tables (`data/raw/et/`) are listed in each record's `experimentalTable[]` on psi.nasa.gov and vendored verbatim. The `remote_url` path itself returns 404; download a file with
`curl -L 'https://psi.nasa.gov/geode-py/ws/studies/PSI-<n>/download?source=datamanager&file=<url-encoded file_name>'` (it redirects to S3). The SAME/SAME-R results workbook is filed under PSI-101 as `PSI-101_Analyzed Data_SAME, SAME-R_Results.xlsx`. The full public listing is `https://psi.nasa.gov/geode-py/ws/repo/search?q=&size=500`.
