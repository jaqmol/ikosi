package shared

import (
	"ikosi/chunkspan"
	"ikosi/prefix"
	"os"
	"strconv"
)

const offsetPositionLen = 20

// ReadBytes ...
func ReadBytes(filepath string, offset uint64) ([]byte, error) {
	var content []byte
	f, err := os.Open(filepath)
	defer f.Close()
	if err != nil {
		return content, err
	}
	startOffsetBytes := make([]byte, offsetPositionLen)
	_, err = f.ReadAt(startOffsetBytes, int64(offset))
	if err != nil {
		return content, err
	}
	startOffset, err := strconv.ParseUint(string(startOffsetBytes), 10, 64)
	startPrefix, err := prefix.ReadPrefix(filepath, startOffset)
	if err != nil {
		return content, err
	}
	spans, err := chunkspan.ReadSpans(0, startPrefix, f)
	if err != nil {
		return content, err
	}
	return chunkspan.ReadChunks(f, spans)
}
