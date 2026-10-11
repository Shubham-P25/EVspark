import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn && dsn.trim().length > 0) {
  Sentry.init({
    dsn: dsn.trim(),
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "development",
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}

export { Sentry };
