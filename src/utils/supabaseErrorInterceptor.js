/**
 * Supabase Error Interceptor
 *
 * Wraps the Supabase client to automatically:
 * 1. Add breadcrumbs for ALL Supabase operations (success and failure)
 * 2. Capture exceptions with structured context on failures
 *
 * Supabase JS client returns { data, error } -- it does NOT throw.
 * So we intercept the response after each query resolves.
 */

import { addBreadcrumb, captureException } from './errorTracking.jsx';

/**
 * Handle a Supabase query result by adding breadcrumbs and capturing errors.
 * @param {{ data: any, error: any }} result - The Supabase query result
 * @param {string} table - Table name or RPC function name
 * @param {string} operation - Operation type (select, insert, update, delete, upsert, rpc)
 */
function handleSupabaseResult(result, table, operation) {
  const { error } = result || {};

  // Always add a breadcrumb (success or failure)
  addBreadcrumb('supabase', `${operation} ${table}`, {
    table,
    operation,
    status: error ? 'error' : 'ok',
    ...(error && { errorCode: error.code, errorMessage: error.message }),
  });

  // On failure, capture a structured exception
  if (error) {
    const supabaseError = new Error(
      `Supabase ${operation} on "${table}" failed: ${error.message}`
    );
    supabaseError.name = 'SupabaseApiError';
    captureException(supabaseError, {
      table,
      operation,
      postgrestCode: error.code,
      httpStatus: error.status || error.statusCode,
      hint: error.hint,
      details: error.details,
      message: error.message,
    });
  }
}

/**
 * Wrap a Supabase query builder with instrumentation.
 * Intercepts .then() to inspect { data, error } before passing through.
 * @param {object} builder - Supabase query builder (thenable)
 * @param {string} table - Table name for context
 * @returns {Proxy} Instrumented query builder
 */
function wrapQueryBuilder(builder, table) {
  let operation = 'unknown';

  const handler = {
    get(target, prop) {
      // Track which operation type this is
      if (['select', 'insert', 'update', 'delete', 'upsert'].includes(prop)) {
        operation = prop;
      }

      const original = Reflect.get(target, prop);
      if (typeof original !== 'function') return original;

      if (prop === 'then') {
        // Intercept the await/then to capture results
        return (onFulfilled, onRejected) => {
          return original.call(
            target,
            (result) => {
              handleSupabaseResult(result, table, operation);
              return onFulfilled ? onFulfilled(result) : result;
            },
            onRejected
          );
        };
      }

      // For chainable methods, return wrapped result
      return (...args) => {
        const result = original.apply(target, args);
        if (result && typeof result === 'object' && typeof result.then === 'function') {
          return wrapQueryBuilder(result, table);
        }
        return result;
      };
    },
  };

  return new Proxy(builder, handler);
}

/**
 * Wrap an RPC result with instrumentation.
 * @param {object} result - Supabase RPC result (thenable)
 * @param {string} fnName - RPC function name
 * @returns {Proxy} Instrumented RPC result
 */
function wrapRpcResult(result, fnName) {
  if (!result || typeof result.then !== 'function') return result;

  const handler = {
    get(target, prop) {
      const original = Reflect.get(target, prop);
      if (typeof original !== 'function') return original;

      if (prop === 'then') {
        return (onFulfilled, onRejected) => {
          return original.call(
            target,
            (res) => {
              handleSupabaseResult(res, fnName, 'rpc');
              return onFulfilled ? onFulfilled(res) : res;
            },
            onRejected
          );
        };
      }

      // Pass through other methods
      return (...args) => original.apply(target, args);
    },
  };

  return new Proxy(result, handler);
}

/**
 * Instrument a Supabase client to automatically capture errors and breadcrumbs.
 * Only proxies .from() and .rpc() -- auth and storage are left untouched.
 * @param {object} client - Supabase client instance
 * @returns {Proxy} Instrumented Supabase client
 */
export function instrumentSupabaseClient(client) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table) => {
          const builder = target.from(table);
          return wrapQueryBuilder(builder, table);
        };
      }
      if (prop === 'rpc') {
        return (fnName, params, options) => {
          const result = target.rpc(fnName, params, options);
          return wrapRpcResult(result, fnName);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Manually capture a Supabase error with additional business context.
 * Use this in services when you want to add extra context beyond
 * what the automatic interceptor captures.
 * @param {object} error - Supabase error object
 * @param {object} context - Additional context to attach
 */
export function captureSupabaseError(error, context = {}) {
  if (!error) return;
  const enriched = new Error(error.message || 'Supabase error');
  enriched.name = 'SupabaseApiError';
  captureException(enriched, {
    postgrestCode: error.code,
    httpStatus: error.status || error.statusCode,
    hint: error.hint,
    details: error.details,
    ...context,
  });
}
