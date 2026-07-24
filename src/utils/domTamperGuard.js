/**
 * Guard against THIRD-PARTY DOM tampering crashing React.
 *
 * Browser extensions, machine translators and device simulators (anything
 * that wraps/moves text nodes under React-managed elements) break React's
 * bookkeeping: on the next commit React calls removeChild/insertBefore with
 * a node that is no longer where it left it and the whole tree crashes with
 *   "NotFoundError: Failed to execute 'removeChild' on 'Node'".
 *
 * This is the canonical mitigation from the React issue (#11538): make the
 * two mutations FAIL SOFT — when the child isn't where React expects it,
 * warn and no-op instead of throwing. React recovers on its own; the app
 * (notranslate metas included) never invites this, but it cannot forbid
 * what the user's browser injects.
 */
export default function initDomTamperGuard() {
  if (typeof Node !== "function" || !Node.prototype) return;

  // Diagnostics stay available but QUIET: console.debug renders only with the
  // "Verbose" console level enabled — the guard's job is preventing the
  // crash, not nagging about the environment that caused it.
  const trace = (message, node) => {
    if (typeof console !== "undefined" && console.debug) {
      // eslint-disable-next-line no-console
      console.debug(`domTamperGuard: ${message}`, node);
    }
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChildGuarded(child) {
    if (child.parentNode !== this) {
      trace("skipped removeChild of a node that is no longer here", child);
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBeforeGuarded(
    newNode,
    referenceNode
  ) {
    if (referenceNode && referenceNode.parentNode !== this) {
      trace("skipped insertBefore against a moved reference node", referenceNode);
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}
