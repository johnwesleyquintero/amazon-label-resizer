import hashlib
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter, Transformation

# Ensure console output works regardless of the host code page (e.g. cp1252 on Windows)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Configuration
TARGET_WIDTH = 4 * 72   # 288 points (4 inches)
TARGET_HEIGHT = 6 * 72  # 432 points (6 inches)

# Resolve folders relative to this script so it works from any working directory
BASE_DIR = Path(__file__).resolve().parent
INPUT_FOLDER = BASE_DIR / "input_labels"
OUTPUT_FOLDER = BASE_DIR / "output_labels"

def page_signature(page) -> str:
    """Fingerprint of a page's content, used to detect duplicate labels."""
    contents = page.get_contents()
    data = contents.get_data() if contents is not None else b""
    box = page.mediabox
    return hashlib.sha256(f"{box.width}x{box.height}".encode() + data).hexdigest()

def resize_pdf_to_4x6(input_path: str, output_path: str):
    """
    Resizes all pages in a PDF to 4x6 inches, maintaining aspect ratio 
    and centering the content to prevent barcode distortion.

    Consecutive duplicate pages are dropped, since TikTok FBT emits two
    identical labels per carton while Amazon AWD accepts only one.

    Returns (pages_written, pages_read), or None if the file could not be processed.
    """
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()

        # Fingerprint every page up front: transforming a page mutates its
        # content stream, and TikTok FBT pairs share the same stream object.
        signatures = [page_signature(page) for page in reader.pages]

        previous_signature = None
        for page, signature in zip(reader.pages, signatures):
            if signature == previous_signature:
                continue
            previous_signature = signature

            orig_width = float(page.mediabox.width)
            orig_height = float(page.mediabox.height)
            
            # Calculate scale factor to fit within 4x6 while maintaining aspect ratio
            scale = min(TARGET_WIDTH / orig_width, TARGET_HEIGHT / orig_height)
            
            # Create new 4x6 page
            new_page = writer.add_blank_page(width=TARGET_WIDTH, height=TARGET_HEIGHT)
            
            # Calculate centering offsets
            scaled_width = orig_width * scale
            scaled_height = orig_height * scale
            offset_x = (TARGET_WIDTH - scaled_width) / 2
            offset_y = (TARGET_HEIGHT - scaled_height) / 2
            
            # Apply transformation: scale and translate to center
            page.add_transformation(
                Transformation().scale(sx=scale, sy=scale).translate(tx=offset_x, ty=offset_y)
            )
            
            # Merge transformed content onto the new page
            new_page.merge_page(page)

        # Write output
        with open(output_path, "wb") as f:
            writer.write(f)

        return len(writer.pages), len(reader.pages)
    except Exception as e:
        print(f"❌ Failed to process {input_path}: {e}")
        return None

def process_folder(input_dir: str, output_dir: str):
    """Batch processes all PDFs in a directory."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    pdf_files = list(input_path.glob("*.pdf"))
    if not pdf_files:
        print("⚠️ No PDF files found in the input directory.")
        return

    print(f"🔄 Processing {len(pdf_files)} PDF(s)...\n")
    
    success_count = 0
    pages_read = 0
    pages_written = 0
    for pdf_file in pdf_files:
        out_file = output_path / f"resized_{pdf_file.name}"
        print(f"Processing: {pdf_file.name}...", end=" ")
        
        result = resize_pdf_to_4x6(str(pdf_file), str(out_file))
        if result is None:
            print("❌ Failed")
            continue

        written, read = result
        pages_read += read
        pages_written += written
        duplicates = read - written
        detail = f", {duplicates} duplicate(s) removed" if duplicates else ""
        print(f"✅ Done ({written}/{read} pages kept{detail})")
        success_count += 1

    print(f"\n🎉 Complete: {success_count}/{len(pdf_files)} files successfully resized.")
    if pages_read != pages_written:
        print(f"✂️ Duplicates removed: {pages_read - pages_written} page(s) ({pages_read} → {pages_written})")
    print(f"📁 Output saved to: {output_path.absolute()}")

if __name__ == "__main__":
    # Create input folder if it doesn't exist for the user to drop files in
    INPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    process_folder(INPUT_FOLDER, OUTPUT_FOLDER)