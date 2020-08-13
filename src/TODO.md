## Consider changing number formats to native little endian

```javascript
 test('Compact (8 byte) uint8 storage', () => {
    const maxUint64 = 2n ** 64n - 1n;
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, 18446744073709551615, true);
});
```