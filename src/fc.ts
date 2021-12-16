import { Readable, Writable } from "stream";

export type FCRequest = Readable & {
  headers: Record<string, string>;
  path: string;
  queries: Record<string, string>;
  method: string;
  clientIP: string;
  url: string;
};

export type FCResponse = Writable & {
  setStatusCode: (code: number) => void;
  setHeader: (key: string, value: string) => void;
  deleteHeader: (key: string) => void;
  send: (body: Buffer | string | Readable) => void;
};

export type FCContext = any;