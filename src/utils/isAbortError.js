/**
 * Detects whether an error is an AbortError from AbortController cancellation.
 * Handles standard DOMException AbortError, Supabase PGRST_ABORTED codes,
 * and generic error messages containing "aborted".
 *
 * @param {Error|Object|null|undefined} err - The error to check
 * @returns {boolean} True if the error represents an abort/cancellation
 */
export function isAbortError(err) {
  return err?.name === 'AbortError' ||
         err?.code === 'PGRST_ABORTED' ||
         (typeof err?.message === 'string' && err.message.includes('aborted'));
}

export default isAbortError;
