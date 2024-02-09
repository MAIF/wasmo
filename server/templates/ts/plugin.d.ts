/*
  We must also describe the Wasm interface for our plug-in. 
  We do this with a typescript module DTS file

  DO NOT DELETE THIS FILE
*/
declare module 'main' {
    export function greet(): I32;
}