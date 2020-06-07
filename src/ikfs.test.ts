// tslint:disable:no-expression-statement
import test from 'ava';
import { OpenForReadingFn } from './ikfs';

// TODO: IMPLEMENT

test('Test IKFS OpenForReadingFn', async t => {
  let passedFilepath: string;
  const fsOpen = (filepath: string) => {
    passedFilepath = filepath;
  };
  const openForReading = OpenForReadingFn(fsOpen);
  const fs = await openForReading('test');
  t.is(fs, 11);
  t.is(passedFilepath, 'test');
});

// test('Test IKFS OpenForWritingFn', async t => {

// });

// test('Test IKFS CloseFn', async t => {

// });

// test('Test IKFS StatsFn', async t => {

// });

// test('Test IKFS SizeFn', async t => {

// });

// test('Test IKFS TruncateFn', async t => {

// });

// test('Test IKFS ReadFn', async t => {

// });

// test('Test IKFS WriteFn', async t => {

// });

// test('Test IKFS ChunkFns.span', async t => {

// });

// test('Test IKFS ChunkFns.read', async t => {

// });

// test('Test IKFS ChunkFns.continuation', async t => {

// });

// test('Test IKFS ChunkFns.isSpaceUsable', async t => {

// });

// test('Test IKFS ChunkFns.contentSpan', async t => {

// });

// test('Test IKFS ChunkFns.writeLength', async t => {

// });

// test('Test IKFS ChunkFns.writeContinuation', async t => {

// });

// test('Test IKFS ChunkFns.writeToSpace', async t => {

// });
