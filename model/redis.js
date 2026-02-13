const { createClient } = require("redis");

const redis = createClient({
  socket: {
    host: "redis-18731.c1.us-central1-2.gce.cloud.redislabs.com",
    port: 18731,
  },
  username: "default",
  password: "E7Rvrs2rYzy6GMvm614Cujkbc9rre60l",
});

redis.on("ready", () => console.log("Redis is Ready"));
redis.on("error", (err) => console.error("[Redis] Error", err.message));

(async () => {
  await redis.connect();
})();

module.exports = redis;
