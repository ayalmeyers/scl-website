#!/usr/bin/env bash
# Normalize a headshot photo for the team roster: re-encode to a
# consistent format/quality/color space, strip embedded metadata
# (EXIF/ICC/XMP — camera/location data has no business shipping to
# site visitors), auto-correct orientation, and cap the longest edge
# so no source photo is larger than the site will ever display it at.
#
# Usage: scripts/normalize-headshot.sh <input> [output]
#   output defaults to overwriting <input> in place.
#
# Requires ImageMagick's `convert`.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <input> [output]" >&2
  exit 1
fi

IN="$1"
OUT="${2:-$1}"
# Longest edge any headshot is ever displayed at on this site is the
# bio dialog photo: width: min(92vw, 640px) at a 4:3 aspect ratio, so
# 640px wide max. Cap at 2x that for retina without exceeding it —
# larger source photos gain nothing but file weight.
MAX_EDGE=1280

TMP="$(mktemp --suffix=.jpg)"
trap 'rm -f "$TMP"' EXIT

convert "$IN" \
  -auto-orient \
  -resize "${MAX_EDGE}x${MAX_EDGE}>" \
  -colorspace sRGB \
  -strip \
  -quality 85 \
  -sampling-factor 4:2:0 \
  -interlace none \
  "$TMP"

mv "$TMP" "$OUT"
trap - EXIT
identify -format "%f: %wx%h, %b\n" "$OUT"
