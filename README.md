# Amazon 4×6 Label Normalizer (Python)

A lightweight, backend-ready Python script that converts and normalizes shipping label PDFs (e.g., TikTok FBT, supplier exports) into strict **Amazon AWD-compliant 4×6 inch** PDFs. 

Unlike browser-based tools that rasterize PDFs into blurry images, this script uses **vector-preserving transformations**, ensuring 100% barcode scannability and zero browser memory limits.

---

## 🎯 The Problem

1. **Duplicate Pages**: Platforms like TikTok FBT often output 2 identical pages per carton. Amazon AWD requires exactly **one label per page**.
2. **Incorrect Dimensions**: Manually deleting pages or using generic PDF printers often alters the aspect ratio or page size, leading to Amazon warehouse rejections.
3. **Rasterization Artifacts**: Browser-based converters turn vector barcodes into PNGs, degrading scan reliability at scale.

## ✅ The Solution

- **Duplicate Removal**: Detects the second identical label TikTok FBT emits per carton and drops it, so Amazon AWD receives exactly one label per carton.
- **Vector Preservation**: Scales and centers native PDF vectors (no image conversion).
- **Batch Processing**: Automatically processes entire folders of PDFs sequentially.
- **Aspect Ratio Lock**: Mathematically scales content to fit 4×6 inches without stretching or cropping critical barcode data.
- **Zero UI Dependencies**: Runs headlessly via CLI, perfect for cron jobs, AWS Lambda, or local automation.

---

## 🚀 Quick Start

### 1. Prerequisites
Python 3.9+ or [uv](https://docs.astral.sh/uv/). The setup script auto-detects whichever interpreter is working on your machine.

### 2. Installation
```bash
npm run setup
```
This creates `venv/` and installs the single dependency, `pypdf`.

### 3. Execution
1. Place your source PDFs into the `input_labels` folder.
2. Run:
   ```bash
   npm run resize
   ```
3. Retrieve your Amazon-compliant PDFs from the `output_labels` folder.

### 4. Available Scripts
| Script | Purpose |
| --- | --- |
| `npm run setup` | Create `venv/` and install `pypdf` |
| `npm run resize` (alias `npm start`) | Deduplicate and normalize every PDF in `input_labels` |
| `npm run clean` | Delete the `output_labels` folder |

---

## 📋 Operator SOP

Run this every time you receive a TikTok FBT carton export.

1. **Drop the files** — copy the source PDF(s) into `input_labels/`. Originals are never modified or deleted, so you can always re-run.
2. **Normalize** — run `npm run resize`.
3. **Verify the console output.** Compare pages *kept* against pages *read*. Each FBT carton contributes exactly one label, so a healthy run looks like:

    ```text
    Processing: Carton label.pdf... ✅ Done (12/24 pages kept, 12 duplicate(s) removed)
    ✂️ Duplicates removed: 12 page(s) (24 → 12)
    ```

    - `N/N pages kept` with no duplicates reported means **nothing was detected as duplicated**. Either the file is already clean, or the duplicate pairs are no longer adjacent — inspect the PDF before printing.
    - `❌ Failed` on a file means only that file was skipped; the rest of the batch still processed. Re-export the bad file and re-run.
4. **Spot-check** `output_labels/`. Confirm the page count matches your carton count, then open one label and check the barcode is sharp and no content is cropped.
5. **Print** `output_labels/resized_<original>.pdf`. Never print the originals — they contain the duplicate pages and the non-compliant page size.
6. **Clear the deck** — run `npm run clean` once labels are printed and confirmed, so the next run starts from an empty output folder.

---

## ⚙️ Architecture & Workflow

```text
[Input Folder] 
   ↓ (Reads *.pdf sequentially)
[Duplicate Filter] 
   ↓ (SHA-256 fingerprints each page, keeps the first of each identical pair)
[pypdf Reader] 
   ↓ (Calculates scale factor to fit 288×432 pts)
[Transformation Engine] 
   ↓ (Applies vector scale + center translation)
[pypdf Writer] 
   ↓ (Writes new 4×6 page)
[Output Folder] → `resized_<original_name>.pdf`
```

### Key Specifications
- **Target Dimensions**: 4 × 6 inches (288 × 432 points)
- **Orientation**: Portrait
- **Scaling Logic**: `min(target_width/orig_width, target_height/orig_height)` ensures content fits perfectly within bounds while maintaining exact aspect ratio.
- **Duplicate Handling**: Consecutive byte-identical pages are collapsed into one. Only *adjacent* duplicates are removed, so two distinct cartons that happen to share identical label content are both preserved.

---

## 📈 Scaling to Production (Next Steps)

This script is designed to be a modular building block. To integrate it into your broader e-commerce SaaS or operational workflows:

1. **AWS Lambda Integration**: Wrap the `resize_pdf_to_4x6` function in a Lambda handler. Trigger it via an S3 `ObjectCreated` event to auto-normalize labels the moment they are uploaded.
2. **FastAPI Microservice**: Expose the function via a `/resize` POST endpoint, accepting multipart form data and returning the normalized PDF blob.
3. **Folder Watcher**: Use the `watchdog` library to run this script silently in the background on a warehouse workstation, auto-processing any PDF dropped into a specific directory.

---

## ⚠️ Failure Handling & Edge Cases

- **Malformed PDFs**: The script catches exceptions per-file and continues processing the rest of the batch, logging failures to the console.
- **Extreme Aspect Ratios**: If a source label is wildly non-standard (e.g., a long horizontal banner), the script will "letterbox" it (add white space) to prevent data cropping. 
- **Memory**: Processes pages sequentially. Safe for 100+ page documents without crashing.

---

**Built for operational efficiency.** Replaces manual workarounds with deterministic, scalable code.
