package chunkspan

import (
	"ikosi/prefix"
	"os"
)

// InlineChunkEnvelopeSpace ...
var InlineChunkEnvelopeSpace uint64

// MinimumInlineChunkUsableSpace ...
var MinimumInlineChunkUsableSpace uint64

func init() {
	InlineChunkEnvelopeSpace = prefix.PrefixLen + prefix.SuffixLen
	MinimumInlineChunkUsableSpace = InlineChunkEnvelopeSpace + 20
}

// ReadChunks ...
func ReadChunks(f *os.File, spans []Span) ([]byte, error) {
	acc := make([][]byte, len(spans))
	chunksChannel := make(chan chunkMessage)
	errorsChannel := make(chan error)
	for iVal, sVal := range spans {
		go func(i int, s Span, c chan chunkMessage, e chan error) {
			chunk := make([]byte, s.Length)
			_, err := f.ReadAt(chunk, int64(s.Offset))
			if err != nil {
				e <- err
			} else {
				c <- chunkMessage{
					index: i,
					chunk: chunk,
				}
			}
		}(iVal, sVal, chunksChannel, errorsChannel)
	}
	for i := 0; i < len(spans); i++ {
		select {
		case cm := <-chunksChannel:
			acc[cm.index] = cm.chunk
		case err := <-errorsChannel:
			return nil, err
		}
	}
	var combined []byte
	for _, c := range acc {
		combined = append(combined, c...)
	}
	return combined, nil
}

type chunkMessage struct {
	index int
	chunk []byte
}

// WriteInlineChunk ...
func WriteInlineChunk(f *os.File, offset uint64, chunk []byte, nextOffset uint64) error {
	var content []byte
	suffix := prefix.Suffix(uint64(nextOffset))
	p := prefix.Prefix{
		Length:  uint64(len(chunk) + len(suffix)),
		Type:    prefix.IndexType,
		Section: prefix.EndSection,
	}
	content = append(content, p.Bytes()...)
	content = append(content, chunk...)
	content = append(content, suffix...)
	_, err := f.WriteAt(content, int64(offset))
	return err
}

// WriteEndChunk ...
func WriteEndChunk(f *os.File, offset uint64, chunk []byte) error {
	var content []byte
	p := prefix.Prefix{
		Length:  uint64(len(chunk)),
		Type:    prefix.IndexType,
		Section: prefix.EndSection,
	}
	content = append(content, p.Bytes()...)
	content = append(content, chunk...)
	_, err := f.WriteAt(content, int64(offset))
	return err
}

// AppendChunk ...
func AppendChunk(f *os.File, chunk []byte) error {
	_, err := f.Seek(0, 2)
	if err != nil {
		return err
	}
	var content []byte
	p := prefix.Prefix{
		Length:  uint64(len(chunk)),
		Type:    prefix.IndexType,
		Section: prefix.EndSection,
	}
	content = append(content, p.Bytes()...)
	content = append(content, chunk...)
	_, err = f.Write(content)
	if err != nil {
		return err
	}
	return err
}
