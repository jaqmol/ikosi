package content

import (
	"bytes"
	"encoding/gob"
	"ikosi/chunkspan"
	"ikosi/freespace"
	"ikosi/shared"
	"os"
)

// Index ...
type Index map[string]uint64

// ReadIndex ...
func ReadIndex(filepath string) (Index, error) {
	var idx Index
	indexBytes, err := shared.ReadBytes(filepath, 0)
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

// Write ...
func (idx Index) Write(freeIdx freespace.Index, filepath string) error {
	var buff bytes.Buffer
	enc := gob.NewEncoder(&buff)
	err := enc.Encode(&idx)
	if err != nil {
		return err
	}
	encIdxBytes := buff.Bytes()
	spans, err := idx.findUsableSpans(freeIdx, uint64(len(encIdxBytes)))
	if err != nil {
		return err
	}
	f, err := os.OpenFile(filepath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	isChunked := len(spans) == 1
	for i, span := range spans {
		if isChunked {
			isLastChunk := i == (len(spans) - 1)
			if isLastChunk {
				err = chunkspan.WriteEndChunk(f, span.Offset, encIdxBytes)
				if err != nil {
					return err
				}
			} else {
				usableLen := span.Length - chunkspan.InlineChunkEnvelopeSpace
				chunk := encIdxBytes[:usableLen]
				encIdxBytes = encIdxBytes[usableLen:]
				err = chunkspan.WriteInlineChunk(f, span.Offset, chunk, spans[i+1].Offset)
				if err != nil {
					return err
				}
			}
		} else {
			err = chunkspan.WriteEndChunk(f, span.Offset, encIdxBytes)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
