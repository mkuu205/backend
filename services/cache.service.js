const cache = new Map();

const set = (key, value, ttl = 60000) => {
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  });
};

const get = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
};

const del = (key) => {
  cache.delete(key);
};

const clear = () => {
  cache.clear();
};

module.exports = {
  get,
  set,
  del,
  clear
};
