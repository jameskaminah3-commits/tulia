import os
import fitz


PDF_PATH = "attached_assets/Technical-Framework-Engineering-Team_1788943330281.pdf"
OUTPUT_DIR = ".agents/outputs/technical-framework"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    document = fitz.open(PDF_PATH)
    print(f"pages={document.page_count}")
    print(f"metadata={document.metadata}")

    for index, page in enumerate(document, start=1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image_path = os.path.join(OUTPUT_DIR, f"page-{index}.png")
        text_path = os.path.join(OUTPUT_DIR, f"page-{index}.txt")
        pixmap.save(image_path)

        with open(text_path, "w", encoding="utf-8") as text_file:
            text_file.write(page.get_text())

        print(
            f"page={index} image={image_path} size={pixmap.width}x{pixmap.height} "
            f"text_chars={len(page.get_text())}"
        )


if __name__ == "__main__":
    main()