const client = require("prom-client");

// Prometheus Metrics Registry
const register = new client.Registry();

// Default Node.js metrics (CPU, Memory, Event Loop delay)
client.collectDefaultMetrics({ register });

// Custom Application Metrics
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests received",
  labelNames: ["method", "route", "status_code"],
});

const redirectRequestsTotal = new client.Counter({
  name: "url_redirects_total",
  help: "Total number of short code redirects executed",
  labelNames: ["status", "cache_hit"],
});

const linksCreatedTotal = new client.Counter({
  name: "urls_created_total",
  help: "Total number of shortened links generated",
  labelNames: ["source"], // 'web', 'api', 'bulk'
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency histogram in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(redirectRequestsTotal);
register.registerMetric(linksCreatedTotal);
register.registerMetric(httpRequestDurationSeconds);

module.exports = {
  register,
  httpRequestsTotal,
  redirectRequestsTotal,
  linksCreatedTotal,
  httpRequestDurationSeconds,
};
