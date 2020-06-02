package chunkspan

import (
	"ikosi/prefix"
	"os"
	"strconv"
)

const offsetPositionLen = 20

// Span ...
type Span struct {
	Offset uint64
	Length uint64
}

// NewSpan ...
func NewSpan(offset uint64, p prefix.Prefix) Span {
	s := Span{Offset: offset}
	if p.Section == prefix.ChunkSection {
		s.Length = p.Length - offsetPositionLen
	} else if p.Section == prefix.EndSection {
		s.Length = p.Length
	}
	return s
}

// ReadSpans ...
func ReadSpans(startOffset uint64, startPrefix prefix.Prefix, f *os.File) ([]Span, error) {
	var offset uint64 = startOffset
	var lastPrefix prefix.Prefix = startPrefix
	spans := make([]Span, 0)
	spans = append(spans, NewSpan(startOffset, startPrefix))
	for {
		if lastPrefix.Section == prefix.ChunkSection {
			location := (offset + lastPrefix.Length) - offsetPositionLen
			nextOffsetBytes := make([]byte, offsetPositionLen)
			_, err := f.ReadAt(nextOffsetBytes, int64(location))
			if err != nil {
				return nil, err
			}
			nextOffset, err := strconv.ParseUint(string(nextOffsetBytes), 10, 64)
			nextPrefix, err := prefix.ReadPrefixFromFile(f, nextOffset)
			if err != nil {
				return nil, err
			}
			spans = append(spans, NewSpan(nextOffset, nextPrefix))
			lastPrefix = nextPrefix
			offset = nextOffset
		} else if lastPrefix.Section == prefix.EndSection {
			break
		}
	}
	return spans, nil
}
