# ZenPDF Pro memory packs

ZenPDF Pro works the same for everyone, everywhere. These optional files teach it
about one country or profession. Import one in **Settings › Form memory › Import a memory file**;
each pack gets its own on/off switch, and it is stored only on that device.

| File | Adds |
|---|---|
| `zenpdf-pro-india.json` | PAN, Aadhaar, GSTIN, IFSC, UPI, PIN code and Indian mobile checks · day-first dates · India field names |
| `zenpdf-pro-united-states.json` | SSN, EIN, ZIP and state checks · month-first dates · ZIP → city / county / state list (42,000+ ZIP codes) |
| `zenpdf-pro-us-healthcare.json` | Provider credentialing & payer enrollment — NPI, CAQH, DEA, licences, malpractice, practice locations (180 field types) |

## Make your own

A memory pack is a JSON file. Only `kind`, `id` and `name` are required:

```json
{
  "app": "ZenPDF Pro", "kind": "memory-pack", "format": 1,
  "id": "singapore", "name": "Singapore", "version": "1.0.0",
  "description": "NRIC and Singapore phone checks",
  "region": "INTL",
  "rules": [
    "check! \"NRIC\" format A9999999A : An NRIC is a letter, 7 digits and a letter",
    "check \"Mobile\" digits 8 : Singapore numbers have 8 digits",
    "fill \"Country\" = Singapore"
  ]
}
```

`rules` uses the same language as **My rules** in Settings (open it for examples and a live tester).
A plain `.txt` file of rules can also be imported directly.

Built by H24 Creationz.
