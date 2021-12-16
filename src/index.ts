import * as Koa from "koa";
import * as http from "http";

import { FCContext, FCRequest, FCResponse } from "./fc";

import { normalize } from "path";
import rawBody from "raw-body";
import { tmpdir } from "os";

export const getSocketPath = () => {
  return normalize(`${tmpdir()}/fc2koa-server.sock`);
};

export const startHttpServer = (server: http.Server) => {
  if (server.listening) return;
  return new Promise<void>((resolve => {
    const socketPath = getSocketPath();
    server.listen(socketPath, () => resolve());
  }));
};

export const forwardResponse = (fcRes: FCResponse, res: http.IncomingMessage) => {
  return new Promise((resolve, reject) => {
    const buffer: any[] = [];
    res.on("error", (err) => reject(err));
    res.on("data", chunk => buffer.push(chunk));
    res.on("end", () => {
      fcRes.setStatusCode(res.statusCode);
      Object.entries(res.headers).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        fcRes.setHeader(key, values.join(","));
      });
      const body = Buffer.concat(buffer);
      fcRes.send(body);
      resolve(body);
    });
  });
};

export const forwardRequest = (fcReq: FCRequest, req: http.ClientRequest) => {
  return new Promise((resolve, reject) => {
    rawBody(fcReq, (err: any, body: Buffer) => {
      if (err) return reject(err);
      req.on("error", (err) => reject(err));
      req.on("finish", () => resolve(body));
      req.write(body);
      req.end();
    });
  });
};

export const createRequestOptions = (fcReq: FCRequest): http.RequestOptions => {
  return {
    headers: { ...fcReq.headers },
    method: fcReq.method,
    path: fcReq.path,
    socketPath: getSocketPath(),
  };
};

export const requestHttpServer = (
  fcReq: FCRequest,
  fcRes: FCResponse,
  onRequest?: (req: http.ClientRequest) => void
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const options = createRequestOptions(fcReq);
      const req = http.request(options, async (res) => {
        try {
          await forwardResponse(fcRes, res);
          resolve({ req, res });
        } catch (err) {
          reject(err);
        }
      });
      await forwardRequest(fcReq, req);
      if (onRequest) onRequest(req);
    } catch (err) {
      reject(err);
    }
  });
};

export type FC2KoaOptions = {
  onCreateServer?: (server?: http.Server) => void;
  onStartServer?: (server?: http.Server) => void;
  onRequest?: (req?: http.ClientRequest) => void;
  onAfterRequest?: (fcReq?: FCRequest, fcRes?: FCResponse, fcCtx?: FCContext) => void;
  onBeforeRequest?: (fcReq?: FCRequest, fcRes?: FCResponse, fcCtx?: FCContext) => void;
  onError?: (err?: Error, fcReq?: FCRequest, fcRes?: FCResponse, fcCtx?: FCContext) => void;
}

export const fc2koa = (app: Koa, options?: FC2KoaOptions) => {
  options = { ...options };
  const { onCreateServer, onStartServer, onError } = options;
  const { onAfterRequest, onBeforeRequest, onRequest } = options;
  const server = http.createServer(app.callback());
  if (onCreateServer) onCreateServer(server);
  return async (fcReq: FCRequest, fcRes: FCResponse, fcCtx: FCContext) => {
    try {
      await startHttpServer(server);
      if (onStartServer) onStartServer(server);
      if (onBeforeRequest) onBeforeRequest(fcReq, fcRes, fcCtx);
      await requestHttpServer(fcReq, fcRes, onRequest);
      if (onAfterRequest) onAfterRequest(fcReq, fcRes, fcCtx);
    } catch (err) {
      if (onError) onError(err, fcReq, fcRes, fcCtx);
      fcRes.send(JSON.stringify(err));
    }
  };
};