package prefix

import "fmt"

// SuffixLen ...
const SuffixLen = 20

// Suffix ...
func Suffix(offset uint64) []byte {
	return []byte(fmt.Sprintf("%0*d", SuffixLen, offset))
}
