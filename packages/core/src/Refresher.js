/**
 * Periodically clear the cache and request updates for all clients. Useful
 * if the database is being live-updated and you want to stay up-to-date.
 *
 * @param {Coordinator} coordinator to get clients from
 * @param {int} freq: how often in milliseconds to request updates
 * @returns {int} The interval identifier. Can kill the updating by calling
 *    `clearInterval(intervalId)`.
 */
export function refresh(coordinator, freq) {
  return setInterval(
    () => {
      coordinator.manager.cache().clear();
      coordinator.clients?.forEach(c => {c.requestUpdate();});
    },
    freq
  )
}
