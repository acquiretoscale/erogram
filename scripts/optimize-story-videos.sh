#!/bin/bash
# Batch-optimize videos for Erogram Stories
# Target: MP4 H.264, 720x1280 portrait, no audio, under 1MB, fast-start
#
# Usage:
#   ./scripts/optimize-story-videos.sh /path/to/input/folder /path/to/output/folder
#
# Requirements: ffmpeg installed (brew install ffmpeg)

INPUT_DIR="${1:-.}"
OUTPUT_DIR="${2:-./optimized}"

mkdir -p "$OUTPUT_DIR"

echo "Optimizing videos from: $INPUT_DIR"
echo "Output to: $OUTPUT_DIR"
echo ""

count=0
for f in "$INPUT_DIR"/*.{mp4,mov,webm,avi,mkv} 2>/dev/null; do
  [ -f "$f" ] || continue
  basename=$(basename "$f" | sed 's/\.[^.]*$//').mp4
  out="$OUTPUT_DIR/$basename"

  echo "Processing: $(basename "$f")"

  ffmpeg -y -i "$f" \
    -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black" \
    -c:v libx264 \
    -preset slow \
    -crf 30 \
    -an \
    -movflags +faststart \
    -t 10 \
    -pix_fmt yuv420p \
    "$out" 2>/dev/null

  size=$(stat -f%z "$out" 2>/dev/null || stat --format=%s "$out" 2>/dev/null)
  sizekb=$((size / 1024))
  echo "  → $basename (${sizekb}KB)"

  if [ "$size" -gt 1048576 ]; then
    echo "  ⚠ Over 1MB — re-encoding with higher CRF..."
    ffmpeg -y -i "$f" \
      -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black" \
      -c:v libx264 \
      -preset slow \
      -crf 35 \
      -an \
      -movflags +faststart \
      -t 8 \
      -pix_fmt yuv420p \
      "$out" 2>/dev/null
    size=$(stat -f%z "$out" 2>/dev/null || stat --format=%s "$out" 2>/dev/null)
    sizekb=$((size / 1024))
    echo "  → Re-encoded: ${sizekb}KB"
  fi

  count=$((count + 1))
done

echo ""
echo "Done. $count videos optimized in $OUTPUT_DIR"
echo ""
echo "Upload to R2:"
echo "  npx wrangler r2 object put erogramimages/stories/AI-GF/video.mp4 --file optimized/video.mp4"
