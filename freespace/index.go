package freespace

import (
	"bytes"
	"encoding/gob"
	"ikosi/chunkspan"
	"ikosi/prefix"
	"ikosi/shared"
	"os"
)

const offsetPositionLen = 20

// Index ...
type Index struct {
	spans []chunkspan.Span
}

// ReadIndex ...
func ReadIndex(filepath string) (Index, error) {
	var idx Index
	indexBytes, err := shared.ReadBytes(filepath, offsetPositionLen)
	if err != nil {
		return idx, err
	}
	read := bytes.NewReader(indexBytes)
	dec := gob.NewDecoder(read)
	err = dec.Decode(&idx)
	if err != nil {
		return idx, err
	}
	return idx, nil
}

// Spaces ...
func (idx Index) Spaces(
	spanCb func(span chunkspan.Span) (consumed bool, more bool, err error),
) error {
	var consumedIndexes map[int]bool
	for i, s := range idx.spans {
		consumed, more, err := spanCb(s)
		if err != nil {
			return err
		}
		if consumed {
			consumedIndexes[i] = true
		}
		if !more {
			break
		}
	}
	var newSpans []chunkspan.Span
	for spanIdx, span := range idx.spans {
		_, ok := consumedIndexes[spanIdx]
		if !ok {
			newSpans = append(newSpans, span)
		}
	}
	idx.spans = newSpans
	return nil
}

// WriteTo ...
func (idx Index) WriteTo(filepath string, bytes []byte) (uint64, error) {
	spans, err := idx.findUsableSpans(uint64(len(bytes)))
	if err != nil {
		return 0, err
	}
	f, err := os.OpenFile(filepath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	defer f.Close()
	if err != nil {
		return 0, err
	}
	isChunked := len(spans) == 1
	for i, span := range spans {
		if isChunked {
			isLastChunk := i == (len(spans) - 1)
			fitsInLastChunk := span.Length >= uint64(len(bytes))
			if isLastChunk && fitsInLastChunk {
				err = chunkspan.WriteEndChunk(f, span.Offset, bytes)
				if err != nil {
					return 0, err
				}
			} else {
				usableLen := span.Length - chunkspan.InlineChunkEnvelopeSpace
				chunk := bytes[:usableLen]
				bytes = bytes[usableLen:]
				var nextOffset uint64
				if isLastChunk {
					info, err := f.Stat()
					if err != nil {
						return 0, err
					}
					nextOffset = uint64(info.Size())
				} else {
					nextOffset = spans[i+1].Offset
				}
				err = chunkspan.WriteInlineChunk(f, span.Offset, chunk, nextOffset)
				if err != nil {
					return 0, err
				}
			}
		} else {
			err = chunkspan.WriteEndChunk(f, span.Offset, bytes)
			if err != nil {
				return 0, err
			}
		}
	}
	if len(bytes) > 0 {
		err = chunkspan.AppendChunk(f, bytes)
		if err != nil {
			return 0, err
		}
	}
	return spans[0].Offset, nil
}

func (idx Index) findUsableSpans(bytesLen uint64) ([]chunkspan.Span, error) {
	var bytesIndex uint64 = 0
	var spans []chunkspan.Span
	err := idx.Spaces(func(span chunkspan.Span) (consumed bool, more bool, err error) {
		remainingLen := bytesLen - bytesIndex
		if remainingLen == 0 {
			return false, false, nil
		}
		requiredLen := remainingLen + prefix.PrefixLen
		if span.Length >= requiredLen {
			spans = append(spans, span)
			bytesIndex = bytesLen
			return true, false, nil
		} else if span.Length < chunkspan.MinimumInlineChunkUsableSpace {
			return false, true, nil
		}
		bytesIndex += span.Length - chunkspan.InlineChunkEnvelopeSpace
		spans = append(spans, span)
		return true, true, nil
	})
	if err != nil {
		return nil, err
	}
	return spans, nil
}
