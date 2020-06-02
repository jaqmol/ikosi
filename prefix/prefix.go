package prefix

import (
	"bytes"
	"fmt"
	"os"
	"strconv"
)

const lengthPrefixLen = 20
const flagsPrefixLen = 5

// PrefixLen ...
var PrefixLen uint64

func init() {
	PrefixLen = lengthPrefixLen + flagsPrefixLen
}

// TypeFlag ...
type TypeFlag byte

// TypeFlag ...
const (
	IndexType     TypeFlag = 'I'
	FreeSpaceType TypeFlag = 'F'
	ContentType   TypeFlag = 'C'
)

// SectionFlag ...
type SectionFlag byte

// SectionFlags ...
const (
	ChunkSection SectionFlag = 'C'
	EndSection   SectionFlag = 'E'
)

// Prefix ...
type Prefix struct {
	Length  uint64
	Type    TypeFlag
	Section SectionFlag
}

// ReadPrefix ...
func ReadPrefix(filepath string, offsetPosition uint64) (Prefix, error) {
	var p Prefix
	f, err := os.Open(filepath)
	if err != nil {
		return p, err
	}
	return ReadPrefixFromFile(f, offsetPosition)
}

// ReadPrefixFromFile ...
func ReadPrefixFromFile(f *os.File, offsetPosition uint64) (Prefix, error) {
	var p Prefix
	prefixBytes := make([]byte, PrefixLen)
	_, err := f.ReadAt(prefixBytes, int64(offsetPosition))
	if err != nil {
		return p, err
	}
	lengthBytes := prefixBytes[:lengthPrefixLen]
	flagsBytes := prefixBytes[lengthPrefixLen:]
	flagsBytes = bytes.TrimLeft(flagsBytes, ".")
	length, err := strconv.ParseUint(string(lengthBytes), 10, 64)
	if err != nil {
		return p, err
	}
	flags := string(flagsBytes)
	p.Length = length
	p.Type = TypeFlag(flags[0])
	p.Section = SectionFlag(flags[1])
	return p, nil
}

// Bytes ...
func (p Prefix) Bytes() []byte {
	lengthBytes := []byte(fmt.Sprintf("%0*d", lengthPrefixLen, p.Length))
	flagsString := string([]byte{byte(p.Type), byte(p.Section)})
	flagsBytes := []byte(fmt.Sprintf("%.*s", flagsPrefixLen, flagsString))
	b := make([]byte, PrefixLen)
	b = append(b, lengthBytes...)
	b = append(b, flagsBytes...)
	return b
}
