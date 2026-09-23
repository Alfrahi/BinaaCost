import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ 
  onUnhandledRequest: (req, print) => {
    if (req.url.includes("127.0.0.1:8090") || req.url.includes("localhost:8090")) {
      return;
    }
    print.error();
  }
}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
