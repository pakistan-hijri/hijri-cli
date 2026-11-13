/** Output sinks kept injectable so commands and renderers stay testable. */

export interface Writer {
  out: (text: string) => void;
  err: (text: string) => void;
}

export function createWriter(): Writer {
  return {
    out: (text) => {
      process.stdout.write(text);
    },
    err: (text) => {
      process.stderr.write(text);
    },
  };
}
