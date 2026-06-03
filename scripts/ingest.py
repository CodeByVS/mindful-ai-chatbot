"""
MindfulAI — PDF Ingestion Pipeline
===================================
Offline script to parse PDFs, chunk text, and upsert records to Pinecone.
Pinecone handles embedding generation automatically using its integrated
llama-text-embed-v2 model.

Usage:
    1. Place PDF files in the ./data directory.
    2. Create a .env.local (or .env) file with PINECONE_API_KEY.
    3. Run: python scripts/ingest.py

Prerequisites:
    pip install -r scripts/requirements.txt
"""

import os
import sys
import time
import hashlib
from pathlib import Path

from dotenv import load_dotenv
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone

# ─── Load Environment ─────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
_env_local = PROJECT_ROOT / ".env.local"
_env_file = PROJECT_ROOT / ".env"

if _env_local.exists():
    load_dotenv(_env_local)
    print("[OK] Loaded environment from .env.local")
elif _env_file.exists():
    load_dotenv(_env_file)
    print("[OK] Loaded environment from .env")
else:
    load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────────

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "mental-health-chatbot")

DATA_DIR = PROJECT_ROOT / "data"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
UPSERT_BATCH_SIZE = 50


def validate_env() -> None:
    """Validate that all required environment variables are set."""
    if not PINECONE_API_KEY:
        print("[ERROR] Missing PINECONE_API_KEY environment variable.")
        print("        Copy .env.example to .env.local and fill in your values.")
        sys.exit(1)


# ─── PDF Parsing ──────────────────────────────────────────────────────────────

def extract_text_from_pdfs(data_dir: Path) -> list[dict]:
    """Extract text from all PDF files in the data directory."""
    pdf_files = sorted(data_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"[ERROR] No PDF files found in {data_dir}")
        sys.exit(1)

    print(f"[INFO] Found {len(pdf_files)} PDF file(s) in {data_dir}")
    documents = []

    for pdf_path in pdf_files:
        print(f"  -> Reading: {pdf_path.name}")
        try:
            reader = PdfReader(str(pdf_path))
            full_text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"

            if full_text.strip():
                documents.append({
                    "text": full_text.strip(),
                    "source": pdf_path.name,
                    "pages": len(reader.pages),
                })
                print(f"     [OK] {len(reader.pages)} pages, {len(full_text):,} chars")
            else:
                print(f"     [WARN] No extractable text (scanned PDF?)")

        except Exception as e:
            print(f"     [ERROR] {pdf_path.name}: {e}")

    if not documents:
        print("[ERROR] No text could be extracted from any PDF.")
        sys.exit(1)

    return documents


# ─── Text Chunking ────────────────────────────────────────────────────────────

def chunk_documents(documents: list[dict]) -> list[dict]:
    """Split documents into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for doc in documents:
        doc_chunks = splitter.split_text(doc["text"])
        for i, chunk_text in enumerate(doc_chunks):
            chunk_id = hashlib.md5(
                f"{doc['source']}::{i}::{chunk_text[:100]}".encode()
            ).hexdigest()
            chunks.append({
                "id": chunk_id,
                "text": chunk_text,
                "source": doc["source"],
                "chunk_index": i,
            })

    print(f"[INFO] Split into {len(chunks)} chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    return chunks


# ─── Pinecone Upsert ─────────────────────────────────────────────────────────

def init_pinecone_index():
    """Initialize Pinecone client and ensure the index exists."""
    print(f"[INFO] Connecting to Pinecone index '{PINECONE_INDEX_NAME}'...")

    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_indexes = [idx.name for idx in pc.list_indexes()]

    if PINECONE_INDEX_NAME not in existing_indexes:
        print(f"[ERROR] Pinecone index '{PINECONE_INDEX_NAME}' does not exist.")
        print("        Please create the index first in your Pinecone Console.")
        print("        Use the 'llama-text-embed-v2' model with integrated embedding.")
        sys.exit(1)
    else:
        print(f"  -> [OK] Index '{PINECONE_INDEX_NAME}' exists")

    return pc.Index(PINECONE_INDEX_NAME)


def upsert_records_to_pinecone(index, chunks: list[dict]) -> None:
    """Batch-upsert records containing text to Pinecone. Pinecone handles embedding generation."""
    total_batches = (len(chunks) + UPSERT_BATCH_SIZE - 1) // UPSERT_BATCH_SIZE
    print(f"[INFO] Upserting {len(chunks)} records ({total_batches} batches) using Pinecone Integrated Embedding...")

    for i in range(0, len(chunks), UPSERT_BATCH_SIZE):
        batch_chunks = chunks[i : i + UPSERT_BATCH_SIZE]
        batch_num = i // UPSERT_BATCH_SIZE + 1

        records = []
        for chunk in batch_chunks:
            records.append({
                "_id": chunk["id"],
                "text": chunk["text"],
                "source": chunk["source"],
                "chunk_index": chunk["chunk_index"],
            })

        print(f"  -> Batch {batch_num}/{total_batches}...", end=" ")
        try:
            index.upsert_records(namespace="default", records=records)
            print("[OK]")
        except Exception as e:
            print(f"[ERROR] {e}")
            raise

        time.sleep(0.5)


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def main() -> None:
    """Run the complete ingestion pipeline."""
    print("=" * 60)
    print("MindfulAI — PDF Ingestion Pipeline (Integrated Embeddings)")
    print("=" * 60)
    print()

    validate_env()
    start_time = time.time()

    # Step 1: Extract text from PDFs
    documents = extract_text_from_pdfs(DATA_DIR)
    total_chars = sum(len(d["text"]) for d in documents)
    print(f"  -> Total: {len(documents)} documents, {total_chars:,} characters\n")

    # Step 2: Chunk documents
    chunks = chunk_documents(documents)
    print()

    # Step 3: Upsert to Pinecone
    index = init_pinecone_index()
    upsert_records_to_pinecone(index, chunks)
    print()

    # Summary
    elapsed = time.time() - start_time
    print("=" * 60)
    print(f"[DONE] Ingestion complete!")
    print(f"  Documents processed : {len(documents)}")
    print(f"  Chunks created      : {len(chunks)}")
    print(f"  Vectors upserted    : {len(chunks)}")
    print(f"  Total time          : {elapsed:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
